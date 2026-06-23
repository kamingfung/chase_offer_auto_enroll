const runButton = document.getElementById('runScriptButton');
const pauseButton = document.getElementById('pauseButton');
const statusDiv = document.getElementById('status');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const statsContainer = document.getElementById('statsContainer');

// Dog images
const dogHeader = document.getElementById('dog-header');
const dogWorking = document.getElementById('dog-working');
const dogSuccess = document.getElementById('dog-success');

let isPaused = false;
let startTime = null;

// Helper to switch dog images
function showDog(type) {
    // Hide all first
    dogHeader.style.display = 'none';
    dogWorking.style.display = 'none';
    dogSuccess.style.display = 'none';

    // Show requested one
    if (type === 'working') {
        dogWorking.style.display = 'block';
    } else if (type === 'success') {
        dogSuccess.style.display = 'block';
    } else {
        dogHeader.style.display = 'block';
    }
}

// Helper function to update status with CSS classes
function updateStatus(message, statusClass) {
    statusDiv.textContent = message;
    statusDiv.className = statusClass;
}

// Helper function to update progress bar
// Helper function to update progress bar
function updateProgress(current, total) {
    if (total === 0) return;

    const percentage = Math.round((current / total) * 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${current}/${total} offers (${percentage}%)`;
}

// Helper function to display statistics
function displayStats(stats) {
    document.getElementById('totalOffers').textContent = stats.totalOffersAdded;
    document.getElementById('totalAccounts').textContent = stats.accountsProcessed;
    document.getElementById('totalTime').textContent = stats.timeTaken;

    const breakdownContainer = document.getElementById('statsBreakdown');
    if (stats.breakdown && stats.breakdown.length > 0) {
        breakdownContainer.innerHTML = '<div class="breakdown-title">By Account:</div>';
        stats.breakdown.forEach(item => {
            const div = document.createElement('div');
            div.className = 'breakdown-item';
            div.innerHTML = `
                <span class="breakdown-account">${item.account}</span>
                <span class="breakdown-count">${item.offers} offers</span>
            `;
            breakdownContainer.appendChild(div);
        });
    }

    statsContainer.style.display = 'block';
}

// Helper function to show Chrome notification
function showNotification(stats) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon128.png',
        title: 'Chase Offers Complete!',
        message: `Added ${stats.totalOffersAdded} offers across ${stats.accountsProcessed} accounts in ${stats.timeTaken}`,
        priority: 2
    });
}

// --- Listener for Messages from Injected Script ---
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    console.log('Popup received message:', request);

    if (request.status === 'script_started') {
        startTime = Date.now();
        updateStatus('Adding offers...', 'status-running');
        pauseButton.style.display = 'inline-block';
        progressContainer.style.display = 'block';
        statsContainer.style.display = 'none';
        showDog('working');
    } else if (request.status === 'buttons_counted') {
        updateStatus(request.message, 'status-running');
        if (request.total) {
            updateProgress(0, request.total);
        }
    } else if (request.status === 'offer_clicked') {
        updateStatus(request.message, 'status-running');
        if (request.current && request.total) {
            updateProgress(request.current, request.total);
        }
    } else if (request.status === 'script_paused') {
        updateStatus('Paused', 'status-paused');
        pauseButton.textContent = 'Resume';
        showDog('header'); // Back to sitting dog when paused
    } else if (request.status === 'script_resumed') {
        updateStatus('Adding offers...', 'status-running');
        pauseButton.textContent = 'Pause';
        showDog('working');
    } else if (request.status === 'switching_account') {
        updateStatus(request.message, 'status-running');
    } else if (request.status === 'account_switched') {
        updateStatus(request.message, 'status-running');
    } else if (request.status === 'tab_switched') {
        updateStatus(request.message, 'status-running');
    } else if (request.status === 'script_completed') {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        const timeTaken = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        const stats = request.stats || {
            totalOffersAdded: request.totalOffersAdded || 0,
            accountsProcessed: request.accountsProcessed || 1,
            timeTaken: timeTaken,
            breakdown: request.breakdown || []
        };

        stats.timeTaken = timeTaken;

        updateStatus('Completed!', 'status-success');
        pauseButton.style.display = 'none';
        progressContainer.style.display = 'none';
        displayStats(stats);
        showNotification(stats);
        showDog('success');
    } else if (request.status === 'no_buttons_found') {
        updateStatus(request.message, 'status-warning');
        pauseButton.style.display = 'none';
        progressContainer.style.display = 'none';
        showDog('header');
    } else if (request.status === 'click_error') {
        updateStatus(`Error: ${request.message}`, 'status-error');
    }

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
    updateStatus('Injecting script...', 'status-running');
    isPaused = false;
    pauseButton.textContent = 'Pause';
    statsContainer.style.display = 'none';
    showDog('working');

    // --- Injected Script Definition ---
    // This function gets sent to the Chase page to run
    const scriptToExecute = () => {
        // Let the popup know the script has started executing on the page
        chrome.runtime.sendMessage({ status: 'script_started' });

        console.log('Executing Chase Offer Script...');

        // --- Configuration & Helpers ---
        // Updated selectors for new Chase UI (Nov 2025)
        // Chase now uses SVG elements instead of mds-icon elements
        const addButtonSelector = '[data-cy="commerce-tile-button"]';
        const checkmarkSelector = 'svg[data-cy="commerce-tile-icon"]'; // Checkmark icon for added offers
        const accountSelector = '#select-credit-card-account';

        // --- Core Functions ---
        let currentAccountIndex = (() => {
            // Find the currently selected account index from the listbox
            const options = document.querySelectorAll('ul[role="listbox"]#menu li[role="option"]');
            for (let i = 0; i < options.length; i++) {
                if (options[i].getAttribute('aria-selected') === 'true') return i;
            }
            return 0;
        })();
        let isPaused = false;
        let isWaitingForResume = false;
        let totalButtonsInCurrentView = 0;
        let buttonsClickedInCurrentView = 0;
        let totalButtonsClickedOverall = 0;
        const processedOffersInCurrentAccount = new Set(); // Track processed offers to avoid duplicates

        // Statistics tracking
        const accountStats = []; // Track offers per account
        let currentAccountName = (() => {
            // Detect current account from the new combobox display text
            const combobox = document.querySelector('#select-credit-card-account');
            if (combobox) {
                const displayText = combobox.querySelector('[class*="xko37o4"]');
                if (displayText) return displayText.textContent.trim();
            }
            return 'Account 1';
        })();

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
        }

        function getAccountIdFromOption(option) {
            if (!option) return null;

            // 1. Try specific attributes first
            const attrs = ['value', 'data-value', 'data-account-id', 'id'];
            for (const attr of attrs) {
                const val = option.getAttribute(attr);
                if (val) {
                    const match = val.match(/\d{8,15}/);
                    if (match) return match[0];
                }
            }

            // 2. Try matching in outerHTML tag definition
            const html = option.outerHTML;
            const startTagMatch = html.match(/^<[^>]+>/);
            if (startTagMatch) {
                const startTag = startTagMatch[0];
                const match = startTag.match(/\d{8,15}/);
                if (match) return match[0];
            }

            // 3. Fallback to any 8-15 digit number in the entire HTML
            const generalMatch = html.match(/\d{8,15}/);
            if (generalMatch) return generalMatch[0];
        }

        const safeClick = element => {
            if (!element) return;
            if (typeof element.click === 'function') {
                element.click();
            } else {
                console.log('Element does not support .click(), dispatching MouseEvent');
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                element.dispatchEvent(event);
            }
        };

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

        function completeAutomation() {
            if (buttonsClickedInCurrentView > 0) {
                accountStats.push({
                    account: currentAccountName,
                    offers: buttonsClickedInCurrentView
                });
            }

            chrome.runtime.sendMessage({
                status: 'script_completed',
                message: 'All offers processed',
                stats: {
                    totalOffersAdded: totalButtonsClickedOverall,
                    accountsProcessed: Math.max(accountStats.length, 1),
                    breakdown: accountStats
                }
            });
        }

        function switchToNextAccount() {
            if (isPaused) {
                isWaitingForResume = true;
                return false;
            }

            const combobox = document.querySelector(accountSelector);
            if (!combobox) return false;

            // Notify user that we're switching/checking the next account
            chrome.runtime.sendMessage({
                status: 'switching_account',
                message: `Finished adding offers for ${currentAccountName}. Looking for next account...`
            });

            // Click the combobox to open the dropdown
            safeClick(combobox);

            // Wait for dropdown to open and select next account
            setTimeout(async () => {
                if (isPaused) {
                    await waitForResume();
                }

                // Re-query options after dropdown opens (DOM may update)
                const freshOptionsList = document.querySelector('ul[role="listbox"]#menu');
                const freshOptions = freshOptionsList
                    ? freshOptionsList.querySelectorAll('li[role="option"]')
                    : [];

                const nextIndex = currentAccountIndex + 1;

                if (nextIndex < freshOptions.length) {
                    currentAccountIndex = nextIndex;
                    const option = freshOptions[currentAccountIndex];

                    if (option) {
                        safeClick(option);

                        // Set up a listener to catch and correct the overview redirect
                        let checkCount = 0;
                        const checkInterval = setInterval(() => {
                            checkCount++;
                            const hash = (window.location && window.location.hash) || '';
                            if (hash.includes('/dashboard/overview')) {
                                clearInterval(checkInterval);
                                console.log(
                                    'Detected redirect to overview, navigating back to offers hub...'
                                );
                                const accountId = getAccountIdFromOption(option);
                                if (window.location) {
                                    if (accountId) {
                                        window.location.hash = `/dashboard/merchantOffers/offer-hub?accountId=${accountId}`;
                                    } else {
                                        window.location.hash =
                                            '/dashboard/merchantOffers/offer-hub';
                                    }
                                }
                            }
                            if (checkCount >= 20) {
                                // check for 2 seconds
                                clearInterval(checkInterval);
                            }
                        }, 100);

                        // Scroll to top of page to ensure we start from the beginning
                        window.scrollTo({ top: 0, behavior: 'smooth' });

                        // Wait for account switch to complete before continuing (longer wait for account switches)
                        setTimeout(() => {
                            // Save stats for previous account before switching
                            if (buttonsClickedInCurrentView > 0) {
                                accountStats.push({
                                    account: currentAccountName,
                                    offers: buttonsClickedInCurrentView
                                });
                            }

                            // Update current account name from the option text content
                            const nameEl = option.querySelector('[class*="iappo6m"]');
                            currentAccountName =
                                (nameEl && nameEl.textContent.trim()) ||
                                `Account ${currentAccountIndex + 1}`;

                            // Reset processed offers set for new account
                            processedOffersInCurrentAccount.clear();
                            console.log('Cleared processed offers for new account');

                            // Count buttons in new account
                            totalButtonsInCurrentView = countClickableButtons();
                            buttonsClickedInCurrentView = 0;

                            chrome.runtime.sendMessage({
                                status: 'account_switched',
                                message: `Switched to account: ${currentAccountName}. Found ${totalButtonsInCurrentView} offers to add.`
                            });

                            if (!isPaused) {
                                addNextItem();
                            } else {
                                isWaitingForResume = true;
                            }
                        }, 2500);
                    } else {
                        completeAutomation();
                    }
                } else {
                    // No more accounts. Close the dropdown first.
                    safeClick(combobox);
                    completeAutomation();
                }
            }, 500);

            return true;
        }

        let retryCount = 0;
        const maxRetries = 5; // Increased from 3 to 5 for better reliability
        const retryDelay = 2000; // Increased from 1000ms to 2000ms

        const addNextItem = async () => {
            if (isPaused) {
                await waitForResume();
            }

            // Check if we are currently on the offer-activated or detail page
            const hash = (window.location && window.location.hash) || '';
            if (hash.includes('offer-activated') || hash.includes('/detail')) {
                console.log('Currently on detail/activated page, navigating back to offers hub...');
                window.history.back();
                setTimeout(() => {
                    if (!isPaused) {
                        addNextItem();
                    } else {
                        isWaitingForResume = true;
                    }
                }, 1500); // Wait 1.5s for back navigation to complete and page to load/settle
                return;
            }

            console.log('Executing: addNextItem() - Looking for next button');

            // Find all add buttons across both carousel and grid sections
            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            console.log('Found', addButtons.length, 'add buttons total across all sections');

            const buttonsToClick = addButtons.filter(button => {
                const rect = button.getBoundingClientRect();
                const inCarousel = button.closest('[data-testid*="carousel"]');
                const isVisible = rect.width > 0 && rect.height > 0;

                if (!isVisible && !inCarousel) {
                    return false;
                }

                const parentButton = button.closest('button') || button;
                const isClickable =
                    parentButton &&
                    !parentButton.disabled &&
                    window.getComputedStyle(parentButton).display !== 'none';

                if (!isClickable) {
                    return false;
                }

                // Check if this offer tile already has a checkmark or success alert (already added)
                const offerTile = button.closest(
                    '[data-cy*="offer-tile"], [data-testid*="offer-tile"], [data-cy="commerce-tile"], [data-testid="commerce-tile"]'
                );

                if (offerTile) {
                    const hasCheckmark = offerTile.querySelector(checkmarkSelector);
                    const hasSuccessAlert = offerTile.querySelector(
                        '[data-testid="offer-tile-alert-container-success"], [data-cy="offer-tile-alert-container-success"]'
                    );

                    if (hasCheckmark || hasSuccessAlert) {
                        return false;
                    }
                }

                // Check if we've already processed this offer in this account
                const offerId = getOfferIdentifier(button);
                if (offerId && processedOffersInCurrentAccount.has(offerId)) {
                    return false;
                }

                return true;
            });

            if (buttonsToClick.length === 0) {
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

                if (switchToNextAccount()) {
                    console.log('Switching to next account...');
                    return;
                }

                completeAutomation();
                return;
            }

            // Reset retry count when we find buttons
            retryCount = 0;

            // Pick the first button to click (sequential)
            const buttonToClick = buttonsToClick[0];

            try {
                // Scroll the button into view if it's not in viewport
                const rect = buttonToClick.getBoundingClientRect();
                const isInViewport =
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth;

                if (!isInViewport) {
                    buttonToClick.scrollIntoView({ behavior: 'auto', block: 'center' });
                }

                // Mark as processed
                const offerId = getOfferIdentifier(buttonToClick);
                if (offerId) {
                    processedOffersInCurrentAccount.add(offerId);
                }

                // Click the button wrapper or SVG directly
                const parentButton = buttonToClick.closest('button') || buttonToClick;
                safeClick(parentButton);

                buttonsClickedInCurrentView++;
                totalButtonsClickedOverall++;

                // Report progress
                chrome.runtime.sendMessage({
                    status: 'offer_clicked',
                    message: `Added offer ${buttonsClickedInCurrentView} of ${totalButtonsInCurrentView} (${totalButtonsClickedOverall} total)`,
                    current: totalButtonsClickedOverall,
                    total:
                        totalButtonsInCurrentView +
                        accountStats.reduce((sum, acc) => sum + acc.offers, 0)
                });

                // Wait 1.5 seconds to allow any page transitions to occur and settle
                // If it transitioned to detail page, the next addNextItem() call will detect it and call history.back()
                setTimeout(() => {
                    if (!isPaused) {
                        addNextItem();
                    } else {
                        isWaitingForResume = true;
                    }
                }, 1500);
            } catch (err) {
                console.error('Error clicking button:', err);
                chrome.runtime.sendMessage({
                    status: 'click_error',
                    message: err.message
                });
                // Continue to next item even on error
                setTimeout(() => {
                    if (!isPaused) {
                        addNextItem();
                    } else {
                        isWaitingForResume = true;
                    }
                }, 1500);
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
                message: `Found ${totalButtonsInCurrentView} unique offers to add`,
                total: totalButtonsInCurrentView
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
                    updateStatus(`Injection Error: ${err.message}`, 'status-error');
                    pauseButton.style.display = 'none';
                });
        } else {
            console.error('Popup script error: No active tab found.');
            updateStatus('Error: No active tab found.', 'status-error');
            pauseButton.style.display = 'none';
        }
    }); // --- End of Script Injection Logic ---
}); // --- End of Button Click Handler ---

// Set initial status when popup opens
updateStatus('Ready', 'status-idle');
