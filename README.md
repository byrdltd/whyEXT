# whyEXT

Multi-extension monorepo for cross-browser extensions.

## About

whyEXT is a local-first, privacy-first monorepo for browser extensions.
Each extension is developed as an independent module under `extensions/<name>`,
with shared build tooling, docs, and release workflow in one repository.

Design goals:

- Ship focused utilities that solve one job well
- Keep permissions minimal and behavior transparent
- Support both Chrome-based browsers and Firefox from the same codebase

## Project tracking

- Product context: `PRODUCT_CONTEXT.md`
- Tech stack decision: `TECH_STACK.md`
- Roadmap: `ROADMAP.md`
- Change history: `CHANGELOG.md`
- Contributing guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Disclaimer: `DISCLAIMER.md`
- License: `LICENSE`
- Release readiness: `RELEASE_CHECKLIST.md`

## Documentation index

- Main guide: `README.md`
- Product context: `PRODUCT_CONTEXT.md`
- Tech stack decision: `TECH_STACK.md`
- Roadmap: `ROADMAP.md`
- Changelog: `CHANGELOG.md`
- Contributing: `CONTRIBUTING.md`
- Security: `SECURITY.md`
- Code of Conduct: `CODE_OF_CONDUCT.md`
- Disclaimer: `DISCLAIMER.md`
- License: `LICENSE`
- Release readiness: `RELEASE_CHECKLIST.md`
- Extension docs: `extensions/dark-mode/README.md`
- Extension docs: `extensions/image-quick-save/README.md`
- Extension docs: `extensions/youtube-subbar/README.md`
- Extension template: `extensions/_template/README.md`
- Shared package docs: `packages/shared/README.md`
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- Issue template (bug): `.github/ISSUE_TEMPLATE/bug_report.md`
- Issue template (feature): `.github/ISSUE_TEMPLATE/feature_request.md`
- Release notes template: `.github/RELEASE_NOTES_TEMPLATE.md`

## Repository layout

- `extensions/<extension-name>/src`: source files
- `extensions/<extension-name>/dist`: build output
- `extensions/_template`: starter template for new extensions
- `packages/shared`: common helpers/types for multi-extension reuse
- `scripts/build.js`: generic builder for Chrome and Firefox

Current extensions:

- `extensions/dark-mode`: simple per-domain dark mode toggle
- `extensions/image-quick-save`: hover-to-save images quickly
- `extensions/youtube-subbar`: enhanced horizontal subscriptions bar for YouTube

## Usage

```bash
npm run build
```

Per-extension commands:

```bash
npm run build:dark-mode
npm run build:dark-mode:chrome
npm run build:dark-mode:firefox
npm run build:image-quick-save
npm run build:image-quick-save:chrome
npm run build:image-quick-save:firefox
npm run build:youtube-subbar
npm run build:youtube-subbar:chrome
npm run build:youtube-subbar:firefox
npm run typecheck
npm run test
```

Scaffold a new extension:

```bash
npm run scaffold:extension -- my-extension
```

### Load in Chrome / Brave / Edge

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select one extension folder:
   - `extensions/dark-mode/dist/chrome`
   - `extensions/image-quick-save/dist/chrome`
   - `extensions/youtube-subbar/dist/chrome`

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select one extension manifest:
   - `extensions/dark-mode/dist/firefox/manifest.json`
   - `extensions/image-quick-save/dist/firefox/manifest.json`
   - `extensions/youtube-subbar/dist/firefox/manifest.json`

## Notes

- This repo is optimized for local-first development.
- End users install only the specific extension folder they need.
- Each extension can later be published independently to stores.
