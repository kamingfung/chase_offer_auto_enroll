console.log("Chase Offer Adder content script loaded.");

// --- Configuration ---
const addButtonSelector = '.mds-icon--cpo[type="ico_add_circle"]';
const minDelay = 300; // ms - Short delay after click before reporting back
const maxDelay = 600; // ms
const getRandomDelay = () => Math.random() * (maxDelay - minDelay) + minDelay;

// Function to find and click the next offer button
const findAndClickNextOffer = () => {
    console.log("Content script: Looking for add buttons with selector:", addButtonSelector);
    const addButtons = Array.from(document.querySelectorAll(addButtonSelector));

    if (addButtons.length === 0) {
        console.log("Content script: No add buttons found on this page.");
        chrome.runtime.sendMessage({ command: 'noOffersFound' }).catch(err => console.error("Error sending noOffersFound:", err));
        return; // Stop trying on this page
    }

    // Get the *last* button found (matching the bookmarklet's logic)
    const buttonToClick = addButtons.pop();
    console.log("Content script: Found button, attempting click:", buttonToClick);

    try {
        // Scroll into view slightly (optional, might help on some pages)
        buttonToClick.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Short delay before click (allows scrolling, more human-like)
        setTimeout(() => {
            buttonToClick.click();
            console.log("Content script: Button clicked.");

            // Wait a very short random time *after* click before reporting back
            // This gives the page UI a moment to potentially update visually
            setTimeout(() => {
                chrome.runtime.sendMessage({ command: 'offerClicked' }).catch(err => console.error("Error sending offerClicked:", err));
            }, getRandomDelay());

        }, 300); // Delay before click

    } catch (error) {
        console.error("Content script: Error clicking button:", error);
        // Consider sending an error message back? For now, it will just stop.
        // chrome.runtime.sendMessage({ command: 'clickError', error: error.message });
    }
};

// Listen for commands from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received command:", request.command);
    if (request.command === 'findAndClickOffer') {
        findAndClickNextOffer();
        // sendResponse({ received: true }); // Acknowledge message
    }
    return false; // Indicate sync response or no response needed
});

// Optional: Notify background script when content script is ready on page load/injection
// Useful if the background needs to immediately start after navigation/reload
// Use a small delay to ensure the page is settled
setTimeout(() => {
    console.log("Content script reporting ready.");
    chrome.runtime.sendMessage({ command: 'contentScriptReady' }).catch(err => console.error("Error sending contentScriptReady:", err));
}, 500);