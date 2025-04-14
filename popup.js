const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');

// Update status display
const updateStatus = (text) => {
    statusDiv.textContent = `Status: ${text}`;
};

// Get initial status when popup opens
chrome.storage.local.get(['isAddingOffers', 'statusMessage'], (result) => {
    updateStatus(result.isAddingOffers ? (result.statusMessage || 'Running...') : 'Idle');
});

startButton.addEventListener('click', () => {
    updateStatus('Starting...');
    // Send message to background script to start the process
    chrome.runtime.sendMessage({ command: 'startAdding' }, (response) => {
        if (chrome.runtime.lastError) {
            updateStatus(`Error: ${chrome.runtime.lastError.message}`);
        } else if (response && response.status) {
            updateStatus(response.status);
        }
    });
});

stopButton.addEventListener('click', () => {
    updateStatus('Stopping...');
    // Send message to background script to stop
    chrome.runtime.sendMessage({ command: 'stopAdding' }, (response) => {
        if (chrome.runtime.lastError) {
            updateStatus(`Error: ${chrome.runtime.lastError.message}`);
        } else if (response && response.status) {
            updateStatus(response.status);
        }
    });
});

// Listen for status updates from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === 'updateStatus') {
        updateStatus(request.status);
    }
});