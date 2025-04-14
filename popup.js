const runButton = document.getElementById('runScriptButton');

runButton.addEventListener('click', () => {
    // Define the exact script logic provided by the user as a function
    const scriptToExecute = () => {
        console.log("Executing Chase Offer Script...");

        // --- Configuration & Helpers ---
        const addButtonSelector = '.mds-icon--cpo[type="ico_add_circle"]';
        const minDelay = 300;
        const maxDelay = 1300;
        const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

        // --- Core Functions ---
        let goBack; // Declare for potential mutual reference
        let addNextItem;

        goBack = () => {
            console.log("Executing: goBack() - Navigating history back.");
            window.history.back();
            // IMPORTANT: Script execution STOPS here due to navigation.
            // The following timeout will likely never fire effectively.
            console.log("Executing: goBack() - Scheduling addNextItem (will likely fail).");
            setTimeout(addNextItem, getRandomDelay());
        };

        addNextItem = () => {
            console.log("Executing: addNextItem() - Looking for button:", addButtonSelector);
            const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
            const buttonToClick = addButtons.pop(); // Get last button

            if (!buttonToClick) {
                console.log("Executing: addNextItem() - No button found.");
                alert('No add buttons found on this page!'); // Direct feedback
                return;
            }

            console.log("Executing: addNextItem() - Found button, clicking:", buttonToClick);
            try {
                buttonToClick.click();
                console.log("Executing: addNextItem() - Clicked. Scheduling goBack.");
                setTimeout(goBack, getRandomDelay());
            } catch (error) {
                console.error("Executing: addNextItem() - Error during click:", error);
                alert(`Error clicking button: ${error.message}`);
            }
        };

        // --- Start ---
        addNextItem(); // Start the process
    };

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const targetTabId = tabs[0].id;
            console.log(`Attempting to inject script into tab: ${targetTabId}`);

            // Execute the script on the active tab
            chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                func: scriptToExecute // Inject the function directly
            })
                .then(() => {
                    console.log("Script injected successfully from popup.");
                    // Optionally close the popup after clicking
                    window.close();
                })
                .catch(err => {
                    console.error(`Popup script error: Failed to inject script: ${err}`);
                    // Display error to user?
                    alert(`Failed to run script: ${err.message}\n\nMake sure you are on a valid page (not chrome:// or settings) and reload the page.`);
                });
        } else {
            console.error("Popup script error: No active tab found.");
            alert("Error: Could not find active tab.");
        }
    });
});