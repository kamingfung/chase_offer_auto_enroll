# Chase Offer Adder

> **Automate Chase Offers with ease!** Stop clicking endlessly and save time by automatically adding Chase Offers across all your credit cards.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Updated](https://img.shields.io/badge/Last%20Updated-October%202025-blue)]()

## 🚀 Quick Start

1. **Install** the extension (see [Installation](#installation) below)
2. **Navigate** to your Chase Offers page
3. **Click** the extension icon and hit "Add offers"
4. **Sit back** and watch it work automatically!

## 📋 Table of Contents

- [Overview](#overview)
- [Logic Flow Chart](#logic-flow-chart)
- [Features](#features)
- [Installation](#installation)
- [How to Use](#how-to-use)
- [Screenshots](#screenshots)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
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

1. 🔍 **Scans** both carousel (featured) and grid (all offers) sections for available "Add to Card" buttons
2. 🖱️ **Clicks** each button automatically with retry logic
3. 🔄 **Switches between tabs** if multiple page tabs exist
4. 🔄 **Switches accounts** when all offers/tabs are complete
5. 📊 **Updates status** in real-time
6. ⏸️ **Pause/resume** controls for full user control

## 📊 Logic Flow Chart

Here is the logic flow chart for the automation script:

```mermaid
graph TD
    Start([Start Extension]) --> Inject[Inject Script on Tab]
    Inject --> Init[Init state: currentAccountIndex = selected option or 0]
    Init --> ScrollTop[Scroll to top, wait 1s]
    ScrollTop --> CallLoop[Invoke addNextItem]

    subgraph addNextItem [addNextItem Function]
        CheckPause{Is paused?} -- Yes --> WaitResume[Wait for resume]
        WaitResume --> CheckPause
        CheckPause -- No --> CheckDetailHash{URL hash includes<br>'offer-activated' or '/detail'?}

        CheckDetailHash -- Yes --> BackNav[Go back in history:<br>window.history.back]
        BackNav --> WaitSettle1[Wait 1.5s]
        WaitSettle1 --> RecurseBack[Recurse addNextItem]

        CheckDetailHash -- No --> FindButtons[Query all addButtons]
        FindButtons --> FilterButtons[Filter: check visibility, skip checkmarks/success, skip processed]
        FilterButtons --> HasButtons{Any buttons left?}

        HasButtons -- Yes --> PickFirst[Pick first button]
        PickFirst --> ScrollInView[Scroll button to viewport]
        ScrollInView --> MarkProcessed[Mark offer as processed]
        MarkProcessed --> ClickButton[safeClick parentButton or SVG]
        ClickButton --> UpdateStats[Update status & counters]
        UpdateStats --> WaitSettle2[Wait 1.5s delay]
        WaitSettle2 --> RecurseNext[Recurse addNextItem]

        HasButtons -- No --> CheckLoading{Page loading?<br>skeletons / aria-busy}
        CheckLoading -- Yes --> ResetRetry[Reset retryCount = 0]
        ResetRetry --> WaitRetry[Wait 2s retryDelay]
        WaitRetry --> RecurseRetry[Recurse addNextItem]

        CheckLoading -- No --> CheckRetryLimit{retryCount < 5?}
        CheckRetryLimit -- Yes --> IncRetry[Increment retryCount]
        IncRetry --> WaitRetry

        CheckRetryLimit -- No --> SwitchAcc[Invoke switchToNextAccount]
    end

    subgraph switchToNextAccount [switchToNextAccount Function]
        SwitchAcc --> FindCombobox{Combobox found?}
        FindCombobox -- No --> Complete[Complete automation]
        FindCombobox -- Yes --> ClickCombo[safeClick combobox]
        ClickCombo --> WaitMenu[Wait 500ms for dropdown menu]
        WaitMenu --> QueryOptions[Re-query freshOptionsList options]
        QueryOptions --> HasNextAcc{nextIndex < options.length?}

        HasNextAcc -- No --> CloseCombo[safeClick combobox to close]
        CloseCombo --> Complete

        HasNextAcc -- Yes --> SelectOption[safeClick next option]
        SelectOption --> SetPoll[Poll URL hash for 2s every 100ms]
        SetPoll --> CheckOverview{Has redirected to overview?}
        CheckOverview -- Yes --> CorrectHash[Set hash back to offers hub<br>with or without accountId]
        CheckOverview -- No --> KeepWaiting[Keep polling / wait]
        CorrectHash --> SwitchSettle[Wait 2.5s for account switch]
        KeepWaiting --> SwitchSettle

        SwitchSettle --> ResetState[Clear processed set, reset counters]
        ResetState --> RecurseAcc[Recurse addNextItem]
    end

    Complete --> Notify[Display completed stats & send notification]
```

## ✨ Features

- **🎯 Smart Button Detection**: Automatically finds and clicks "Add to Card" buttons in all page sections
- **📑 Multi-Section Support**: Processes both carousel (featured) and grid (all offers) sections automatically
- **📑 Multi-Tab Support**: Detects and cycles through page tabs if they exist
- **🔄 Multi-Account Support**: Processes offers across all your credit card accounts
- **✅ Smart Filtering**: Skips offers already added (with checkmark icons)
- **⏸️ Pause/Resume Controls**: Stop and continue the process at any time
- **🔁 Enhanced Retry Logic**: 5-retry mechanism with smart loading detection for maximum reliability
- **📊 Real-time Status**: Live updates on progress, tab switching, and account switching
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
A: Yes, the extension only interacts with Chase's website and doesn't collect personal information.

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

**Version:** 1.1.0
**Last Updated:** October 2025

### What's New in v1.1

- ✨ Enhanced retry mechanism (5 retries with smart loading detection)
- ✨ Automatic scrolling for off-screen buttons
- ✨ Improved reliability with better page loading detection
- ✨ Section-aware processing (carousel + grid)
- ✨ Optimized timing for faster, more reliable automation

See [TECHNICAL.md](TECHNICAL.md) for detailed technical changes.
