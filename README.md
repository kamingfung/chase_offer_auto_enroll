# Chrome Extension: Chase Offer Adder

Stop clicking endlessly to add Chase Offers! This Chrome extension saves you time by automatically adding Chase Offers across all your cards. With features like automatic account switching and pause/resume functionality, you can efficiently manage your offers with minimal interaction.

## Overview

This extension provides a browser action popup with controls to manage the offer-adding process. When you are on a Chase page displaying offers, clicking the `Add offers` button in the popup injects a script that:

1. Finds and clicks "Add to Card" buttons
2. Automatically switches between your credit card accounts
3. Allows pausing and resuming the process at any time
4. Provides real-time status updates

## Features

* **Simple Interface**: Clean popup with "Add offers" and "Pause/Resume" buttons
* **Automatic Account Switching**: Automatically processes offers across all your credit card accounts
* **Pause/Resume Functionality**: Stop and continue the process at any time
* **Real-time Status Updates**: Clear feedback about the current operation
* **Smart Button Detection**: Finds and clicks the appropriate "Add to Card" buttons
* **Error Handling**: Provides feedback for various scenarios (no buttons found, errors, etc.)

## New Features

### Automatic Account Switching

* Automatically detects all your credit card accounts
* Processes offers for each account sequentially
* Switches accounts when all offers are added for the current account
* Continues until all accounts are processed

### Pause/Resume Functionality

* Pause button appears when the script starts running
* Click "Pause" to temporarily stop the process
* Click "Resume" to continue from where it left off
* Status updates show when the script is paused or running
* Pause button automatically hides when the process completes

## Limitations

* **Initial Page Load**: You must manually navigate to the Chase Offers page to start
* **Website Changes**: The extension may need updates if Chase changes their website structure
* **Browser Navigation**: The script uses browser navigation (back button) between offers
* **Single Tab Operation**: The extension operates only on the active tab

## Screenshots

**1. Extension Popup:** Shows the interface with the Add offers button, Pause/Resume button, and status area.
![Popup Window](images/popup.png)

**2. Example Chase Offers Page:** Shows the type of page and "Add to Card" buttons the extension interacts with.
![Chase Offers Page Example](images/offer_page_exmaple.png)

## Installation

Since this extension is not on the Chrome Web Store, you need to load it manually in Developer Mode:

![Chrome Extensions Page](images/installation.png)

1. **Download:** Download the contents of this repository (or clone it) to a folder on your computer. You should have `manifest.json`, `popup.html`, `popup.js`, and the `images` folder all together.
2. **Open Chrome Extensions:** Open Google Chrome, type `chrome://extensions` in the address bar, and press Enter.
3. **Enable Developer Mode:** Look for the "Developer mode" toggle switch (usually in the top-right corner) and make sure it is turned **ON**.
4. **Load Unpacked:** Click the "Load unpacked" button (usually appears in the top-left).
5. **Select Folder:** Navigate to and select the folder where you saved the extension files (the folder containing `manifest.json`).
6. **Done:** The "Chase Offer Adder" extension should now appear in your list of extensions, and its icon should be visible in your Chrome toolbar.

## How to Use

1. **Navigate:** Go to the Chase webpage that displays your available offers
2. **Start Process:**
   * Click the extension's icon in your Chrome toolbar
   * Click the "Add offers" button in the popup
3. **Monitor Progress:**
   * Watch the status updates in the popup
   * Use the Pause/Resume button to control the process
4. **Process Flow:**
   * Script automatically adds offers for the current account
   * Switches to next account when current account is complete
   * Continues until all accounts are processed
   * Pause button automatically hides when complete

## Status Messages

The popup displays various status messages to keep you informed:

* "Status: Adding offers..." - Script is actively processing offers
* "Status: Paused" - Process is temporarily stopped
* "Switched to account: [Account Name]" - Successfully changed to a new account
* "All accounts processed" - Script has completed all accounts
* Error messages for various scenarios

## Disclaimer

* This extension is provided "as-is" without warranty. Use it at your own risk.
* This extension is not affiliated with, endorsed by, or sponsored by JPMorgan Chase & Co.
* Website structures change frequently. This extension may break without notice if Chase updates their website. Maintenance may be required.
* Use this tool responsibly. Avoid running it excessively in ways that could overload the website or violate terms of service.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

Last Updated: May 10, 2025
