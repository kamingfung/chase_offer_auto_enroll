# Changelog

Functional changes only — full commit-level detail lives in `git log`. Versions use [CalVer](https://calver.org) (`YYYY.M.D`, with a trailing `.N` for same-day releases) instead of semver, since compatibility here is really "does this still work against Chase's current site," not an API contract.

## 2026.10.12.2

- 🐛 **Reopening the popup mid-run now actually shows progress**: the progress bar and Pause button stayed hidden after reopening, because only the last message was restored and most messages never switched them on
- 🐛 Reopening the popup while paused now resumes on the first click, instead of sending a second pause
- 🐛 Pausing in the first second of a run no longer starts a second, parallel automation loop, which could double-click offers or skip a card
- 🔒 Account names from the Chase page are shown as plain text in the summary, never interpreted as HTML
- 🧪 Tests now run the real `popup.js` against a fake Chase page with the current markup. The old tests only checked their own copies of selectors, so they kept passing after Chase redesigns broke the extension

## 2026.10.12.1

- 🐛 **Adds offers from the new "Recommended offers" row**: Chase added a carousel above "Explore more offers" whose tiles use different markup (`data-cy="offer"` with a `data-testid="offer-accent-add"` "+" icon), so the extension skipped them entirely. It now clicks those too, and pages through the row with its right arrow, since only 5 of ~20 offers are on the page at a time
- 🐛 The completion summary now shows merchant names (e.g. "Pandora Jewelry") instead of internal offer ids like `FIGG:1901522`
- 🐛 Progress bar no longer overflows past 100% when more offers load mid-run

## 2026.10.12

- 🐛 **Fixed account switching again**: Chase replaced the account combobox/dropdown with a trigger button (`data-testid="account-selector-trigger"`) that opens a bottom sheet (`#accountSelectorSheet`). The old selectors matched nothing, so runs ended after the first account. Now targets the new sheet and its `.accountSelectorListItem` rows, keeps the pre-October selectors as fallbacks, and polls for the sheet to render instead of assuming a fixed 500ms

## 2026.8.16

- 🔧 Switched version numbers from semver (`1.x.x`) to CalVer (`YYYY.M.D`) — a version now tells you the last date it was verified against Chase's site, which matters more here than semantic compatibility
- 🔒 Added [gitleaks](https://github.com/gitleaks/gitleaks) secret scanning: on staged changes in the pre-commit hook (when installed locally) and on full history in CI, where it now gates release packaging
- 🔧 CI now fails if `manifest.json` and `package.json` versions drift apart or the version isn't valid for the Chrome Web Store

## 2026.8.15

- 🐛 **Fixed account switching**: Chase changed the account dropdown's DOM so the extension's selector no longer matched anything, silently ending the run instead of moving to the next account. Now targets the stable `data-testid` attribute instead of the (now random, per-session) element `id`.
- 🐛 Fixed the current-account-name detector, which had been silently falling back to "Account 1" for every account because of the same stale selector plus a hashed CSS class Chase no longer uses.
- ✨ **Offer names in the completion summary**: the summary now lists which offers were added per account, not just a count.
- ✨ **Progress survives closing the popup**: status, progress bar, and pause state are now persisted and restored if you close the popup mid-run and reopen it — previously the UI reset to blank even though automation kept running in the background.

## 2026-06-20 — 2026-06-24 — Reliability hardening

- 🐛 Switched the account selector to Chase's new combobox pattern
- 🐛 Added `safeClick` (falls back to a dispatched `MouseEvent` when `.click()` isn't available), redirect recovery for the "switch account → bounced to dashboard overview" case, and better detail-page navigation handling
- 🧪 Tried a "staggered parallel" offer-clicking mode; reverted it in the same week — clicking an offer navigates the single-page app to a detail route, so parallel clicks in one tab raced each other instead of adding offers reliably
- ♻️ Removed dead code and duplicate button styling

## 2025.11.23

- ✨ New popup UI: progress bar, live stats, and a completion summary with a Chrome notification when a run finishes
- ✨ Dog-themed, Material Design–inspired visuals with status-based imagery
- ✨ Status messages while switching accounts (2025-11-27)
- ✨ Enhanced retry mechanism (5 retries with smart loading detection, up from 3 retries/1s)
- ✨ Automatic scrolling for off-screen buttons
- ✨ Section-aware processing (carousel + grid offer sections)
- 🔧 Disclaimer added to the popup footer

## 2025-11-09 — Chase November 2025 UI overhaul

- 🐛 Adapted all selectors after Chase replaced `<mds-icon>` elements with plain `<svg>` elements for add/checkmark icons — the single biggest source of breakage historically

## 2025-10-18 — 2025-10-26 — Detection & multi-tab support

- ✨ Multi-tab support: detects and cycles through page tabs before switching accounts
- ✨ Featured-offers (carousel) handling alongside the main grid
- ♻️ Simplified offer identification and button-counting logic

## 2025-05-10 — Account switching & Chase format update

- ✨ First account-switching implementation, with a pause button
- 🐛 Updated the icon detector/clicker for a Chase.com layout change

## 2025-04-14 — Initial prototype

- 🎉 First working version: popup-triggered script injection, add-button detection, and status messaging
