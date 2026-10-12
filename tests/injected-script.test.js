/**
 * @jest-environment jsdom
 */

const {
    setPageLocation,
    loadPopup,
    clickRunAndGetInjectedScript,
    sentMessages
} = require('./helpers');

/**
 * A fake Chase Offers page shaped like the October 2026 markup: a "Recommended offers"
 * carousel that shows a page at a time, an offer grid, and an account picker. Clicking
 * an offer marks it added, like the real page. Records every offer click in `clicks`.
 * `redirectOnSwitch` mimics Chase bouncing to the dashboard overview after a switch.
 * Each account may carry `optionAttributes` to put on its picker option (e.g. an id).
 */
function buildChasePage({ accounts, picker = 'sheet', redirectOnSwitch = false }) {
    const clicks = [];
    const added = new Set(accounts.flatMap(a => a.grid.filter(o => o.added).map(o => o.name)));
    let accountIndex = 0;
    let carouselPage = 0;

    const pickerEl = document.createElement(picker === 'sheet' ? 'button' : 'div');
    pickerEl.setAttribute(
        'data-testid',
        picker === 'sheet' ? 'account-selector-trigger' : 'select-credit-card-account'
    );
    const offersArea = document.createElement('main');
    document.body.append(pickerEl, offersArea);

    const markAdded = (name, el) =>
        el.addEventListener('click', () => {
            clicks.push(name);
            added.add(name);
            render();
        });

    function render() {
        const account = accounts[accountIndex];
        pickerEl.textContent = account.name;
        offersArea.innerHTML = '';

        const pages = account.recommendedPages || [];
        if (pages.length) {
            const row = document.createElement('div');
            row.setAttribute('data-testid', 'carousel-featured-category-offer-tile-list-container');
            for (const name of pages[carouselPage]) {
                const tile = document.createElement('a');
                tile.setAttribute('role', 'button');
                tile.setAttribute('data-cy', 'offer');
                tile.id = `offer-${name}`;
                tile.innerHTML = `<span class="offerMerchantName">${name}</span>${
                    added.has(name) ? '' : '<div data-testid="offer-accent-add"><svg></svg></div>'
                }`;
                markAdded(name, tile);
                row.append(tile);
            }
            const next = document.createElement('button');
            next.setAttribute('data-testid', 'carouselRightChevron');
            next.disabled = carouselPage === pages.length - 1;
            next.addEventListener('click', () => {
                carouselPage++;
                render();
            });
            offersArea.append(row, next);
        }

        for (const { name } of account.grid) {
            const tile = document.createElement('a');
            tile.setAttribute('role', 'button');
            tile.setAttribute('data-cy', 'commerce-tile');
            tile.id = `FIGG:${name}`;
            const icon = added.has(name) ? 'commerce-tile-icon' : 'commerce-tile-button';
            tile.innerHTML = `<span class="titleTagVariant2Container">${name}</span><svg data-cy="${icon}"></svg>`;
            markAdded(name, tile);
            offersArea.append(tile);
        }
    }

    function selectAccount(i) {
        accountIndex = i;
        carouselPage = 0;
        document.getElementById('accountSelectorSheet')?.remove();
        document.getElementById('menu')?.remove();
        render();
        if (redirectOnSwitch) window.location.hash = '#/dashboard/overview';
    }

    pickerEl.addEventListener('click', () => {
        const open =
            document.getElementById('accountSelectorSheet') || document.getElementById('menu');
        if (open) return open.remove();

        const list = document.createElement('ul');
        if (picker === 'sheet') {
            const sheet = document.createElement('div');
            sheet.id = 'accountSelectorSheet';
            sheet.append(list);
            document.body.append(sheet);
        } else {
            list.id = 'menu';
            list.setAttribute('role', 'listbox');
            document.body.append(list);
        }
        accounts.forEach((account, i) => {
            const item = document.createElement('li');
            if (picker === 'sheet') {
                item.className = 'accountSelectorListItem';
                item.innerHTML = `<span class="accountSelectorListLabel">${account.name}</span>`;
            } else {
                item.setAttribute('role', 'option');
                item.textContent = account.name;
            }
            for (const [name, value] of Object.entries(account.optionAttributes || {})) {
                item.setAttribute(name, value);
            }
            item.addEventListener('click', () => selectAccount(i));
            list.append(item);
        });
    });

    render();
    return { clicks, render };
}

