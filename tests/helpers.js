// Load the real popup.js against the real popup.html markup, so tests exercise the
// shipped code instead of a re-implementation of it.

const fs = require('fs');
const path = require('path');

const popupBody = fs
    .readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8')
    .match(/<body>([\s\S]*)<\/body>/)[1]
    .replace(/<script[\s\S]*?<\/script>/, '');

/**
 * Render popup.html, optionally pre-seed chrome.storage (as if the popup was closed
 * mid-run), and (re)load popup.js. Returns the popup's runtime message listener.
 */
function loadPopup(stored = {}) {
    document.body.innerHTML = popupBody;
    chrome.storage.local.get.mockImplementation((_keys, callback) => callback(stored));
    chrome.tabs.query.mockImplementation((_query, callback) => callback([{ id: 7 }]));
    chrome.scripting.executeScript.mockResolvedValue([]);

    const listenersBefore = chrome.runtime.onMessage.addListener.mock.calls.length;
    jest.resetModules();
    require('../popup.js');
    return chrome.runtime.onMessage.addListener.mock.calls[listenersBefore][0];
}

/** Click "ADD OFFERS" and return the function the popup hands to executeScript. */
function clickRunAndGetInjectedScript() {
    document.getElementById('runScriptButton').click();
    return chrome.scripting.executeScript.mock.calls.at(-1)[0].func;
}

/** Messages the injected script sent to the popup, optionally filtered by status. */
function sentMessages(status) {
    const messages = chrome.runtime.sendMessage.mock.calls.map(call => call[0]);
    return status ? messages.filter(m => m.status === status) : messages;
}

module.exports = { loadPopup, clickRunAndGetInjectedScript, sentMessages };
