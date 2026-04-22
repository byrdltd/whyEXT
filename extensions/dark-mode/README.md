# dark-mode

Simple per-domain dark mode toggle extension.

## What it does

- Detects the active domain in popup
- Enables/disables dark mode per domain
- Stores enabled domains locally (`chrome.storage.local`)
- Provides options page to inspect and clear enabled domains

## Build

```bash
npm run build:dark-mode
npm run typecheck
```

## Load unpacked

- Chrome/Edge/Brave: load `extensions/dark-mode/dist/chrome`
- Firefox: load `extensions/dark-mode/dist/firefox/manifest.json`
