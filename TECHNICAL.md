# Technical Documentation

This document provides detailed technical information for developers working with the Chase Offer Adder Chrome extension.

## Architecture Overview

### Core Components

**popup.js** - Main extension logic with two distinct execution contexts:
- **Popup Context**: Handles UI interactions, message passing, and Chrome API calls
- **Injected Script Context**: Content script that runs on Chase pages, containing the automation logic

**Key Architectural Pattern**: The extension uses Chrome's `scripting.executeScript` API to inject a complete automation script into the Chase page. This injected script operates independently and communicates back to the popup via `chrome.runtime.sendMessage`.

### File Structure

```
chase-offer-adder/
├── manifest.json          # Chrome extension manifest (v3)
├── popup.html             # Extension popup UI
├── popup.js               # Main extension logic
├── eslint.config.cjs      # ESLint configuration
├── package.json           # Node.js dependencies and scripts
├── CLAUDE.md              # Project instructions for Claude Code
├── images/                # Extension icons and screenshots
├── tests/                 # Jest test suite
│   ├── setup.js           # Chrome API mocks
│   ├── popup.test.js      # Popup logic tests
│   └── injected-script.test.js  # Automation logic tests
└── node_modules/          # Dependencies
```

## Automation Flow

### Script Injection Process

1. **Script Injection**: Popup injects automation script into active Chase tab using `chrome.scripting.executeScript`
2. **Multi-Section Detection**: Automatically searches for buttons in both carousel (featured offers) and grid (all offers) sections
3. **Tab Discovery**: Automatically detects and cycles through page tabs if present
4. **Button Detection**: Script scans for `mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]` elements across all page sections
5. **Already-Added Filter**: Skips offers with checkmark icons (`mds-icon[type="ico_checkmark_filled"]`) indicating they're already added
6. **Retry Mechanism**: Implements 3-retry logic with 1-second delays to handle page loading delays
7. **Tab Switching**: Automatically cycles through all tabs before switching accounts (if tabs are present)
8. **Account Switching**: Automatically cycles through accounts via `mds-select[id="select-credit-card-account"]`
9. **Navigation**: Uses `window.history.back()` between offers

### State Management

- **Pause/Resume**: Controlled via message passing between popup and injected script
- **Retry Logic**: Prevents premature account switching when pages are still loading
- **Progress Tracking**: Real-time status updates via Chrome runtime messaging

### Message Passing Protocol

The extension uses Chrome runtime messaging for popup ↔ injected script communication:

**From Injected Script to Popup:**
- `script_started` - Automation begins
- `script_paused` - Process paused
- `script_resumed` - Process resumed
- `tab_switched` - Switched to new tab (New, All offers, etc.)
- `account_switched` - Switched to new account
- `no_buttons_found` - No offers available
- `click_error` - Error during button clicking

**From Popup to Injected Script:**
- `pause` - Request to pause automation
- `resume` - Request to resume automation

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- Chrome browser with Developer Mode enabled

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/chase-offer-adder.git
cd chase-offer-adder

# Install dependencies
npm install

# Install pre-commit hooks
npm run prepare
```

### Development Commands

```bash
# Testing
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
jest tests/popup.test.js   # Run specific test file

# Code Quality
npm run lint              # Check linting
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format all files with Prettier
npm run format:check      # Check formatting without changes
```

### Loading Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `chase-offer-adder` directory
5. The extension icon will appear in your toolbar

## Testing Architecture

### Test Environment

- **Jest + JSDOM**: Tests run in simulated browser environment
- **Chrome API Mocking**: All Chrome extension APIs mocked in `tests/setup.js`
- **Isolated Testing**: Each test runs independently without browser dependencies

### Test Files

**tests/setup.js** - Global test configuration and Chrome API mocks:
```javascript
// Mocks chrome.runtime, chrome.scripting, chrome.tabs APIs
global.chrome = {
    runtime: { ... },
    scripting: { ... },
    tabs: { ... }
};
```

**tests/popup.test.js** - Tests popup UI logic and Chrome API interactions:
- Button click handlers
- Message passing
- UI state management
- Chrome API calls

**tests/injected-script.test.js** - Tests core automation logic:
- Button detection algorithms
- Retry mechanism
- Account switching logic
- Error handling

## Critical Implementation Details

### Retry Mechanism (Bug Fix)

The most critical recent fix addresses premature account switching. The script now retries 3 times with 1-second delays before switching accounts, preventing lost offers due to page loading delays.

**Implementation:**
```javascript
// Retry logic in injected script
let retryCount = 0;
const maxRetries = 3;

