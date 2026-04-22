# image-quick-save

Save images quickly with a hover button.

## What it does

- Shows a small download icon on image hover
- Downloads from original `currentSrc` / `src` (no canvas recompression)
- Supports direct download or "Save As" dialog via options
- Works on Chrome-based browsers and Firefox

## Build

```bash
npm run build:image-quick-save
npm run typecheck
```

## Load unpacked

- Chrome/Edge/Brave: load `extensions/image-quick-save/dist/chrome`
- Firefox: load `extensions/image-quick-save/dist/firefox/manifest.json`
