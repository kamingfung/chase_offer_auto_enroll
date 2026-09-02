// Shared helpers that load the real popup.js against the real popup.html markup,
// so tests exercise the shipped code instead of a re-implementation.

const fs = require('fs');
const path = require('path');

const popupHtml = fs.readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8');
const popupBody = popupHtml
    .match(/<body>([\s\S]*)<\/body>/)[1]
    .replace(/<script[\s\S]*?<\/script>/, '');

const CHASE_URL = 'https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub';

/** Point the (stubbed, writable) window.location at a host and hash. */
function setPageLocation(
    hostname = 'secure.chase.com',
    hash = '#/dashboard/merchantOffers/offer-hub'
) {
    Object.defineProperty(window, 'location', {
        value: {
            href: `https://${hostname}/web/auth/dashboard${hash}`,
            hostname,
            hash
        },
        writable: true,
        configurable: true
    });
}

/**
 * Render popup.html into the document, point chrome.tabs.query at a tab with the
 * given URL, and (re)load popup.js. Returns the popup's runtime message listener.
 */
function loadPopup(options = {}) {
    const tabUrl = 'tabUrl' in options ? options.tabUrl : CHASE_URL;
    const tabId = options.tabId ?? 7;
    document.body.innerHTML = popupBody;
    window.__chaseOfferAdderRunning = false;

    chrome.tabs.query.mockImplementation((_query, callback) =>
        callback([{ id: tabId, url: tabUrl }])
    );
    chrome.scripting.executeScript.mockResolvedValue([]);

    const listenersBefore = chrome.runtime.onMessage.addListener.mock.calls.length;
    jest.resetModules();
    require('../popup.js');

    const popupListener = chrome.runtime.onMessage.addListener.mock.calls[listenersBefore][0];
    return { popupListener };
}

/** Click "ADD OFFERS" and return the function that was handed to executeScript. */
function clickRunAndGetInjectedScript() {
    document.getElementById('runScriptButton').click();
    const call = chrome.scripting.executeScript.mock.calls.at(-1);
    return call ? call[0].func : null;
}

/** Messages the page sent to the popup with a given status. */
function messagesWithStatus(status) {
    return chrome.runtime.sendMessage.mock.calls.map(c => c[0]).filter(m => m.status === status);
}

/**
 * Build a Chase-like offer tile. Clicking the tile's button swaps the plus icon
 * for a checkmark, mirroring what Chase's page does after an offer is added.
 */
function makeTile(id, { added = false } = {}) {
    const tile = document.createElement('div');
    tile.setAttribute('data-cy', 'commerce-tile');
    tile.id = id;

    const button = document.createElement('button');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-cy', added ? 'commerce-tile-icon' : 'commerce-tile-button');
    button.appendChild(svg);
    button.addEventListener('click', () => {
        svg.setAttribute('data-cy', 'commerce-tile-icon');
    });

    tile.appendChild(button);
    return tile;
}

/** jsdom reports zero-size boxes; pretend everything is visible and on screen. */
function mockVisibleLayout() {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        width: 40,
        height: 40,
        top: 10,
        left: 10,
        bottom: 50,
        right: 50
    });
    window.scrollTo = jest.fn();
    Element.prototype.scrollIntoView = jest.fn();
}

module.exports = {
    CHASE_URL,
    setPageLocation,
    loadPopup,
    clickRunAndGetInjectedScript,
    messagesWithStatus,
    makeTile,
    mockVisibleLayout
};
