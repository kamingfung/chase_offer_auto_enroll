# Chase Offer Adder - Task Runner
# Install just: https://github.com/casey/just#installation
#   brew install just

# Default recipe - show available commands
default:
    @just --list

# ─── Development ──────────────────────────────────────────────────────────────

# Install all dependencies
setup:
    npm install

# Run all checks (format, lint, test) - same as CI
check: format-check lint test

# ─── Testing ──────────────────────────────────────────────────────────────────

# Run all tests
test:
    npx jest

# Run tests in watch mode
test-watch:
    npx jest --watch

# Run tests with coverage report
test-coverage:
    npx jest --coverage

# ─── Code Quality ─────────────────────────────────────────────────────────────

# Check linting
lint:
    npx eslint *.js

# Auto-fix linting issues
lint-fix:
    npx eslint *.js --fix

# Format all files with Prettier
format:
    npx prettier --write "*.js" "*.json" "*.html"

# Check formatting without making changes
format-check:
    npx prettier --check "*.js" "*.json" "*.html"

# ─── Pre-commit ───────────────────────────────────────────────────────────────

# Run pre-commit checks (lint-staged)
pre-commit:
    npx lint-staged

# ─── CI ───────────────────────────────────────────────────────────────────────

# Run the full CI pipeline locally
ci: format-check lint test

# ─── Utilities ────────────────────────────────────────────────────────────────

# Clean generated artifacts
clean:
    rm -rf node_modules coverage

# Reinstall dependencies from scratch
reset: clean setup

# Validate manifest.json structure
validate-manifest:
    @node -e "const m = require('./manifest.json'); \
        const required = ['manifest_version', 'name', 'version', 'permissions', 'action']; \
        const missing = required.filter(k => !m[k]); \
        if (missing.length) { console.error('Missing keys:', missing); process.exit(1); } \
        console.log('✓ manifest.json is valid (v' + m.version + ')');"

# Package extension into a zip for distribution
package:
    #!/usr/bin/env sh
    set -eu
    version=$(node -p "require('./manifest.json').version")
    zip -r "chase-offer-adder-v${version}.zip" \
        manifest.json popup.html popup.js popup.css images/ \
        -x "*.DS_Store"
    echo "✓ Packaged chase-offer-adder-v${version}.zip"

# Show current version from manifest
version:
    @node -p "require('./manifest.json').version"

# Bump version in both manifest.json and package.json
bump-version version:
    node -e "const fs = require('fs'); \
        ['manifest.json', 'package.json'].forEach(f => { \
            const data = JSON.parse(fs.readFileSync(f)); \
            data.version = '{{version}}'; \
            fs.writeFileSync(f, JSON.stringify(data, null, 4) + '\n'); \
        }); \
        console.log('✓ Version bumped to {{version}}');"
