const runButton = document.getElementById('runScriptButton');
const statusDiv = document.getElementById('status'); // Get reference to the status display area

// --- Listener for Messages from Injected Script ---
// This listens for messages sent FROM the script running on the Chase page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Popup received message:", request); // Log received messages

    // Check the status included in the message
    if (request.status === 'no_buttons_found') {
        statusDiv.textContent = request.message;
        statusDiv.style.color = '#FFA500'; // Orange color for no buttons found
    } else if (request.status === 'click_error') {
        statusDiv.textContent = `Click Error: ${request.message}`;
        statusDiv.style.color = '#FF0000'; // Red color for errors
    } else if (request.status === 'script_started') {
        statusDiv.textContent = 'Status: Adding offers...';
        statusDiv.style.color = '#008000'; // Green color for active status
    }
    // Add more conditions here if the injected script sends other statuses

    // Return false as we aren't sending an asynchronous response from the listener
    return false;
});

// --- Button Click Handler ---
runButton.addEventListener('click', () => {
    statusDiv.textContent = 'Status: Injecting...';
    statusDiv.style.color = '#0000FF'; // Blue color for injection status

    // --- Injected Script Definition ---
    // This function gets sent to the Chase page to run
    const scriptToExecute = () => {
        // Let the popup know the script has started executing on the page
        chrome.runtime.sendMessage({ status: 'script_started' });

        console.log("Executing Chase Offer Script...");

        // --- Configuration & Helpers ---
        const addButtonSelector = 'mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]';
        const minDelay = 300;
        const maxDelay = 1300;
        const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

        // --- Core Functions ---
        let goBack;
        let addNextItem;

        goBack = () => {
            console.log("Executing: goBack() - Navigating history back.");
            window.history.back();
            // Script execution ends here due to navigation...
            console.log("Executing: goBack() - Scheduling addNextItem (will likely fail).");
            setTimeout(addNextItem, getRandomDelay());
        };

        addNextItem = () => {
            console.log("Executing: addNextItem() - Looking for button:", addButtonSelector);

            // Try to find buttons using the new selector
            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            console.log("Found buttons:", addButtons.length);

            // Get the last button that's visible and clickable
            const buttonToClick = addButtons.reverse().find(button => {
                // Check if the button is visible and within viewport
                const rect = button.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const isInViewport = rect.top >= 0 && rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth;

                // Also check if the button's parent is clickable
                const parentButton = button.closest('[role="button"]');
                const isClickable = parentButton &&
                    !parentButton.disabled &&
                    window.getComputedStyle(parentButton).display !== 'none';

                return isVisible && isInViewport && isClickable;
            });

            if (!buttonToClick) {
                console.log("Executing: addNextItem() - No clickable button found. Sending message to popup.");
                chrome.runtime.sendMessage({
                    status: 'no_buttons_found',
                    message: 'Status: No clickable add buttons found'
                });
                return;
            }

            console.log("Executing: addNextItem() - Found button:", buttonToClick);
            try {
                // Try to click the parent button element which has the role="button"
                const parentButton = buttonToClick.closest('[role="button"]');
                if (parentButton) {
                    console.log("Clicking parent button element");
                    parentButton.click();
                } else {
                    // Fallback to clicking the icon itself
                    console.log("Clicking icon element directly");
                    buttonToClick.click();
                }

                console.log("Executing: addNextItem() - Clicked. Scheduling goBack.");
                setTimeout(goBack, getRandomDelay());
            } catch (error) {
                console.error("Executing: addNextItem() - Error during click:", error);
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
                });
        } else {
            console.error("Popup script error: No active tab found.");
            statusDiv.textContent = 'Error: No active tab found.';
            statusDiv.style.color = '#FF0000'; // Red color for errors
        }
    }); // --- End of Script Injection Logic ---

}); // --- End of Button Click Handler ---

// Set initial status when popup opens
statusDiv.textContent = 'Status: Ready';
statusDiv.style.color = '#000000'; // Black color for ready status