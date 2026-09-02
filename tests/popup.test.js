/**
 * @jest-environment jsdom
 */

const { loadPopup, clickRunAndGetInjectedScript, setPageLocation } = require('./helpers');

describe('Chase Offer Adder - Popup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setPageLocation();
    });

    describe('initial render', () => {
        test('shows Ready status and wires up the real DOM', () => {
            loadPopup();
            const status = document.getElementById('status');
            expect(status.textContent).toBe('Ready');
            expect(status.className).toBe('status-idle');
            expect(document.getElementById('pauseButton').style.display).toBe('none');
        });
    });

    describe('script injection', () => {
        test('injects into the active tab when it is a Chase page', () => {
            loadPopup({ tabUrl: 'https://secure.chase.com/web/auth/dashboard#/x', tabId: 42 });
            const func = clickRunAndGetInjectedScript();

            expect(chrome.tabs.query).toHaveBeenCalledWith(
                { active: true, currentWindow: true },
                expect.any(Function)
            );
            expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(1);
            expect(chrome.scripting.executeScript.mock.calls[0][0].target).toEqual({ tabId: 42 });
            expect(typeof func).toBe('function');
            expect(document.getElementById('status').textContent).toBe('Running...');
        });

        test.each([
            'https://evil.example/chase.com',
            'http://secure.chase.com/plain-http',
            'https://secure.chase.com.evil.example/',
            'chrome://extensions',
            undefined
        ])('refuses to inject into %s', tabUrl => {
            loadPopup({ tabUrl });
            const func = clickRunAndGetInjectedScript();

            expect(func).toBeNull();
            expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
            const status = document.getElementById('status');
            expect(status.className).toBe('status-warning');
            expect(status.textContent).toMatch(/Chase/);
        });

        test('reports an injection failure', async () => {
            loadPopup();
            chrome.scripting.executeScript.mockRejectedValue(new Error('denied'));
            document.getElementById('runScriptButton').click();
            // Let the executeScript promise reject and the .catch handler run.
            await new Promise(resolve => setTimeout(resolve, 0));

            const status = document.getElementById('status');
            expect(status.textContent).toBe('Injection Error: denied');
            expect(status.className).toBe('status-error');
        });
    });

    describe('messages from the injected script', () => {
        test('script_started shows progress and pause controls', () => {
            const { popupListener } = loadPopup();
            popupListener({ status: 'script_started' });

            expect(document.getElementById('status').textContent).toBe('Adding offers...');
            expect(document.getElementById('pauseButton').style.display).toBe('inline-block');
            expect(document.getElementById('progressContainer').style.display).toBe('block');
        });

        test('offer_clicked updates the progress bar', () => {
            const { popupListener } = loadPopup();
            popupListener({ status: 'buttons_counted', message: 'Found 4', total: 4 });
            popupListener({ status: 'offer_clicked', message: 'Added 1', current: 1, total: 4 });

            expect(document.querySelector('.progress-fill').style.width).toBe('25%');
            expect(document.querySelector('.progress-text').textContent).toBe('1/4 offers (25%)');
        });

        test('pause and resume toggle the button label', () => {
            const { popupListener } = loadPopup();
            popupListener({ status: 'script_paused' });
            expect(document.getElementById('pauseButton').textContent).toBe('Resume');
            expect(document.getElementById('status').className).toBe('status-paused');

            popupListener({ status: 'script_resumed' });
            expect(document.getElementById('pauseButton').textContent).toBe('Pause');
        });

        test('already_running warns instead of restarting', () => {
            const { popupListener } = loadPopup();
            popupListener({ status: 'already_running' });
            const status = document.getElementById('status');
            expect(status.className).toBe('status-warning');
            expect(status.textContent).toMatch(/already running/);
        });

        test('click_error and no_buttons_found update status', () => {
            const { popupListener } = loadPopup();
            popupListener({ status: 'click_error', message: 'boom' });
            expect(document.getElementById('status').textContent).toBe('Error: boom');
            expect(document.getElementById('status').className).toBe('status-error');

            popupListener({ status: 'no_buttons_found', message: 'Nothing here' });
            expect(document.getElementById('status').textContent).toBe('Nothing here');
            expect(document.getElementById('pauseButton').style.display).toBe('none');
        });
    });

    describe('completion summary', () => {
        test('renders account names from the page as text, never as HTML', () => {
            const { popupListener } = loadPopup();
            const hostile = '<img src=x onerror="alert(1)"><b>Sapphire</b>';

            popupListener({
                status: 'script_completed',
                stats: {
                    totalOffersAdded: 3,
                    accountsProcessed: 1,
                    breakdown: [{ account: hostile, offers: 3 }],
                    durationMs: 5000
                }
            });

            const breakdown = document.getElementById('statsBreakdown');
            expect(breakdown.querySelector('img')).toBeNull();
            expect(breakdown.querySelector('b')).toBeNull();
            expect(breakdown.querySelector('.breakdown-account').textContent).toBe(hostile);
            expect(breakdown.querySelector('.breakdown-count').textContent).toBe('3 offers');
            expect(document.getElementById('totalOffers').textContent).toBe('3');
        });

        test('uses the duration measured by the injected script', () => {
            const { popupListener } = loadPopup();
            popupListener({
                status: 'script_completed',
                stats: {
                    totalOffersAdded: 1,
                    accountsProcessed: 1,
                    breakdown: [],
                    durationMs: 125000
                }
            });

            expect(document.getElementById('totalTime').textContent).toBe('2m 5s');
            expect(chrome.notifications.create).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining('2m 5s') })
            );
        });

        test('falls back to the popup timer, and to n/a when neither is known', () => {
            const { popupListener } = loadPopup();
            const now = jest.spyOn(Date, 'now');

            // Popup was reopened mid-run: no script_started seen, no durationMs sent.
            popupListener({
                status: 'script_completed',
                stats: { totalOffersAdded: 1, accountsProcessed: 1, breakdown: [] }
            });
            expect(document.getElementById('totalTime').textContent).toBe('n/a');

            now.mockReturnValueOnce(1000).mockReturnValueOnce(31000);
            popupListener({ status: 'script_started' });
            popupListener({
                status: 'script_completed',
                stats: { totalOffersAdded: 1, accountsProcessed: 1, breakdown: [] }
            });
            expect(document.getElementById('totalTime').textContent).toBe('30s');
            now.mockRestore();
        });

        test('clears a previous breakdown before rendering a new one', () => {
            const { popupListener } = loadPopup();
            const completed = breakdown => ({
                status: 'script_completed',
                stats: { totalOffersAdded: 1, accountsProcessed: 1, breakdown, durationMs: 1 }
            });

            popupListener(
                completed([
                    { account: 'A', offers: 1 },
                    { account: 'B', offers: 2 }
                ])
            );
            popupListener(completed([{ account: 'C', offers: 1 }]));

            const items = document.querySelectorAll('.breakdown-item');
            expect(items).toHaveLength(1);
            expect(items[0].textContent).toContain('C');
        });
    });

    describe('pause button', () => {
        test('sends pause then resume to the active tab', () => {
            loadPopup({ tabId: 9 });
            const pauseButton = document.getElementById('pauseButton');

            pauseButton.click();
            expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(9, { action: 'pause' });

            pauseButton.click();
            expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(9, { action: 'resume' });
        });
    });
});
