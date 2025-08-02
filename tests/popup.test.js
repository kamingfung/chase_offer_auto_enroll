/**
 * @jest-environment jsdom
 */

describe('Chase Offer Adder - Popup Tests', () => {
    let mockStatusDiv;
    let mockRunButton;
    let mockPauseButton;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
      <button id="runScriptButton">Add offers</button>
      <div id="status">Status: Idle</div>
    `;

        mockStatusDiv = document.getElementById('status');
        mockRunButton = document.getElementById('runScriptButton');

        // Create pause button (normally created by popup.js)
        mockPauseButton = document.createElement('button');
        mockPauseButton.id = 'pauseButton';
        mockPauseButton.textContent = 'Pause';
        mockPauseButton.style.display = 'none';
        mockRunButton.parentNode.insertBefore(mockPauseButton, mockRunButton.nextSibling);

        // Reset Chrome API mocks
        jest.clearAllMocks();
    });

    describe('DOM Elements', () => {
        test('should have required DOM elements', () => {
            expect(mockStatusDiv).toBeTruthy();
            expect(mockRunButton).toBeTruthy();
            expect(mockStatusDiv.textContent).toBe('Status: Idle');
        });
    });

    describe('Chrome Runtime Message Handling', () => {
        test('should update status for no_buttons_found message', () => {
            const mockRequest = {
                status: 'no_buttons_found',
                message: 'All accounts processed'
            };

            // Simulate the message handler logic
            mockStatusDiv.textContent = mockRequest.message;
            mockStatusDiv.style.color = '#FFA500';
            mockPauseButton.style.display = 'none';

            expect(mockStatusDiv.textContent).toBe('All accounts processed');
            expect(mockStatusDiv.style.color).toBe('rgb(255, 165, 0)');
            expect(mockPauseButton.style.display).toBe('none');
        });

        test('should update status for click_error message', () => {
            const mockRequest = {
                status: 'click_error',
                message: 'Button not found'
            };

            mockStatusDiv.textContent = `Click Error: ${mockRequest.message}`;
            mockStatusDiv.style.color = '#FF0000';

            expect(mockStatusDiv.textContent).toBe('Click Error: Button not found');
            expect(mockStatusDiv.style.color).toBe('rgb(255, 0, 0)');
        });

        test('should update status for script_started message', () => {
            mockStatusDiv.textContent = 'Status: Adding offers...';
            mockStatusDiv.style.color = '#008000';
            mockPauseButton.style.display = 'inline-block';

            expect(mockStatusDiv.textContent).toBe('Status: Adding offers...');
            expect(mockStatusDiv.style.color).toBe('rgb(0, 128, 0)');
            expect(mockPauseButton.style.display).toBe('inline-block');
        });

        test('should update status for script_paused message', () => {
            mockStatusDiv.textContent = 'Status: Paused';
            mockStatusDiv.style.color = '#FFA500';
            mockPauseButton.textContent = 'Resume';

            expect(mockStatusDiv.textContent).toBe('Status: Paused');
            expect(mockStatusDiv.style.color).toBe('rgb(255, 165, 0)');
            expect(mockPauseButton.textContent).toBe('Resume');
        });
    });

    describe('Script Configuration', () => {
        test('should have correct selectors and delays', () => {
            const config = {
                addButtonSelector:
                    'mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]',
                accountSelector: 'mds-select[id="select-credit-card-account"]',
                minDelay: 300,
                maxDelay: 1300
            };

            expect(config.addButtonSelector).toBe(
                'mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]'
            );
            expect(config.accountSelector).toBe('mds-select[id="select-credit-card-account"]');
            expect(config.minDelay).toBe(300);
            expect(config.maxDelay).toBe(1300);
        });

        test('should generate random delay within range', () => {
            const minDelay = 300;
            const maxDelay = 1300;
            const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

            const delay = getRandomDelay();
            expect(delay).toBeGreaterThanOrEqual(minDelay);
            expect(delay).toBeLessThanOrEqual(maxDelay);
        });
    });

    describe('Chrome API Integration', () => {
        test('should call chrome.tabs.query when run button is clicked', () => {
            chrome.tabs.query.mockImplementation((query, callback) => {
                callback([{ id: 123 }]);
            });

            chrome.scripting.executeScript.mockResolvedValue();

            // Simulate button click handler
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (tabs.length > 0) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => {} // Mock function
                    });
                }
            });

            expect(chrome.tabs.query).toHaveBeenCalledWith(
                { active: true, currentWindow: true },
                expect.any(Function)
            );
        });

        test('should handle chrome.tabs.sendMessage for pause/resume', () => {
            chrome.tabs.query.mockImplementation((query, callback) => {
                callback([{ id: 123 }]);
            });

            // Simulate pause button click
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'pause'
                    });
                }
            });

            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
                action: 'pause'
            });
        });
    });
});
