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
        const addButtonSelector = '.mds-icon--cpo[type="ico_add_circle"]';
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
            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            const buttonToClick = addButtons.pop(); // Get last button

            if (!buttonToClick) {
                console.log("Executing: addNextItem() - No button found. Sending message to popup.");
                // ******** KEY CHANGE ********
                // Send a message back to the popup instead of alerting on the page
                chrome.runtime.sendMessage({
                    status: 'no_buttons_found',
                    message: 'Status: No add buttons found' // The message for the popup
                });
                // **************************
                return; // Still need to return here
            }

            console.log("Executing: addNextItem() - Found button, clicking:", buttonToClick);
            try {
                buttonToClick.click();
                console.log("Executing: addNextItem() - Clicked. Scheduling goBack.");
                setTimeout(goBack, getRandomDelay());
            } catch (error) {
                console.error("Executing: addNextItem() - Error during click:", error);
                // Optionally send click errors back to the popup too
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