import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(rootDir, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

const requiredKeys = ['manifest_version', 'name', 'version', 'permissions', 'action'];
const missingKeys = requiredKeys.filter(key => !manifest[key]);
if (missingKeys.length) {
    console.error('manifest.json is missing required keys:', missingKeys.join(', '));
    process.exit(1);
}

// Chrome Web Store requires 1-4 dot-separated integers, each 0-65535, no leading zeros
const versionParts = manifest.version.split('.');
const isValidPart = part => /^(0|[1-9]\d*)$/.test(part) && Number(part) <= 65535;
if (versionParts.length > 4 || !versionParts.every(isValidPart)) {
    console.error(
        `manifest.json version "${manifest.version}" is not valid for the Chrome Web Store ` +
            '(must be 1-4 dot-separated integers, each 0-65535, no leading zeros)'
    );
    process.exit(1);
}

if (manifest.version !== pkg.version) {
    console.error(
        `Version mismatch: manifest.json is "${manifest.version}" but package.json is "${pkg.version}"`
    );
    process.exit(1);
}

console.log(`✓ manifest.json is valid (v${manifest.version}, matches package.json)`);
