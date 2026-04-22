# <extension-name>

Template extension for `whyEXT`.

## Files

- `src/manifest.base.json`
- `src/manifest.chrome.json`
- `src/manifest.firefox.json`
- `src/background.ts`
- `src/popup.html`
- `src/popup.ts`

## Build scripts checklist

1. Add scripts in root `package.json`:
   - `build:<name>:chrome`
   - `build:<name>:firefox`
   - `build:<name>`
2. Ensure `npm run build` includes `build:<name>`.
3. Add extension docs entry to root `README.md`.
