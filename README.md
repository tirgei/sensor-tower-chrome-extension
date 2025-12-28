# Sensor Tower App Metrics Chrome Extension

A Chrome extension that displays Sensor Tower app metrics directly on iOS App Store and Google Play Store pages.

## Features

- **Automatic Detection**: Automatically detects when you're viewing an app on the App Store or Play Store
- **Real-time Metrics**: Fetches and displays key app metrics from Sensor Tower API
- **Collapsible Interface**: Compact popup that starts collapsed - click the header to expand/collapse
- **Sticky Position**: Popup stays in the top-right corner while browsing
- **Dark Theme**: Modern dark theme design that's easy on the eyes
- **Quick Links**: Website URL opens in a new tab with one click

## Displayed Metrics

The extension displays the following information for each app:

- **Release Date**: When the app was first released
- **Last Updated**: Most recent update date
- **Downloads (last month)**: Worldwide downloads in the last 30 days
- **Revenue (last month)**: Worldwide revenue in the last 30 days
- **Total Ratings**: Global rating count
- **Website**: Clickable link to the app's website (opens in new tab)

## Installation

### Load as Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `sensor-tower-extension` folder
5. The extension is now installed and active

## Usage

1. Navigate to any iOS App Store page:
   - Example: `https://apps.apple.com/us/app/medicine-tracker-pillzy/id6756069702`
2. Or visit any Google Play Store page:
   - Example: `https://play.google.com/store/apps/details?id=io.carpediemcreations.landmarkidentifier`
3. The Sensor Tower metrics popup will automatically appear in the top-right corner (collapsed by default)
4. Click the header to expand and view all metrics
5. Click the website link to open the app's website in a new tab

## Screenshots

![Extension on App Store page](screenshots/Screenshot%202025-12-28%20at%2023.24.06.png)

*The extension popup showing metrics on an iOS App Store page*

![Extension on Play Store page](screenshots/Screenshot%202025-12-28%20at%2023.25.10.png)

*The extension popup showing metrics on a Google Play Store page*

## How It Works

- The extension uses content scripts to detect App Store and Play Store URLs
- It extracts the app ID (iOS) or package name (Android) from the URL
- Fetches data from Sensor Tower's public API endpoints
- Displays the metrics in a non-intrusive popup overlay

## File Structure

```
sensor-tower-extension/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Background service worker for API calls
├── content.js         # Content script for URL detection & popup rendering
├── styles.css         # Popup styling (dark theme)
└── README.md          # This file
```

## Permissions

The extension requires:
- **activeTab**: To access the current tab's URL
- **Host permissions for app.sensortower.com**: To fetch app metrics data

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## License

This project is provided as-is for personal or commercial use.

