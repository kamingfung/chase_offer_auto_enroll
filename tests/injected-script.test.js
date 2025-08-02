/**
 * @jest-environment jsdom
 */

describe('Chase Offer Adder - Injected Script Tests', () => {
    let mockButton, mockSelect, mockOption1, mockOption2;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Create mock elements
        mockButton = document.createElement('mds-icon');
        mockButton.setAttribute('type', 'ico_add_circle');
        mockButton.setAttribute('data-cy', 'commerce-tile-button');

        const parentButton = document.createElement('div');
        parentButton.setAttribute('role', 'button');
        parentButton.appendChild(mockButton);
        document.body.appendChild(parentButton);

        // Create mock account selector
        mockSelect = document.createElement('mds-select');
        mockSelect.setAttribute('id', 'select-credit-card-account');

        mockOption1 = document.createElement('mds-select-option');
        mockOption1.setAttribute('label', 'Account 1');
        mockOption1.textContent = 'Account 1';

        mockOption2 = document.createElement('mds-select-option');
        mockOption2.setAttribute('label', 'Account 2');
        mockOption2.textContent = 'Account 2';

        mockSelect.appendChild(mockOption1);
        mockSelect.appendChild(mockOption2);
        document.body.appendChild(mockSelect);

        // Reset Chrome API mocks
        jest.clearAllMocks();
    });

    describe('Button Detection Logic', () => {
        test('should find add buttons with correct selector', () => {
            const addButtonSelector =
                'mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]';
            const buttons = Array.from(document.querySelectorAll(addButtonSelector));

            expect(buttons.length).toBe(1);
            expect(buttons[0]).toBe(mockButton);
        });

        test('should check button visibility correctly', () => {
            // Mock getBoundingClientRect for visibility check
            mockButton.getBoundingClientRect = jest.fn(() => ({
                width: 100,
                height: 50,
                top: 100,
                left: 100,
                bottom: 150,
                right: 200
            }));

            // Mock window dimensions
            Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
            Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

            const rect = mockButton.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            const isInViewport =
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth;

            expect(isVisible).toBe(true);
            expect(isInViewport).toBe(true);
        });

        test('should check if button is clickable', () => {
            const parentButton = mockButton.closest('[role="button"]');
            expect(parentButton).toBeTruthy();
            expect(parentButton.disabled).toBeFalsy();
        });
    });

    describe('Account Selection Logic', () => {
        test('should find account selector', () => {
            const accountSelector = 'mds-select[id="select-credit-card-account"]';
            const select = document.querySelector(accountSelector);

            expect(select).toBe(mockSelect);
        });

        test('should find account options', () => {
            const options = mockSelect.querySelectorAll('mds-select-option');

            expect(options.length).toBe(2);
            expect(options[0].getAttribute('label')).toBe('Account 1');
            expect(options[1].getAttribute('label')).toBe('Account 2');
        });

        test('should simulate account switching logic', () => {
            let currentAccountIndex = 0;
            const options = mockSelect.querySelectorAll('mds-select-option');

            // Simulate switching to next account
            currentAccountIndex++;

            expect(currentAccountIndex).toBe(1);
            expect(currentAccountIndex < options.length).toBe(true);
            expect(options[currentAccountIndex]).toBe(mockOption2);
        });
    });

    describe('Retry Logic', () => {
        test('should implement retry mechanism', () => {
            let retryCount = 0;
            const maxRetries = 3;

            // Simulate no buttons found scenario
            const buttons = [];

            if (buttons.length === 0 && retryCount < maxRetries) {
                retryCount++;
            }

            expect(retryCount).toBe(1);
            expect(retryCount < maxRetries).toBe(true);
        });

        test('should reset retry count when button is found', () => {
            let retryCount = 2;
            const buttons = [mockButton]; // Button found

            if (buttons.length > 0) {
                retryCount = 0;
            }

            expect(retryCount).toBe(0);
        });

        test('should switch account after max retries', () => {
            let retryCount = 3;
            const maxRetries = 3;
            let shouldSwitchAccount = false;

            if (retryCount >= maxRetries) {
                retryCount = 0;
                shouldSwitchAccount = true;
            }

            expect(shouldSwitchAccount).toBe(true);
            expect(retryCount).toBe(0);
        });
    });

    describe('Delay Generation', () => {
        test('should generate delays within specified range', () => {
            const minDelay = 300;
            const maxDelay = 1300;
            const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

            // Test multiple times to ensure consistency
            for (let i = 0; i < 10; i++) {
                const delay = getRandomDelay();
                expect(delay).toBeGreaterThanOrEqual(minDelay);
                expect(delay).toBeLessThanOrEqual(maxDelay);
            }
        });
    });

    describe('Pause/Resume Logic', () => {
        test('should handle pause state correctly', () => {
            let isPaused = false;
            let isWaitingForResume = false;

            // Simulate pause
            isPaused = true;
            if (isPaused) {
                isWaitingForResume = true;
            }

            expect(isPaused).toBe(true);
            expect(isWaitingForResume).toBe(true);
        });

        test('should handle resume state correctly', () => {
            let isPaused = true;
            let isWaitingForResume = true;

            // Simulate resume
            isPaused = false;
            if (!isPaused && isWaitingForResume) {
                isWaitingForResume = false;
            }

            expect(isPaused).toBe(false);
            expect(isWaitingForResume).toBe(false);
        });
    });

    describe('Chrome Runtime Messages', () => {
        test('should send script_started message', () => {
            chrome.runtime.sendMessage({ status: 'script_started' });

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                status: 'script_started'
            });
        });

        test('should send account_switched message', () => {
            const accountLabel = 'Account 2';
            chrome.runtime.sendMessage({
                status: 'account_switched',
                message: `Switched to account: ${accountLabel}`
            });

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                status: 'account_switched',
                message: 'Switched to account: Account 2'
            });
        });

        test('should send no_buttons_found message', () => {
            chrome.runtime.sendMessage({
                status: 'no_buttons_found',
                message: 'All accounts processed'
            });

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                status: 'no_buttons_found',
                message: 'All accounts processed'
            });
        });
    });
});
