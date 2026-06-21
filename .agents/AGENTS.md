# Workspace Rules for Chase Offer Adder

Always follow these guidelines when updating the Chase Offer Adder extension:

1. **Version Number Syncing**:
   When releasing updates, increment the version number consistently in both:
   - `package.json` (under `"version"`)
   - `manifest.json` (under `"version"`)

2. **Linter and Formatter Enforcement**:
   Before committing any code modifications, run:
   - `npm run lint:fix` to auto-fix linting issues.
   - `npm run format` to enforce Prettier formatting.
   Always ensure `npm run lint` passes without any errors or warnings.

3. **Unit Testing Mandate**:
   Run `npm test` to verify all tests pass. If changes are made to selectors or application behavior, ensure you check/update corresponding tests under `tests/injected-script.test.js` or `tests/popup.test.js`.

4. **Selector Maintenance**:
   If Chase updates their DOM and you need to change any selectors (e.g. `addButtonSelector`, `checkmarkSelector`, `accountSelector`):
   - Update the selector definition in `popup.js`.
   - Update the documentation in [TECHNICAL.md](file:///Users/fkm/GitHub/chase-offer-adder/TECHNICAL.md) under "Selector Dependencies".
   - Keep mock structures in `tests/setup.js` or test files in sync.

5. **Release Checklist**:
   - Increment versions in `package.json` and `manifest.json`.
   - Run linter, formatter, and tests.
   - Package the unpacked extension by creating a zip file of the repository (excluding `node_modules`, `.git`, `.venv`, and other build/development files) for distribution.
