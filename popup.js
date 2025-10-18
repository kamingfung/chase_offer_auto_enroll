const runButton = document.getElementById('runScriptButton');
const statusDiv = document.getElementById('status'); // Get reference to the status display area

// Add pause button
const pauseButton = document.createElement('button');
pauseButton.id = 'pauseButton';
pauseButton.textContent = 'Pause';
pauseButton.style.marginLeft = '10px';
pauseButton.style.display = 'none'; // Initially hidden
runButton.parentNode.insertBefore(pauseButton, runButton.nextSibling);

let isPaused = false;

// --- Listener for Messages from Injected Script ---
// This listens for messages sent FROM the script running on the Chase page
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    console.log('Popup received message:', request); // Log received messages

    // Check the status included in the message
    if (request.status === 'no_buttons_found') {
        statusDiv.textContent = request.message;
        statusDiv.style.color = '#FFA500'; // Orange color for no buttons found
        // Hide pause button when script is done
        pauseButton.style.display = 'none';
    } else if (request.status === 'click_error') {
        statusDiv.textContent = `Click Error: ${request.message}`;
        statusDiv.style.color = '#FF0000'; // Red color for errors
    } else if (request.status === 'script_started') {
        statusDiv.textContent = 'Status: Adding offers...';
        statusDiv.style.color = '#008000'; // Green color for active status
        // Show pause button when script starts
        pauseButton.style.display = 'inline-block';
    } else if (request.status === 'script_paused') {
        statusDiv.textContent = 'Status: Paused';
        statusDiv.style.color = '#FFA500';
        pauseButton.textContent = 'Resume';
    } else if (request.status === 'script_resumed') {
        statusDiv.textContent = 'Status: Adding offers...';
        statusDiv.style.color = '#008000';
        pauseButton.textContent = 'Pause';
    } else if (request.status === 'tab_switched') {
        statusDiv.textContent = `Status: ${request.message}`;
        statusDiv.style.color = '#0000FF'; // Blue color for tab switching
    } else if (request.status === 'account_switched') {
        statusDiv.textContent = `Status: ${request.message}`;
        statusDiv.style.color = '#800080'; // Purple color for account switching
    }
    // Add more conditions here if the injected script sends other statuses

    // Return false as we aren't sending an asynchronous response from the listener
    return false;
});

// Pause button click handler
pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;

    // Send message to content script to pause/resume
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: isPaused ? 'pause' : 'resume'
            });
        }
    });
});

