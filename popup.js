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

        // Security: Redact PII from logs and messages
        function redactPII(text) {
            if (!text) return text;
            // No longer redacting last 4 digits as requested
            return text;
        }

        // Statistics tracking

        // Statistics tracking
        const accountStats = []; // Track offers per account
        let currentAccountName = 'Account 1';

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
                console.log('Using aria-label as identifier:', redactPII(ariaLabel));
                return ariaLabel;
            }

            // Last resort: try to find merchant name in tile text
            const merchantSpan = offerTile.querySelector('.mds-body-small-heavier');
            if (merchantSpan) {
                const merchantName = merchantSpan.textContent.trim();
                console.log('Using merchant span text as identifier:', redactPII(merchantName));
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
                // Save final account stats
                if (buttonsClickedInCurrentView > 0) {
                    accountStats.push({
                        account: currentAccountName,
                        offers: buttonsClickedInCurrentView
                    });
                }

                chrome.runtime.sendMessage({
                    status: 'script_completed',
                    message: 'All accounts processed',
                    stats: {
                        totalOffersAdded: totalButtonsClickedOverall,
                        accountsProcessed: accountStats.length,
                        breakdown: accountStats
                    }
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
                        // Save stats for previous account before switching
                        if (buttonsClickedInCurrentView > 0) {
                            accountStats.push({
                                account: currentAccountName,
                                offers: buttonsClickedInCurrentView
                            });
                        }

                        // Update current account name with redacted label
                        const rawLabel =
                            option.getAttribute('label') || `Account ${currentAccountIndex + 1}`;
                        currentAccountName = redactPII(rawLabel);

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

                // After max retries, try switching tabs then accounts
                if (switchToNextAccount()) {
                    console.log('Switched to next account, continuing...');
                    return;
                }

                // No more accounts - save final stats and complete
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
                    message: `Added offer ${buttonsClickedInCurrentView} of ${totalButtonsInCurrentView} (${totalButtonsClickedOverall} total)`,
                    current: totalButtonsClickedOverall,
                    total:
                        totalButtonsInCurrentView +
                        accountStats.reduce((sum, acc) => sum + acc.offers, 0)
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
