// Listen for when the user clicks the extension's browser action icon
chrome.action.onClicked.addListener((tab) => {
    // Ensure we're acting on a valid tab with an ID
    if (tab.id) {
        console.log(`Action clicked on tab ${tab.id}. Injecting script...`);

        // Define the core logic from the bookmarklet as a function
        // This function will be executed in the context of the web page
        const scriptToExecute = () => {
            // --- Configuration ---
            const addButtonSelector = '.mds-icon--cpo[type="ico_add_circle"]';
            const minDelay = 300; // ms
            const maxDelay = 1300; // ms (1000 + 300)

            const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

            // --- Functions (defined within the execution context) ---
            let goBack; // Declare names first for mutual recursion possibility
            let addNextItem;

            goBack = () => {
                console.log("Executing: Navigating back...");
                window.history.back();
                // IMPORTANT LIMITATION: The script execution context ends here due to navigation.
                // The setTimeout below aiming to call addNextItem will NOT run reliably on the previous page
                // because this script instance is gone after navigation.
                console.log(`Executing: Scheduled next 'add attempt' (will likely NOT run after back navigation)...`);
                // setTimeout(addNextItem, getRandomDelay()); // This line won't effectively continue the process
            };

            addNextItem = () => {
                console.log("Executing: Looking for add button:", addButtonSelector);
                // Use Array.from for robustness
                const addButtons = Array.from(document.querySelectorAll(addButtonSelector));
                // Get the last matching button based on original script logic
                const buttonToClick = addButtons.pop();

                if (!buttonToClick) {
                    console.log("Executing: No add buttons found on this page.");
                    alert('No add buttons found on this page!'); // Notify user directly
                    return; // Stop if no button found
                }

                console.log("Executing: Found button, attempting click:", buttonToClick);
                try {
                    buttonToClick.click();
                    console.log(`Executing: Button clicked successfully. Scheduling goBack...`);
                    // Wait a random amount of time, then trigger the goBack sequence
                    setTimeout(goBack, getRandomDelay());
                } catch (error) {
                    console.error("Executing: Error clicking button:", error);
                    alert(`Error clicking button: ${error.message}`); // Notify user of click error
                }
            };

            // --- Start Execution ---
            console.log("Executing: Starting injected add/back script...");
            addNextItem(); // Call the first function to kick things off
        };

        // Use chrome.scripting.executeScript to run the function above
        chrome.scripting.executeScript({
            target: { tabId: tab.id }, // Target the active tab where the icon was clicked
            func: scriptToExecute      // The function to execute on the page
        })
            .then(() => {
                console.log("Script injected and execution started successfully.");
            })
            .catch(err => {
                console.error(`Failed to inject script into tab ${tab.id}: ${err}`);
                // This might happen on protected pages (like chrome:// pages) or if permissions are wrong
            });

    } else {
        console.error("Action clicked, but could not get active tab ID.");
    }
});

console.log("Chase Offer Adder (Simple Inject) background script loaded and ready.");