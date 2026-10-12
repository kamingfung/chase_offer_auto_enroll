// Load the real popup.js against the real popup.html markup, so tests exercise the
// shipped code instead of a re-implementation of it.

const fs = require('fs');
const path = require('path');

const popupBody = fs
    .readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8')
    .match(/<body>([\s\S]*)<\/body>/)[1]
    .replace(/<script[\s\S]*?<\/script>/, '');

const CHASE_URL = 'https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub';

/** Point the (stubbed, writable) window.location at a host and hash. */
function setPageLocation(
    hostname = 'secure.chase.com',
    hash = '#/dashboard/merchantOffers/offer-hub'
) {
    Object.defineProperty(window, 'location', {
        value: { href: `https://${hostname}/web/auth/dashboard${hash}`, hostname, hash },
        writable: true,
        configurable: true
    });
}

/**
 * Render popup.html, optionally pre-seed chrome.storage (as if the popup was closed
 * mid-run), point the active tab at `tabUrl`, and (re)load popup.js.
 * Returns the popup's runtime message listener.
 */
function loadPopup(stored = {}, options = {}) {
    // Not a default parameter: an explicit `tabUrl: undefined` must stay undefined
    const tabUrl = 'tabUrl' in options ? options.tabUrl : CHASE_URL;
    document.body.innerHTML = popupBody;
    window.__chaseOfferAdderRunning = false;
    chrome.storage.local.get.mockImplementation((_keys, callback) => callback(stored));
    chrome.tabs.query.mockImplementation((_query, callback) => callback([{ id: 7, url: tabUrl }]));
    chrome.scripting.executeScript.mockResolvedValue([]);

    const listenersBefore = chrome.runtime.onMessage.addListener.mock.calls.length;
    jest.resetModules();
    require('../popup.js');
    return chrome.runtime.onMessage.addListener.mock.calls[listenersBefore][0];
}

/** Click "ADD OFFERS" and return the function the popup handed to executeScript, if any. */
function clickRunAndGetInjectedScript() {
    document.getElementById('runScriptButton').click();
    const call = chrome.scripting.executeScript.mock.calls.at(-1);
    return call ? call[0].func : null;
}

/** Messages the injected script sent to the popup, optionally filtered by status. */
function sentMessages(status) {
    const messages = chrome.runtime.sendMessage.mock.calls.map(call => call[0]);
    return status ? messages.filter(m => m.status === status) : messages;
}

module.exports = { setPageLocation, loadPopup, clickRunAndGetInjectedScript, sentMessages };
