/**
 * @jest-environment jsdom
 */

const {
    loadPopup,
    clickRunAndGetInjectedScript,
    messagesWithStatus,
    makeTile,
    mockVisibleLayout,
    setPageLocation
} = require('./helpers');

// Timings used by the injected script (see popup.js).
const SETTLE_MS = 1000;
const AFTER_CLICK_MS = 1500;
const RETRY_MS = 2000;
const MAX_RETRIES = 5;
const DROPDOWN_MS = 500;
const ACCOUNT_SWITCH_MS = 2500;

/** Load popup.js, click ADD OFFERS, and return the function Chrome would inject. */
function getInjectedScript() {
    loadPopup();
    const func = clickRunAndGetInjectedScript();
    // Reset the page DOM: the popup markup is not part of the Chase page.
    document.body.innerHTML = '';
    chrome.runtime.sendMessage.mockClear();
    return func;
}

/** Return the pause/resume listener the injected script registered on the page. */
function getPageListener() {
    return chrome.runtime.onMessage.addListener.mock.calls.at(-1)[0];
}

async function exhaustRetries() {
    for (let i = 0; i < MAX_RETRIES + 1; i++) {
        await jest.advanceTimersByTimeAsync(RETRY_MS);
    }
}

describe('Chase Offer Adder - Injected Script', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        setPageLocation();
        mockVisibleLayout();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('guards', () => {
        test('refuses to run on a non-Chase host', () => {
            const run = getInjectedScript();
            setPageLocation('evil.example', '');

            run();

            expect(messagesWithStatus('script_started')).toHaveLength(0);
            expect(messagesWithStatus('click_error')[0].message).toMatch(/not a Chase page/);
            expect(window.__chaseOfferAdderRunning).toBeFalsy();
        });

        test('accepts chase.com and its subdomains', () => {
            const run = getInjectedScript();
            setPageLocation('secure01b.chase.com');

            run();

            expect(messagesWithStatus('script_started')).toHaveLength(1);
            expect(window.__chaseOfferAdderRunning).toBe(true);
        });

        test('a second injection while running reports already_running', () => {
            const run = getInjectedScript();

            run();
            run();

            expect(messagesWithStatus('script_started')).toHaveLength(1);
            expect(messagesWithStatus('already_running')).toHaveLength(1);
            // Only one pause/resume listener should have been registered on the page.
            expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(2); // popup + one page copy
        });
    });

    describe('adding offers', () => {
        test('clicks each unadded offer once, skips added ones, and reports completion', async () => {
            const run = getInjectedScript();
            document.body.append(
                makeTile('offer-1'),
                makeTile('offer-2', { added: true }),
                makeTile('offer-3')
            );
            const clicks = jest.fn();
            document.querySelectorAll('button').forEach(b => b.addEventListener('click', clicks));

            run();
            await jest.advanceTimersByTimeAsync(SETTLE_MS);

            expect(messagesWithStatus('buttons_counted')[0]).toMatchObject({ total: 2 });

            await jest.advanceTimersByTimeAsync(AFTER_CLICK_MS);
            await jest.advanceTimersByTimeAsync(AFTER_CLICK_MS);

            const clicked = messagesWithStatus('offer_clicked');
            expect(clicked).toHaveLength(2);
            expect(clicked[1]).toMatchObject({ current: 2, total: 2 });
            expect(clicks).toHaveBeenCalledTimes(2);

            // No account selector on the page, so after retries the run completes.
            await exhaustRetries();

            const done = messagesWithStatus('script_completed');
            expect(done).toHaveLength(1);
            expect(done[0].stats).toMatchObject({
                totalOffersAdded: 2,
                accountsProcessed: 1,
                breakdown: [{ account: 'Account 1', offers: 2 }]
            });
            expect(typeof done[0].stats.durationMs).toBe('number');
            expect(done[0].stats.durationMs).toBeGreaterThan(0);
            expect(window.__chaseOfferAdderRunning).toBe(false);
            expect(clicks).toHaveBeenCalledTimes(2);
        });

        test('navigates back when a click lands on the offer detail page', async () => {
            const run = getInjectedScript();
            document.body.append(makeTile('offer-1'));
            document.querySelector('button').addEventListener('click', () => {
                window.location.hash = '#/dashboard/merchantOffers/offer-activated';
            });
            const back = jest.spyOn(window.history, 'back').mockImplementation(() => {
                window.location.hash = '#/dashboard/merchantOffers/offer-hub';
            });

            run();
            await jest.advanceTimersByTimeAsync(SETTLE_MS + AFTER_CLICK_MS);

            expect(back).toHaveBeenCalledTimes(1);
            expect(messagesWithStatus('offer_clicked')).toHaveLength(1);
        });

        test('resets the retry counter while the page shows a loading state', async () => {
            const run = getInjectedScript();
            const skeleton = document.createElement('div');
            skeleton.setAttribute('data-testid', 'offers-skeleton');
            document.body.append(skeleton);

            run();
            await jest.advanceTimersByTimeAsync(SETTLE_MS);
            await exhaustRetries();

            // Still loading, so it must not have given up.
            expect(messagesWithStatus('script_completed')).toHaveLength(0);

            skeleton.remove();
            await exhaustRetries();
            expect(messagesWithStatus('script_completed')).toHaveLength(1);
        });
    });

    describe('pause and resume', () => {
        test('stops clicking while paused and continues on resume', async () => {
            const run = getInjectedScript();
            document.body.append(makeTile('offer-1'), makeTile('offer-2'));

            run();
            await jest.advanceTimersByTimeAsync(SETTLE_MS);
            expect(messagesWithStatus('offer_clicked')).toHaveLength(1);

            const pageListener = getPageListener();
            pageListener({ action: 'pause' });
            expect(messagesWithStatus('script_paused')).toHaveLength(1);

            await jest.advanceTimersByTimeAsync(AFTER_CLICK_MS * 3);
            expect(messagesWithStatus('offer_clicked')).toHaveLength(1);

            pageListener({ action: 'resume' });
            expect(messagesWithStatus('script_resumed')).toHaveLength(1);
            await jest.advanceTimersByTimeAsync(AFTER_CLICK_MS);
            expect(messagesWithStatus('offer_clicked')).toHaveLength(2);
        });
    });

    describe('account switching', () => {
        function buildAccountSelector(options) {
            const combobox = document.createElement('div');
            combobox.id = 'select-credit-card-account';
            const menu = document.createElement('ul');
            menu.id = 'menu';
            menu.setAttribute('role', 'listbox');
            options.forEach((opt, i) => {
                const li = document.createElement('li');
                li.setAttribute('role', 'option');
                li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
                if (opt.id) li.id = opt.id;
                const name = document.createElement('span');
                name.className = 'iappo6m-name';
                name.textContent = opt.label;
                li.appendChild(name);
                if (opt.onSelect) li.addEventListener('click', opt.onSelect);
                menu.appendChild(li);
            });
            document.body.append(combobox, menu);
        }

        test('moves to the next account and aggregates per-account stats', async () => {
            const run = getInjectedScript();
            document.body.append(makeTile('a1-offer'));
            buildAccountSelector([
                { label: 'Freedom', id: 'menu-item-900000001' },
                {
                    label: 'Sapphire',
                    id: 'menu-item-900000002',
                    onSelect: () =>
                        document.body.append(makeTile('a2-offer-1'), makeTile('a2-offer-2'))
                }
            ]);

            run();
            await jest.advanceTimersByTimeAsync(SETTLE_MS + AFTER_CLICK_MS);
            await exhaustRetries();

            expect(messagesWithStatus('switching_account')).toHaveLength(1);
            await jest.advanceTimersByTimeAsync(DROPDOWN_MS + ACCOUNT_SWITCH_MS);
            expect(messagesWithStatus('account_switched')[0].message).toMatch(/Sapphire.*2 offers/);

            await jest.advanceTimersByTimeAsync(AFTER_CLICK_MS * 2);
            await exhaustRetries();
            // Second switch attempt finds no further account and completes.
            await jest.advanceTimersByTimeAsync(DROPDOWN_MS);

            const done = messagesWithStatus('script_completed');
            expect(done).toHaveLength(1);
            expect(done[0].stats).toMatchObject({
                totalOffersAdded: 3,
                accountsProcessed: 2,
                breakdown: [
                    { account: 'Account 1', offers: 1 },
                    { account: 'Sapphire', offers: 2 }
                ]
            });
        });

        test('recovers from the overview redirect using only the option id, not its text', async () => {
            const run = getInjectedScript();
            document.body.append(makeTile('a1-offer'));
            buildAccountSelector([
                { label: 'Freedom', id: 'menu-item-900000001' },
                {
                    // Text contains a long number that must NOT be treated as the account id.
                    label: 'Sapphire ref 123456789012',
                    id: 'menu-item-900000002',
                    onSelect: () => {
                        window.location.hash = '#/dashboard/overview';
                    }
                }
            ]);

            run();
            await jest.advanceTimersByTimeAsync(SETTLE_MS + AFTER_CLICK_MS);
            await exhaustRetries();
            await jest.advanceTimersByTimeAsync(DROPDOWN_MS + 200);

            expect(window.location.hash).toBe(
                '/dashboard/merchantOffers/offer-hub?accountId=900000002'
            );
        });

        test('falls back to the plain offer hub when the option carries no id attribute', async () => {
            const run = getInjectedScript();
            document.body.append(makeTile('a1-offer'));
            buildAccountSelector([
                { label: 'Freedom' },
                {
                    label: 'Sapphire ref 123456789012',
                    onSelect: () => {
                        window.location.hash = '#/dashboard/overview';
                    }
                }
            ]);

            run();
            await jest.advanceTimersByTimeAsync(SETTLE_MS + AFTER_CLICK_MS);
            await exhaustRetries();
            await jest.advanceTimersByTimeAsync(DROPDOWN_MS + 200);

            expect(window.location.hash).toBe('/dashboard/merchantOffers/offer-hub');
        });
    });
});
