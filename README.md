# Chrome Extension: Chase Offer Adder

Stop clicking endlessly to add Chase Offers! This Chrome extension saves you time by clicking one "Add to Card" button for you with a single click in its popup. While you'll still click for each offer, it beats manually clicking and waiting every time. Think of it as your personal Chase Offer button-clicker!

## Overview

This extension provides a simple browser action popup with a button. When you are on a Chase page displaying offers, clicking the `Add offers` button in the popup injects a small script into the page. This script attempts to:

1. Find an "Add to Card" button.
2. Click the button.
3. Wait a brief moment.
4. Navigate back to the offer page.

It helps reduce the number of clicks needed compared to manually clicking the offer, waiting, and navigating back, but it still requires user interaction for each offer.

## Features

* Simple popup interface with a single "Add offers" button.
* Injects and runs the offer-adding script on the current active tab.
* Provides basic status feedback within the popup (e.g., "Adding offers...", "Cannot find add buttons!", errors).

## Limitations

* **Manual Credit Card Offer Page Selection**: The extension does not automatically navigate to the Chase Offers page of each card. You must manually go to the page where your offers are displayed.
* **Manual Trigger Required:** This extension only adds **one** offer and goes back per button click. After the page navigates back, you **MUST click the extension icon and the "Run Offer Script" button again** to add the next offer. It is *not* fully automated.
* **Basic Error Handling:** Includes minimal error feedback, mostly within the popup or the browser console.
* **Single Button Logic:** The script currently targets the *last* button found matching the selector on the page.

## Screenshots

**1. Extension Popup:** Shows the simple interface with the button and status area.
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

1. **Navigate:** Go to the Chase webpage that displays your available offers where the "Add to Card" buttons are visible.
2. **Click Extension Icon:** Click the extension's icon in your Chrome toolbar. A small popup window will appear.
3. **Click "Add Offers":** Click the button inside the popup.
4. **Wait:** The script will run on the page, click one button (if found), and navigate your browser back.
5. **Check Status:** If no buttons were found, a message will appear in the popup.
6. **Repeat:** Once the previous page has loaded, if you want to add another offer, repeat steps 2 and 3.

## Disclaimer

* This extension is provided "as-is" without warranty. Use it at your own risk.
* This extension is not affiliated with, endorsed by, or sponsored by JPMorgan Chase & Co.
* Website structures change frequently. This extension may break without notice if Chase updates their website. Maintenance may be required.
* Use this tool responsibly. Avoid running it excessively in ways that could overload the website or violate terms of service.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details (or you can add the license text here if you don't have a separate file).

---

Generated on: April 14, 2025 (Time sensitive due to website dependency)