const twoCards = [
    {
        name: 'Sapphire...1234',
        recommendedPages: [['Pandora', 'Warby Parker'], ['Redken']],
        grid: [{ name: 'Pureology', added: true }, { name: 'Cole Haan' }]
    },
    {
        name: 'Freedom...5678',
        grid: [{ name: 'Blueland' }, { name: 'Logitech', added: true }]
    }
];

/**
 * Load the popup, build the fake Chase page (after the popup, which resets the body),
 * click ADD OFFERS, and run the injected script on the page.
 */
function startRun(pageOptions) {
    loadPopup();
    const page = buildChasePage(pageOptions);
    clickRunAndGetInjectedScript()();
    // The injected script registers its own pause/resume listener after the popup's
    const scriptListener = chrome.runtime.onMessage.addListener.mock.calls.at(-1)[0];
    return { page, scriptListener };
}

describe('Injected automation script', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        // jsdom has no layout: report every element as visible and on screen
        jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
            width: 40,
            height: 40,
            top: 10,
            left: 10,
            bottom: 50,
            right: 50
        });
        Element.prototype.scrollIntoView = jest.fn();
        window.scrollTo = jest.fn();
        setPageLocation();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('adds every un-added offer on every card, then reports a summary', async () => {
        const { page } = startRun({ accounts: twoCards });
        await jest.advanceTimersByTimeAsync(120000);

        // Recommended row (both carousel pages) and the grid; already-added offers untouched
        expect(page.clicks).toEqual(['Pandora', 'Warby Parker', 'Cole Haan', 'Redken', 'Blueland']);

        const [completed] = sentMessages('script_completed');
        expect(completed.stats.totalOffersAdded).toBe(5);
        expect(completed.stats.breakdown).toEqual([
            {
                account: 'Sapphire...1234',
                offers: 4,
                offerNames: ['Pandora', 'Warby Parker', 'Cole Haan', 'Redken']
            },
            { account: 'Freedom...5678', offers: 1, offerNames: ['Blueland'] }
        ]);
    });

    test('still switches cards with the pre-October combobox picker', async () => {
        const { page } = startRun({ accounts: twoCards, picker: 'combobox' });
        await jest.advanceTimersByTimeAsync(120000);

        expect(page.clicks).toContain('Blueland');
        expect(sentMessages('account_switched')[0].message).toContain('Freedom...5678');
    });

    test('saves progress to storage so a reopened popup can restore it', async () => {
        startRun({ accounts: twoCards });
        await jest.advanceTimersByTimeAsync(3000);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({ chaseOfferProgress: { current: 1, total: 3 } })
        );
    });

    test('Pause stops clicking until Resume', async () => {
        const { page, scriptListener } = startRun({ accounts: twoCards });
        await jest.advanceTimersByTimeAsync(1200); // first offer clicked
        scriptListener({ action: 'pause' });
        await jest.advanceTimersByTimeAsync(30000);
        expect(page.clicks).toEqual(['Pandora']);

        scriptListener({ action: 'resume' });
        await jest.advanceTimersByTimeAsync(120000);
        expect(page.clicks).toHaveLength(5);
    });

    test('pausing during startup does not start a second, duplicate run', async () => {
        const { page, scriptListener } = startRun({ accounts: twoCards });
        scriptListener({ action: 'pause' }); // before the 1s startup delay ends
        await jest.advanceTimersByTimeAsync(5000);
        scriptListener({ action: 'resume' });
        await jest.advanceTimersByTimeAsync(120000);

        expect(page.clicks).toEqual(['Pandora', 'Warby Parker', 'Cole Haan', 'Redken', 'Blueland']);
        // A second loop would run its own retries and announce an extra account switch
        expect(sentMessages('switching_account')).toHaveLength(2);
    });

    describe('guards', () => {
        test('refuses to run on a non-Chase page', async () => {
            setPageLocation('chase.com.evil.example');
            const { page } = startRun({ accounts: twoCards });
            await jest.advanceTimersByTimeAsync(10000);

            expect(page.clicks).toEqual([]);
            expect(sentMessages('click_error')[0].message).toBe('This page is not a Chase page.');
            expect(chrome.storage.local.set).not.toHaveBeenCalled();
        });

        test('a second ADD OFFERS click while running adds nothing extra', async () => {
            const { page } = startRun({ accounts: twoCards });
            await jest.advanceTimersByTimeAsync(1200);

            clickRunAndGetInjectedScript()();
            await jest.advanceTimersByTimeAsync(120000);

            expect(sentMessages('already_running')).toHaveLength(1);
            expect(page.clicks).toEqual([
                'Pandora',
                'Warby Parker',
                'Cole Haan',
                'Redken',
                'Blueland'
            ]);
            expect(sentMessages('script_completed')).toHaveLength(1);
        });

        test('can run again after a run completes', async () => {
            startRun({ accounts: twoCards });
            await jest.advanceTimersByTimeAsync(120000);

            clickRunAndGetInjectedScript()();
            await jest.advanceTimersByTimeAsync(60000);

            expect(sentMessages('already_running')).toHaveLength(0);
            expect(sentMessages('script_started')).toHaveLength(2);
        });
    });

    describe('page navigation', () => {
        test('goes back when a click landed on an offer detail page', async () => {
            setPageLocation('secure.chase.com', '#/dashboard/merchantOffers/offer-hub/detail');
            jest.spyOn(window.history, 'back').mockImplementation(() => {
                window.location.hash = '#/dashboard/merchantOffers/offer-hub';
            });

            const { page } = startRun({ accounts: twoCards });
            await jest.advanceTimersByTimeAsync(120000);

            expect(window.history.back).toHaveBeenCalledTimes(1);
            expect(page.clicks).toHaveLength(5);
        });

        test('keeps waiting while the page is loading instead of moving to the next card', async () => {
            const accounts = [
                { name: 'Sapphire...1234', grid: [] },
                { name: 'Freedom...5678', grid: [{ name: 'Blueland' }] }
            ];
            const { page } = startRun({ accounts });
            const skeleton = document.createElement('div');
            skeleton.setAttribute('data-testid', 'skeleton');
            document.body.append(skeleton);

            // Five retries would normally give up after ~10s
            await jest.advanceTimersByTimeAsync(30000);
            expect(sentMessages('switching_account')).toHaveLength(0);

            accounts[0].grid.push({ name: 'Cole Haan' });
            skeleton.remove();
            page.render();
            await jest.advanceTimersByTimeAsync(120000);

            expect(page.clicks).toEqual(['Cole Haan', 'Blueland']);
        });

        test.each([
            [
                'the option id attribute',
                'combobox',
                { 'data-account-id': '987654321' },
                '/dashboard/merchantOffers/offer-hub?accountId=987654321'
            ],
            [
                'the plain offer hub when the option has no id',
                'sheet',
                {},
                '/dashboard/merchantOffers/offer-hub'
            ]
        ])(
            'recovers from the overview redirect using %s, never digits in its text',
            async (_label, picker, optionAttributes, expectedHash) => {
                const accounts = [
                    { name: 'Sapphire 4111222233', grid: [] },
                    {
                        name: 'Freedom 5500111122',
                        grid: [{ name: 'Blueland' }],
                        optionAttributes
                    }
                ];
                const { page } = startRun({ accounts, picker, redirectOnSwitch: true });
                await jest.advanceTimersByTimeAsync(120000);

                expect(window.location.hash).toBe(expectedHash);
                expect(page.clicks).toEqual(['Blueland']);
            }
        );
    });
});