// --- Button Click Handler ---
runButton.addEventListener('click', () => {
    statusDiv.textContent = 'Status: Injecting...';
    statusDiv.style.color = '#0000FF'; // Blue color for injection status
    isPaused = false; // Reset pause state
    pauseButton.textContent = 'Pause';

    // --- Injected Script Definition ---
    // This function gets sent to the Chase page to run
    const scriptToExecute = () => {
        // Let the popup know the script has started executing on the page
        chrome.runtime.sendMessage({ status: 'script_started' });

        console.log('Executing Chase Offer Script...');

        // --- Configuration & Helpers ---
        const addButtonSelector = 'mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]';
        const checkmarkSelector = 'mds-icon[type="ico_checkmark_filled"]';
        const accountSelector = 'mds-select[id="select-credit-card-account"]';
        // Tab selectors for "New" and "All offers" sections
        const tabSelectors = [
            'button[data-cy*="new"]',
            'button[data-cy*="all"]',
            '[role="tab"][aria-label*="New"]',
            '[role="tab"][aria-label*="All"]',
            'a[href*="new"]',
            'a[href*="all"]'
        ];
        const minDelay = 300;
        const maxDelay = 1300;
        const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

        // --- Core Functions ---
        let currentAccountIndex = 0;
        let currentTabIndex = 0;
        let isPaused = false;
        let isWaitingForResume = false;
        let allTabs = [];

        // Listen for pause/resume messages from popup
        chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
            if (request.action === 'pause') {
                isPaused = true;
                chrome.runtime.sendMessage({ status: 'script_paused' });
            } else if (request.action === 'resume') {
                isPaused = false;
                chrome.runtime.sendMessage({ status: 'script_resumed' });
                if (isWaitingForResume) {
                    isWaitingForResume = false;
                    addNextItem(); // Continue from where we left off
                }
            }
            return false;
        });

        async function waitForResume() {
            if (isPaused) {
                isWaitingForResume = true;
                return new Promise(resolve => {
                    const checkPause = setInterval(() => {
                        if (!isPaused) {
                            clearInterval(checkPause);
                            resolve();
                        }
                    }, 100);
                });
            }
        }

        function discoverTabs() {
            // Try to find tabs on the page using various selectors
            const discoveredTabs = [];

            for (const selector of tabSelectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const text = el.textContent.toLowerCase();
                    // Look for "New" or "All" tabs
                    if (
                        (text.includes('new') || text.includes('all')) &&
                        !discoveredTabs.includes(el)
                    ) {
                        discoveredTabs.push(el);
                        console.log('Found tab:', el.textContent, 'selector:', selector);
                    }
                });
            }

            return discoveredTabs;
        }

        function switchToNextTab() {
            if (isPaused) {
                isWaitingForResume = true;
                return false;
            }

            // If we haven't discovered tabs yet, do it now
            if (allTabs.length === 0) {
                allTabs = discoverTabs();
                console.log('Discovered', allTabs.length, 'tabs');
            }

            // If no tabs found or already processed all tabs
            if (allTabs.length === 0 || currentTabIndex >= allTabs.length) {
                console.log('No more tabs to process');
                return false;
            }

            currentTabIndex++;

            // If we've gone through all tabs, return false
            if (currentTabIndex >= allTabs.length) {
                console.log('All tabs processed');
                return false;
            }

            const tab = allTabs[currentTabIndex];
            console.log('Switching to tab:', tab.textContent);

            // Click the tab
            tab.click();

            chrome.runtime.sendMessage({
                status: 'tab_switched',
                message: `Switched to tab: ${tab.textContent}`
            });

            // Wait for tab content to load before continuing
            setTimeout(() => {
                if (!isPaused) {
                    addNextItem();
                } else {
                    isWaitingForResume = true;
                }
            }, 1500);

            return true;
        }

        function switchToNextAccount() {
            if (isPaused) {
                isWaitingForResume = true;
                return false;
            }

            const select = document.querySelector(accountSelector);
            if (!select) return false;

            const options = select.querySelectorAll('mds-select-option');
            currentAccountIndex++;

            if (currentAccountIndex >= options.length) {
                chrome.runtime.sendMessage({
                    status: 'script_completed',
                    message: 'All accounts processed'
                });
                return false;
            }

            // Click the select to open dropdown
            select.click();

            // Wait for dropdown to open and select next account
            setTimeout(async () => {
                if (isPaused) {
                    await waitForResume();
                }

                const option = options[currentAccountIndex];
                if (option) {
                    option.click();
                    chrome.runtime.sendMessage({
                        status: 'account_switched',
                        message: `Switched to account: ${option.getAttribute('label')}`
                    });

                    // Wait for account switch to complete before continuing
                    setTimeout(() => {
                        if (!isPaused) {
                            addNextItem();
                        } else {
                            isWaitingForResume = true;
                        }
                    }, 2000);
                }
            }, 500);

            return true;
        }

        const goBack = async () => {
            if (isPaused) {
                await waitForResume();
            }

            console.log('Executing: goBack() - Navigating history back.');
            window.history.back();
            setTimeout(() => {
                if (!isPaused) {
                    addNextItem();
                } else {
                    isWaitingForResume = true;
                }
            }, getRandomDelay());
        };

        let retryCount = 0;
        const maxRetries = 3;

        const addNextItem = async () => {
            if (isPaused) {
                await waitForResume();
            }

            console.log('Executing: addNextItem() - Looking for buttons in all sections');

            // Find all add buttons across both carousel and grid sections
            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            console.log('Found', addButtons.length, 'add buttons total across all sections');

            const buttonToClick = addButtons.reverse().find(button => {
                const rect = button.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const isInViewport =
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth;

                const parentButton = button.closest('[role="button"]');
                const isClickable =
                    parentButton &&
                    !parentButton.disabled &&
                    window.getComputedStyle(parentButton).display !== 'none';

                // Check if this offer tile already has a checkmark (already added)
                // Find the parent offer tile container
                const offerTile = button.closest(
                    '[data-cy*="offer-tile"], [data-testid*="offer-tile"]'
                );
                const hasCheckmark = offerTile && offerTile.querySelector(checkmarkSelector);

                // Skip offers that already have a checkmark
                if (hasCheckmark) {
                    console.log('Skipping offer with checkmark (already added)');
                    return false;
                }

                return isVisible && isInViewport && isClickable;
            });

            if (!buttonToClick) {
                console.log('No buttons found, retry count:', retryCount);

                // If we haven't reached max retries, wait and try again
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(
                        'Retrying in 1 second... (attempt',
                        retryCount,
                        'of',
                        maxRetries,
                        ')'
                    );
                    setTimeout(() => {
                        if (!isPaused) {
                            addNextItem();
                        } else {
                            isWaitingForResume = true;
                        }
                    }, 1000);
                    return;
                }

                // Reset retry count and try switching tabs first, then accounts
                retryCount = 0;
                console.log('No more buttons found after', maxRetries, 'retries');

                // First try switching to next tab
                if (switchToNextTab()) {
                    console.log('Switched to next tab, continuing...');
                    return;
                }

                // If no more tabs, reset tab index and try switching account
                currentTabIndex = 0;
                console.log('No more tabs, switching to next account');
                if (switchToNextAccount()) {
                    // When switching accounts, rediscover tabs for the new account
                    allTabs = [];
                    return;
                }

                chrome.runtime.sendMessage({
                    status: 'no_buttons_found',
                    message: 'All accounts and tabs processed'
                });
                return;
            }

            // Reset retry count when we find a button
            retryCount = 0;

            try {
                // Determine which section this button is in
                const inCarousel = buttonToClick.closest('[data-testid*="carousel"]');
                const inGrid = buttonToClick.closest('[data-testid="grid-items-container"]');
                const section = inCarousel
                    ? 'carousel (featured)'
                    : inGrid
                        ? 'grid (all offers)'
                        : 'unknown';

                const parentButton = buttonToClick.closest('[role="button"]');
                if (parentButton) {
                    console.log('Clicking button in', section, 'section');
                    parentButton.click();
                } else {
                    console.log('Clicking icon directly in', section, 'section');
                    buttonToClick.click();
                }

                setTimeout(async () => {
                    if (!isPaused) {
                        await goBack();
                    } else {
                        isWaitingForResume = true;
                    }
                }, getRandomDelay());
            } catch (error) {
                console.error('Error during click:', error);
                chrome.runtime.sendMessage({
                    status: 'click_error',
                    message: error.message
                });
            }
        };

        // --- Start ---
        // Discover tabs at the start
        allTabs = discoverTabs();
        console.log('Starting automation. Found', allTabs.length, 'tabs');

        // If tabs exist, make sure we start with the first one
        if (allTabs.length > 0) {
            console.log('Clicking first tab:', allTabs[0].textContent);
            allTabs[0].click();
            // Wait for tab content to load before starting
            setTimeout(() => {
                addNextItem();
            }, 1500);
        } else {
            // No tabs found, start immediately
            console.log('No tabs found, starting on current view');
            addNextItem();
        }
    }; // --- End of Injected Script Definition ---

    // --- Script Injection Logic ---
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length > 0) {
            const targetTabId = tabs[0].id;
            console.log(`Popup: Attempting to inject script into tab: ${targetTabId}`);
            statusDiv.textContent = 'Status: Running...';
            statusDiv.style.color = '#0000FF'; // Blue color for running status

            // Execute the script on the active tab
            chrome.scripting
                .executeScript({
                    target: { tabId: targetTabId },
                    func: scriptToExecute // Inject the function
                })
                .then(() => {
                    console.log('Popup: Script injected successfully.');
                    // NOTE: We DON'T close the popup here, so the user can see status messages
                    // window.close();
                })
                .catch(err => {
                    console.error(`Popup script error: Failed to inject script: ${err}`);
                    statusDiv.textContent = `Injection Error: ${err.message}`;
                    statusDiv.style.color = '#FF0000'; // Red color for errors
                    pauseButton.style.display = 'none';
                });
        } else {
            console.error('Popup script error: No active tab found.');
            statusDiv.textContent = 'Error: No active tab found.';
            statusDiv.style.color = '#FF0000'; // Red color for errors
            pauseButton.style.display = 'none';
        }
    }); // --- End of Script Injection Logic ---
}); // --- End of Button Click Handler ---

// Set initial status when popup opens
statusDiv.textContent = 'Status: Ready';
statusDiv.style.color = '#000000'; // Black color for ready status
