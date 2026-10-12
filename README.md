# Chase Offer Adder

> **Automate Chase Offers with ease!** Stop clicking endlessly and save time by automatically adding Chase Offers across all your credit cards.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Updated](https://img.shields.io/badge/Last%20Updated-October%202026-blue)]()

## 🚀 Quick Start

1. **Install** the extension (see [Installation](#installation) below)
2. **Navigate** to your Chase Offers page
3. **Click** the extension icon and hit "Add offers"
4. **Sit back** and watch it work automatically!

## 📋 Table of Contents

- [Overview](#overview)
- [What Happens When You Click "Add Offers"](#-what-happens-when-you-click-add-offers)
- [Features](#features)
- [Installation](#installation)
- [How to Use](#how-to-use)
- [Screenshots](#screenshots)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Changelog](CHANGELOG.md)
- [Disclaimer](#disclaimer)
- [For Developers](#for-developers)

## 📖 Overview

This Chrome extension automates the tedious process of adding Chase Offers to your credit cards. Instead of manually clicking through each offer and account, the extension:

- **Automatically detects** and clicks "Add to Card" buttons across all page sections
- **Switches between accounts** seamlessly
- **Provides real-time feedback** on progress
- **Pause/resume functionality** for complete control
- **Enhanced retry mechanism** with smart loading detection for maximum reliability
- **Handles errors gracefully** with clear status messages

### How It Works

1. 🔍 **Scans** both the Recommended offers row and the full offer list for available "Add to Card" buttons
2. 🖱️ **Clicks** each button automatically with retry logic
3. ➡️ **Pages through** the Recommended offers row to reach offers not yet shown
4. 🔄 **Switches accounts** when all offers on the current card are added
5. 📊 **Updates status** in real-time
6. ⏸️ **Pause/resume** controls for full user control

## 📊 What Happens When You Click "Add Offers"

```mermaid
flowchart TD
    Start([You open Chase Offers<br>and click ADD OFFERS]) --> Look[The extension looks for offers<br>with a + button]
    Look --> Found{Any offers you<br>haven't added yet?}
    Found -->|Yes| Add[It adds the offer<br>to your card]
    Add --> Progress[The progress bar<br>moves forward]
    Progress --> Look
    Found -->|More in the<br>Recommended row| More[It shows the next set of<br>Recommended offers]
    More --> Look
    Found -->|No, this card is done| Other{Do you have<br>another card?}
    Other -->|Yes| Switch[It switches to<br>your next card]
    Switch --> Look
    Other -->|No| Done([Done! You see a summary<br>of offers added on each card])
```

While it runs:

- **Pause anytime** with the Pause button. Resume picks up where it left off.
- **Closing the popup is fine.** The extension keeps working, and reopening the popup shows your progress.
- **Short pauses are normal.** If the page is still loading, the extension waits and tries again.
- **Offers you already added are skipped**, so running it again is safe.

## ✨ Features

- **🎯 Smart Button Detection**: Automatically finds and clicks "Add to Card" buttons in all page sections
- **📑 Multi-Section Support**: Processes both the Recommended offers row and the full offer list automatically
- **🔄 Multi-Account Support**: Processes offers across all your credit card accounts
- **✅ Smart Filtering**: Skips offers already added (with checkmark icons)
- **⏸️ Pause/Resume Controls**: Stop and continue the process at any time
- **🔁 Enhanced Retry Logic**: 5-retry mechanism with smart loading detection for maximum reliability
- **📊 Real-time Status**: Live updates on progress and account switching
- **🛡️ Error Handling**: Graceful handling of various scenarios
- **🧭 Smart Navigation**: Efficient browser navigation between offers
- **🎚️ Auto-Scroll**: Automatically scrolls to buttons that are off-screen

## 📋 Prerequisites

- ✅ **Google Chrome** browser (version 88 or higher)
- ✅ **Chase Online Banking** account with active credit cards
- ✅ **Available Chase Offers** on your accounts

## 🔧 Installation

1. **📥 Download the Extension**

    ```bash
    git clone https://github.com/yourusername/chase-offer-adder.git
    ```

2. **🌐 Open Chrome Extensions**
    - Navigate to `chrome://extensions/`
    - Enable "Developer mode" (top-right toggle)

3. **📁 Load the Extension**
    - Click "Load unpacked"
    - Select the `chase-offer-adder` folder
    - The extension icon will appear in your toolbar

![Installation Screenshot](images/installation.png)

## 🎯 How to Use

1. **Navigate to Chase Offers**
    - Log into your Chase Online Banking
    - Go to your available offers page

2. **Start the Automation**
    - Click the extension icon in your toolbar
    - Click "Add offers" in the popup
    - The automation begins immediately

3. **Monitor Progress**
    - Watch real-time status updates
    - Use Pause/Resume as needed
    - Extension handles account switching automatically

### Controls

- **Add offers**: Start the automation
- **Pause**: Temporarily stop the process
- **Resume**: Continue from where you left off

## 🔧 Troubleshooting

**Extension not working:**

- Ensure you're on a Chase Offers page
- Refresh the page and try again
- Check that the extension is enabled

**No buttons found:**

- Confirm you're on the correct offers page
- Verify you have available offers
- Make sure you're logged into Chase

**Process stops:**

- Use Pause/Resume to restart
- Check your internet connection
- Refresh and restart if needed

**Tips for best results:**

- Keep the popup open while running
- Don't interact with the page during automation
- Use a stable internet connection

## ❓ FAQ

**Q: Is this safe to use?**
A: Yes. The extension refuses to run on any site other than Chase and makes no network requests of its own, so nothing is sent anywhere. The only thing it saves is the last run's progress and summary, kept locally in your Chrome profile.

**Q: Does this work with multiple accounts?**
A: Yes, it automatically detects and processes all your credit card accounts.

**Q: What if Chase updates their website?**
A: The extension may need updates if Chase changes their structure. Check for updates regularly.

**Q: Does this work on mobile?**
A: No, this is a Chrome desktop extension only.

**Q: What if it gets stuck?**
A: Use the Pause button, refresh the page, and restart.

## 📸 Screenshots

### Extension Interface

![Extension Popup](images/popup.png)

### Chase Offers Page Example

![Chase Offers Page Example](images/offer_page_exmaple.png)

## ⚖️ Disclaimer

- **Personal coding practice project**
- Not affiliated with JPMorgan Chase & Co.
- Use at your own risk
- This extension is provided "as-is" without warranty
- Chase website changes may break functionality
- Your responsibility to comply with Chase's terms of service

## 👨‍💻 For Developers

Interested in the technical details, development setup, or contributing? Check out our comprehensive [**Technical Documentation**](TECHNICAL.md) for:

- 🏗️ Architecture and code structure
- 🧪 Development commands and testing
- ⚙️ Chrome extension implementation details
- 🔧 Advanced configuration and debugging
- 🤝 Contributing guidelines
- 📝 Recent updates and version history

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Version:** 2026.10.12.3
**Last Updated:** 2026-10-12

See [CHANGELOG.md](CHANGELOG.md) for release history, or [TECHNICAL.md](TECHNICAL.md) for detailed technical changes.
