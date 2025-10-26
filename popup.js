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
    } else if (request.status === 'buttons_counted') {
        statusDiv.textContent = `Status: ${request.message}`;
        statusDiv.style.color = '#008000'; // Green color for counting
    } else if (request.status === 'offer_clicked') {
        statusDiv.textContent = `Status: ${request.message}`;
        statusDiv.style.color = '#008000'; // Green color for progress
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
        // Note: Both "Featured" and "All offers" sections are visible on the same page
        // The script processes all sections by finding all buttons across both sections
        const minDelay = 300;
        const maxDelay = 1300;
        const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

        // --- Core Functions ---
        let currentAccountIndex = 0;
        let isPaused = false;
        let isWaitingForResume = false;
        let totalButtonsInCurrentView = 0;
        let buttonsClickedInCurrentView = 0;
        let totalButtonsClickedOverall = 0;
        const processedOffersInCurrentAccount = new Set(); // Track processed offers to avoid duplicates

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

        function getOfferIdentifier(button) {
            // Create a unique identifier for an offer based on its tile content
            const offerTile = button.closest(
                '[data-cy="commerce-tile"], [data-testid="commerce-tile"]'
            );
            if (!offerTile) {
                console.log('Could not find commerce-tile for button');
                return null;
            }

            // Try to get offer ID from the tile's id attribute (e.g., "carousel_0_FIGG:1887586")
            const tileId = offerTile.getAttribute('id');
            if (tileId) {
                console.log('Found offer ID from tile id:', tileId);
                return tileId;
            }

            // Try aria-label which contains merchant name (e.g., "1 of 20 [solidcore] 15% cash back Add Offer")
            const ariaLabel = offerTile.getAttribute('aria-label');
            if (ariaLabel) {
                // Extract merchant name from aria-label
                const merchantMatch = ariaLabel.match(/\[(.*?)\]/);
                if (merchantMatch) {
                    const merchantName = merchantMatch[1];
                    console.log('Using merchant name as identifier:', merchantName);
                    return merchantName;
                }
                // Fallback to full aria-label
                console.log('Using aria-label as identifier:', ariaLabel);
                return ariaLabel;
            }

            // Last resort: try to find merchant name in tile text
            const merchantSpan = offerTile.querySelector('.mds-body-small-heavier');
            if (merchantSpan) {
                const merchantName = merchantSpan.textContent.trim();
                console.log('Using merchant span text as identifier:', merchantName);
                return merchantName;
            }

            console.log('Could not determine offer identifier for tile');
            return null;
        }

        function countClickableButtons() {
            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            console.log(`[COUNT] Found ${addButtons.length} total add button elements`);

            let count = 0;
            const seenOffers = new Set();

            addButtons.forEach(button => {
                const rect = button.getBoundingClientRect();
                const inCarousel = button.closest('[data-testid*="carousel"]');
                const isVisible = rect.width > 0 && rect.height > 0;

                // Accept carousel items even if not currently visible (they can be scrolled to)
                if (!isVisible && !inCarousel) {
                    return;
                }

                const parentButton = button.closest('[role="button"]');
                const isClickable =
                    parentButton &&
                    !parentButton.disabled &&
                    window.getComputedStyle(parentButton).display !== 'none';

                if (!isClickable) {
                    return;
                }

                // Check if this offer tile already has a checkmark or success alert
                const offerTile = button.closest(
                    '[data-cy="commerce-tile"], [data-testid="commerce-tile"]'
                );

                let alreadyAdded = false;
                if (offerTile) {
                    const hasCheckmark = offerTile.querySelector(checkmarkSelector);
                    const hasSuccessAlert = offerTile.querySelector(
                        '[data-testid="offer-tile-alert-container-success"], [data-cy="offer-tile-alert-container-success"]'
                    );
                    alreadyAdded = hasCheckmark || hasSuccessAlert;
                }

                if (alreadyAdded) {
                    return;
                }

                // Check if we've already processed this offer
                const offerId = getOfferIdentifier(button);
                const alreadyProcessed = offerId && processedOffersInCurrentAccount.has(offerId);

                if (alreadyProcessed) {
                    return;
                }

                // Check if we've already seen this offer in the current count (duplicates in view)
                const alreadyCounted = offerId && seenOffers.has(offerId);

                if (!alreadyCounted) {
                    if (offerId) seenOffers.add(offerId);
                    count++;
                }
            });

            console.log(`[COUNT] Unique clickable offers: ${count}`);
            return count;
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

                    // Scroll to top of page to ensure we start from the beginning
                    window.scrollTo({ top: 0, behavior: 'smooth' });

                    // Wait for account switch to complete before continuing (longer wait for account switches)
                    setTimeout(() => {
                        // Reset processed offers set for new account
                        processedOffersInCurrentAccount.clear();
                        console.log('Cleared processed offers for new account');

                        // Count buttons in new account
                        totalButtonsInCurrentView = countClickableButtons();
                        buttonsClickedInCurrentView = 0;

                        chrome.runtime.sendMessage({
                            status: 'account_switched',
                            message: `Switched to account: ${option.getAttribute('label')}. Found ${totalButtonsInCurrentView} offers to add.`
                        });

                        if (!isPaused) {
                            addNextItem();
                        } else {
                            isWaitingForResume = true;
                        }
                    }, 2500); // Increased from 2000ms to 2500ms for account switches
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
        const maxRetries = 5; // Increased from 3 to 5 for better reliability
        const retryDelay = 2000; // Increased from 1000ms to 2000ms

        const addNextItem = async () => {
            if (isPaused) {
                await waitForResume();
            }

            console.log('Executing: addNextItem() - Looking for buttons in all sections');

            // Find all add buttons across both carousel and grid sections
            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            console.log('Found', addButtons.length, 'add buttons total across all sections');

            // Debug: Check where these buttons are located
            const carouselButtons = addButtons.filter(btn =>
                btn.closest('[data-testid*="carousel"]')
            );
            const gridButtons = addButtons.filter(btn =>
                btn.closest('[data-testid="grid-items-container"]')
            );
            console.log(
                `Buttons by section: ${carouselButtons.length} in carousel, ${gridButtons.length} in grid`
            );

            const buttonToClick = addButtons.find(button => {
                const rect = button.getBoundingClientRect();
                // For carousel items, they exist in DOM even if scrolled out of view
                // Check if element exists (has dimensions) OR is in a carousel
                const inCarousel = button.closest('[data-testid*="carousel"]');
                const isVisible = rect.width > 0 && rect.height > 0;

                // For carousel items, we accept them even if not visible (will scroll to them)
                // For grid items, they must be visible
                if (!isVisible && !inCarousel) {
                    return false;
                }

                const parentButton = button.closest('[role="button"]');
                const isClickable =
                    parentButton &&
                    !parentButton.disabled &&
                    window.getComputedStyle(parentButton).display !== 'none';

                if (!isClickable) {
                    return false;
                }

                // Check if this offer tile already has a checkmark or success alert (already added)
                // Find the parent offer tile container
                const offerTile = button.closest(
                    '[data-cy*="offer-tile"], [data-testid*="offer-tile"], [data-cy="commerce-tile"], [data-testid="commerce-tile"]'
                );

                if (offerTile) {
                    const hasCheckmark = offerTile.querySelector(checkmarkSelector);
                    const hasSuccessAlert = offerTile.querySelector(
                        '[data-testid="offer-tile-alert-container-success"], [data-cy="offer-tile-alert-container-success"]'
                    );

                    // Skip offers that already have a checkmark or success alert
                    if (hasCheckmark || hasSuccessAlert) {
                        console.log(
                            'Skipping offer already added (has checkmark or success alert)'
                        );
                        return false;
                    }
                }

                // Check if we've already processed this offer in this account
                const offerId = getOfferIdentifier(button);
                if (offerId && processedOffersInCurrentAccount.has(offerId)) {
                    console.log('Skipping duplicate offer:', offerId);
                    return false;
                }

                return true;
            });

            if (!buttonToClick) {
                console.log('No buttons found, retry count:', retryCount);

                // Check if page is still loading content
                const isLoading =
                    document.querySelector(
                        '[data-testid*="skeleton"], [class*="skeleton"], [class*="loading"]'
                    ) || document.querySelector('[aria-busy="true"]');

                if (isLoading) {
                    console.log('Page is still loading content, resetting retry count');
                    retryCount = 0; // Reset retry count if page is actively loading
                }

                // If we haven't reached max retries, wait and try again
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(
                        `Retrying in ${retryDelay / 1000} seconds... (attempt ${retryCount} of ${maxRetries})`
                    );
                    setTimeout(() => {
                        if (!isPaused) {
                            addNextItem();
                        } else {
                            isWaitingForResume = true;
                        }
                    }, retryDelay);
                    return;
                }

                // Reset retry count and try switching to next account
                retryCount = 0;
                console.log('No more buttons found after', maxRetries, 'retries');

                // Try switching to next account
                if (switchToNextAccount()) {
                    console.log('Switched to next account, continuing...');
                    return;
                }

                chrome.runtime.sendMessage({
                    status: 'no_buttons_found',
                    message: 'All accounts processed'
                });
                return;
            }

            // Reset retry count when we find a button
            retryCount = 0;

            try {
                // Scroll the button into view if it's not in viewport
                const rect = buttonToClick.getBoundingClientRect();
                const isInViewport =
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth;

                if (!isInViewport) {
                    console.log('Scrolling button into view');
                    buttonToClick.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Wait a moment after scrolling for any lazy-loaded content
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Determine which section this button is in
                const inCarousel = buttonToClick.closest('[data-testid*="carousel"]');
                const inGrid = buttonToClick.closest('[data-testid="grid-items-container"]');
                const section = inCarousel
                    ? 'carousel (featured)'
                    : inGrid
                        ? 'grid (all offers)'
                        : 'unknown';

                // Mark this offer as processed to avoid duplicates
                const offerId = getOfferIdentifier(buttonToClick);
                if (offerId) {
                    processedOffersInCurrentAccount.add(offerId);
                    console.log('Marked offer as processed:', offerId);
                }

                const parentButton = buttonToClick.closest('[role="button"]');
                if (parentButton) {
                    console.log('Clicking button in', section, 'section');
                    parentButton.click();
                } else {
                    console.log('Clicking icon directly in', section, 'section');
                    buttonToClick.click();
                }

                // Increment counters after click
                buttonsClickedInCurrentView++;
                totalButtonsClickedOverall++;

                // Report progress
                chrome.runtime.sendMessage({
                    status: 'offer_clicked',
                    message: `Added offer ${buttonsClickedInCurrentView} of ${totalButtonsInCurrentView} (${totalButtonsClickedOverall} total)`
                });

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
        console.log('Starting automation on offers page...');

        // Scroll to top of page to ensure we start from the beginning
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Wait a moment for page to settle, then count and start
        setTimeout(() => {
            // Count all unique buttons across both Featured and All offers sections
            totalButtonsInCurrentView = countClickableButtons();
            buttonsClickedInCurrentView = 0;

            chrome.runtime.sendMessage({
                status: 'buttons_counted',
                message: `Found ${totalButtonsInCurrentView} unique offers to add`
            });

            console.log(`Found ${totalButtonsInCurrentView} unique offers across all sections`);
            addNextItem();
        }, 1000);
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
