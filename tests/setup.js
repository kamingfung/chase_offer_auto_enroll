// Jest setup file for Chrome extension testing

// Mock Chrome APIs
global.chrome = {
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        }
    },
    tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
    },
    scripting: {
        executeScript: jest.fn()
    },
    storage: {
        local: {
            get: jest.fn((_keys, callback) => callback({})),
            set: jest.fn()
        }
    },
    notifications: {
        create: jest.fn()
    }
};

// Replace jsdom's location with a plain, writable object so tests can read and
// write `hash` and swap `hostname` without triggering real navigation.
// Tests change it through setPageLocation() from tests/helpers.js.
Object.defineProperty(window, 'location', {
    value: {
        href: 'https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub',
        hostname: 'secure.chase.com',
        hash: '#/dashboard/merchantOffers/offer-hub'
    },
    writable: true,
    configurable: true
});

// Mock console methods for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