while (retryCount < maxRetries) {
    const buttons = document.querySelectorAll(buttonSelector);
    if (buttons.length > 0) {
        // Process buttons
        break;
    }
    retryCount++;
    await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### Chrome Extension Permissions

Required permissions in `manifest.json`:
- `activeTab`: Required for content script injection
- `scripting`: Required for `executeScript` API

### Selector Dependencies

Extension relies on specific Chase selectors that may break with website updates:

- **Add buttons**: `mds-icon[type="ico_add_circle"][data-cy="commerce-tile-button"]`
- **Already-added indicators**: `mds-icon[type="ico_checkmark_filled"]`
- **Offer tile containers**: `[data-cy*="offer-tile"]`, `[data-testid*="offer-tile"]`
- **Carousel section**: `[data-testid*="carousel"]` (featured/highlighted offers)
- **Grid section**: `[data-testid="grid-items-container"]` (all offers)
- **Tab navigation** (optional): Multiple selectors including `button[data-cy*="new"]`, `[role="tab"][aria-label*="New"]`, etc.
- **Account selector**: `mds-select[id="select-credit-card-account"]`
- **Account options**: `mds-select-option`

**Notes**:

- The extension automatically searches for buttons in both carousel (featured offers) and grid (all offers) sections on the same page
- Skips offers that already have checkmark icons, focusing only on offers with add buttons (plus icons)
- Tab discovery uses multiple selector patterns to find page tabs if they exist
- The automation cycles through all tabs (if present) before switching to the next account

## Code Style & Quality

### ESLint Configuration

```javascript
// eslint.config.cjs
module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.webextensions,
                chrome: "readonly"
            }
        }
    }
];
```

### Prettier Configuration

- 4-space indentation
- Single quotes
- No trailing commas
- Line width: 80 characters

### Pre-commit Hooks

Configured via Husky and lint-staged:
```json
{
    "lint-staged": {
        "*.js": [
            "prettier --write",
            "eslint --fix", 
            "jest --findRelatedTests"
        ],
        "*.{json,html}": [
            "prettier --write"
        ]
    }
}
```

## Chrome Extension Manifest (v3)

```json
{
    "manifest_version": 3,
    "name": "Chase Offer Adder",
    "version": "1.0.0",
    "permissions": ["activeTab", "scripting"],
    "action": {
        "default_popup": "popup.html",
        "default_icon": "images/icon128.png"
    },
    "icons": {
        "128": "images/icon128.png"
    }
}
```

## Error Handling

### Common Error Scenarios

1. **No buttons found**: Extension detects no available offers
2. **Click errors**: Button clicking fails due to DOM changes
3. **Account switching failures**: Unable to switch between accounts
4. **Network issues**: Chase website unresponsive

### Error Recovery

- Graceful degradation with clear error messages
- Automatic retry mechanisms for transient failures
- User-controlled pause/resume for manual intervention
- Status updates for transparency

## Performance Considerations

### Memory Management

- Injected script cleans up event listeners
- Limited DOM queries to essential elements
- Efficient message passing between contexts

### Network Efficiency

- Minimal HTTP requests (relies on existing page state)
- Respects Chase's rate limiting through delays
- Graceful handling of slow page loads

## Security Considerations

### Data Privacy

- No personal data collection or storage
- No external network requests
- Only interacts with Chase's legitimate DOM elements

### Content Security Policy

- Follows Chrome extension security best practices
- Uses content script injection instead of inline scripts
- Validates all DOM interactions

## Debugging

### Console Logging

Enable detailed logging by adding to injected script:
```javascript
console.log('Popup received message:', request);
```

### Chrome DevTools

- Use `chrome://extensions/` to reload extension
- Check Console tab for error messages
- Inspect popup.html for UI debugging

### Common Issues

1. **Extension not loading**: Check Developer Mode is enabled
2. **Script not injecting**: Verify activeTab permission
3. **Buttons not found**: Inspect Chase page DOM changes
4. **Message passing fails**: Check Chrome runtime availability

## Contributing

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run test suite: `npm test`
5. Run linting: `npm run lint`
6. Commit with descriptive message
7. Submit pull request

### Code Review Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code follows existing patterns
- [ ] Chrome extension permissions not expanded unnecessarily
- [ ] No security vulnerabilities introduced
- [ ] Documentation updated if needed

### Release Process

1. Update version in `package.json` and `manifest.json`
2. Update CHANGELOG.md with new features/fixes
3. Create GitHub release with zip file
4. Test installation process

## Future Improvements

### Potential Enhancements

- **Account filtering**: Allow users to select specific accounts
- **Scheduling**: Run automation at specified times
- **Offer filtering**: Skip certain offer categories
- **Enhanced logging**: Detailed activity logs
- **Success metrics**: Track offers added per session

### Technical Debt

- Consolidate selector configuration
- Improve error message specificity
- Add integration tests with real Chase pages
- Implement proper TypeScript support

---

**Note**: This documentation is maintained alongside code changes. When modifying functionality, please update relevant sections.