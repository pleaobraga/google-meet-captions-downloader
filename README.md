# 🎯 Google Meet Captions Downloader

A Chrome extension that allows you to download transcripts from Google Meet sessions as text files.

## 🚀 Features

- Automatically enables captions when you join a meeting
- Prevents the captions button from being toggled off accidentally
- Saves meeting transcriptions in local storage for later access
- Download transcripts in real-time as text files
- Manage saved meetings: download or delete previous transcripts anytime
- Easy-to-use popup interface
- Works with any Google Meet session

## 🛠️ Built With

- **React** - UI library for building the extension interface
- **Vite** - Next generation frontend tooling
- **TailwindCSS** - Utility-first CSS framework
- **TypeScript** - Static typing for JavaScript
- **Chrome Extension APIs** - For browser integration

> This project was bootstrapped with [vite-react-template](https://github.com/pleaobraga/vite-react-template)

## 💡 Usage

![Extension Demo](docs/media/extension-working.gif)

Follow these steps to use the extension:

1. Join any Google Meet session through your web browser
2. The extension will automatically turn on captions (CC icon) when you enter the meeting room
   - The CC button will be disabled to prevent captions from being turned off accidentally
3. To save or manage transcripts:
   - Click on the extension icon in your browser toolbar
   - You can download the current meeting’s transcript, or view/download/delete previous saved ones
4. Saved transcripts are stored in local storage until you delete them

> **Note:** Captions must be available in Google Meet for the extension to work properly.

## 📥 Installation

### For Development

1. Clone the repository:

```bash
git clone https://github.com/your-username/google-meet-captions-downloader.git
cd google-meet-captions-downloader
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the extension:

```bash
pnpm build
```

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `dist` folder from your project directory

## 🔄 Updating the Extension

When making changes to the extension:

1. Make your code changes
2. Run the build command:

```bash
pnpm build
```

3. Go to `chrome://extensions/`
4. Click the refresh icon on your extension's card

## 👤 Author

**[pleaobraga](https://github.com/pleaobraga)**

---

> **Note:** This extension requires permission to access Google Meet tabs and download files. All processing is done locally in your browser.
