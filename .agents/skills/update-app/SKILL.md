---
name: update-chase-offer-adder
description: Instructions and guidelines for updating the Chase Offer Adder chrome extension, running code quality checks, bumping version numbers, and packaging releases.
---

# Updating Chase Offer Adder

Use this skill when you need to make changes to the Chase Offer Adder codebase, modify selectors, bump version numbers, or prepare a release.

## Steps to Update the App

### 1. Source Code Modifications
- Update logic inside `popup.js` (Popup or Injected Script context).
- Ensure all selectors are documented in [TECHNICAL.md](file:///Users/fkm/GitHub/chase-offer-adder/TECHNICAL.md) if they are changed.
- If selectors have changed, verify if they need to be updated in the unit test mocks in `tests/injected-script.test.js` or `tests/setup.js`.

### 2. Code Quality & Format Checks
Before finalizing any changes, always run:
```bash
npm run format      # Formats code with Prettier
npm run lint:fix    # Fixes linting errors
npm run lint        # Verifies no lint issues remain
```

### 3. Verification
Verify that the test suite is fully passing:
```bash
npm test            # Runs all Jest unit tests
```

### 4. Version Bump
Sync the version number in both configuration files:
- **manifest.json**: Bumps extension version.
- **package.json**: Bumps NPM package version.
Increment following semantic versioning (e.g. `1.1.0` -> `1.1.1`).

### 5. Packaging a Release
To package the app for manual Chrome extension loading:
1. Ensure the latest files are clean.
2. Exclude `node_modules`, `.git`, `.agents`, `.venv`, and other temporary folders.
3. Zip the remaining directory contents. The extension can be loaded unpacked from the folder directly, or imported as a `.zip` file.
