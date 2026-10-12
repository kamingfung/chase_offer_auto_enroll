/**
 * @jest-environment jsdom
 */

const { loadPopup, clickRunAndGetInjectedScript } = require('./helpers');

const $ = id => document.getElementById(id);
const isShown = el => el.style.display !== 'none' && el.style.display !== '';

describe('Popup', () => {
    beforeEach(() => jest.clearAllMocks());

    test('shows Ready when nothing has run yet', () => {
        loadPopup();

        expect($('status').textContent).toBe('Ready');
        expect(isShown($('progressContainer'))).toBe(false);
    });

    test('injects the automation script into the active tab', () => {
        loadPopup();

        clickRunAndGetInjectedScript();

        expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
            target: { tabId: 7 },
            func: expect.any(Function)
        });
    });

    test('Pause and Resume send the matching action to the tab', () => {
        loadPopup();

        $('pauseButton').click();
        $('pauseButton').click();

        expect(chrome.tabs.sendMessage.mock.calls).toEqual([
            [7, { action: 'pause' }],
            [7, { action: 'resume' }]
        ]);
    });

    test('updates and clamps the progress bar from live messages', () => {
        const listener = loadPopup();

        listener({ status: 'script_started' });
        listener({ status: 'offer_clicked', message: 'Added offer 3', current: 3, total: 10 });
        expect(document.querySelector('.progress-text').textContent).toBe('3/10 offers (30%)');

        // Offers loaded mid-run (carousel pages) can push current past the initial count
        listener({ status: 'offer_clicked', message: 'Added offer 12', current: 12, total: 10 });
        expect(document.querySelector('.progress-fill').style.width).toBe('100%');
    });

    describe('reopening the popup mid-run', () => {
        test('shows the progress bar and Pause button with the saved progress', () => {
            loadPopup({
                chaseOfferStatus: { status: 'account_switched', message: 'Switched to account: B' },
                chaseOfferProgress: { current: 4, total: 9 }
            });

            expect($('status').textContent).toBe('Switched to account: B');
            expect(isShown($('progressContainer'))).toBe(true);
            expect(isShown($('pauseButton'))).toBe(true);
            expect(document.querySelector('.progress-text').textContent).toBe('4/9 offers (44%)');
        });

        test('a paused run resumes on the first click instead of pausing again', () => {
            loadPopup({ chaseOfferStatus: { status: 'script_paused' } });

            expect($('pauseButton').textContent).toBe('Resume');
            $('pauseButton').click();

            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { action: 'resume' });
        });
    });

    describe('completion summary', () => {
        const completed = {
            status: 'script_completed',
            stats: {
                totalOffersAdded: 3,
                accountsProcessed: 2,
                timeTaken: '1m 5s',
                breakdown: [
                    { account: 'Sapphire...1234', offers: 2, offerNames: ['Pandora', 'Redken'] },
                    {
                        account: '<img src=x onerror=alert(1)>',
                        offers: 1,
                        offerNames: ['Cole Haan']
                    }
                ]
            }
        };

        test('lists offers added per account and notifies once', () => {
            const listener = loadPopup();

            listener(completed);

            expect($('totalOffers').textContent).toBe('3');
            expect($('totalTime').textContent).toBe('1m 5s');
            expect($('statsBreakdown').textContent).toContain('Pandora, Redken');
            expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
        });

        test('renders account names from the page as text, never as HTML', () => {
            const listener = loadPopup();

            listener(completed);

            expect($('statsBreakdown').querySelector('img')).toBeNull();
            expect($('statsBreakdown').textContent).toContain('<img src=x onerror=alert(1)>');
        });

        test('a completion restored from storage shows the summary without re-notifying', () => {
            loadPopup({ chaseOfferStatus: completed });

            expect(isShown($('statsContainer'))).toBe(true);
            expect(chrome.notifications.create).not.toHaveBeenCalled();
        });
    });
});
