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
    }
};

// Mock DOM methods
Object.defineProperty(window, 'location', {
    value: {
        href: 'https://example.com'
    },
    writable: true
});

// Mock console methods for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
