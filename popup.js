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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Popup received message:", request); // Log received messages

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
    }
    // Add more conditions here if the injected script sends other statuses

    // Return false as we aren't sending an asynchronous response from the listener
    return false;
});

// Pause button click handler
pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;

    // Send message to content script to pause/resume
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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

        console.log("Executing Chase Offer Script...");

        // --- Configuration & Helpers ---
        const addButtonSelector = 'mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]';
        const accountSelector = 'mds-select[id="select-credit-card-account"]';
        const minDelay = 300;
        const maxDelay = 1300;
        const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

        // --- Core Functions ---
        let currentAccountIndex = 0;
        let isPaused = false;
        let isWaitingForResume = false;

        // Listen for pause/resume messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

        let goBack = async () => {
            if (isPaused) {
                await waitForResume();
            }

            console.log("Executing: goBack() - Navigating history back.");
            window.history.back();
            setTimeout(() => {
                if (!isPaused) {
                    addNextItem();
                } else {
                    isWaitingForResume = true;
                }
            }, getRandomDelay());
        };

        let addNextItem = async () => {
            if (isPaused) {
                await waitForResume();
            }

            console.log("Executing: addNextItem() - Looking for button:", addButtonSelector);

            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            console.log("Found buttons:", addButtons.length);

            const buttonToClick = addButtons.reverse().find(button => {
                const rect = button.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const isInViewport = rect.top >= 0 && rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth;

                const parentButton = button.closest('[role="button"]');
                const isClickable = parentButton &&
                    !parentButton.disabled &&
                    window.getComputedStyle(parentButton).display !== 'none';

                return isVisible && isInViewport && isClickable;
            });

            if (!buttonToClick) {
                console.log("No more buttons found for current account, switching to next account");
                if (switchToNextAccount()) {
                    return;
                }
                chrome.runtime.sendMessage({
                    status: 'no_buttons_found',
                    message: 'All accounts processed'
                });
                return;
            }

            try {
                const parentButton = buttonToClick.closest('[role="button"]');
                if (parentButton) {
                    console.log("Clicking parent button element");
                    parentButton.click();
                } else {
                    console.log("Clicking icon element directly");
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
                console.error("Error during click:", error);
                chrome.runtime.sendMessage({
                    status: 'click_error',
                    message: error.message
                });
            }
        };

        // --- Start ---
        addNextItem(); // Start the process
    }; // --- End of Injected Script Definition ---


    // --- Script Injection Logic ---
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const targetTabId = tabs[0].id;
            console.log(`Popup: Attempting to inject script into tab: ${targetTabId}`);
            statusDiv.textContent = 'Status: Running...';
            statusDiv.style.color = '#0000FF'; // Blue color for running status

            // Execute the script on the active tab
            chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                func: scriptToExecute // Inject the function
            })
                .then(() => {
                    console.log("Popup: Script injected successfully.");
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
            console.error("Popup script error: No active tab found.");
            statusDiv.textContent = 'Error: No active tab found.';
            statusDiv.style.color = '#FF0000'; // Red color for errors
            pauseButton.style.display = 'none';
        }
    }); // --- End of Script Injection Logic ---

}); // --- End of Button Click Handler ---

// Set initial status when popup opens
statusDiv.textContent = 'Status: Ready';
statusDiv.style.color = '#000000'; // Black color for ready status