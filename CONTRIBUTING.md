# Contributing to whyEXT

Thanks for your interest in contributing.

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Scope of contributions

whyEXT is a monorepo for multiple browser extensions. Contributions are welcome
for:

- New extensions under `extensions/<name>/`
- Improvements to existing extensions
- Build tooling, DX, and documentation
- Testing and release workflow improvements

## Repository layout

- `extensions/<extension-name>/src`: extension source files
- `extensions/<extension-name>/dist`: generated build artifacts (ignored)
- `scripts/build.js`: per-extension build utility

## Development setup

```bash
git clone https://github.com/byrdltd/whyEXT.git
cd whyEXT
npm install
```

## Build and local testing

```bash
# Build all extensions
npm run build

# Run type checking
npm run typecheck

# Run unit + build smoke tests
npm run test

# Build one extension for both browsers
npm run build:dark-mode
```

Then load unpacked:

- Chrome/Edge/Brave: `chrome://extensions` -> Load unpacked -> `extensions/<name>/dist/chrome`
- Firefox: `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> `extensions/<name>/dist/firefox/manifest.json`

## Adding a new extension

1. Create `extensions/<new-name>/src/`
2. Add:
   - `manifest.base.json`
   - `manifest.chrome.json`
   - `manifest.firefox.json`
   - source files (`popup`, `background`, `options`, etc.)
3. Add scripts in root `package.json`:
   - `build:<new-name>:chrome`
   - `build:<new-name>:firefox`
   - `build:<new-name>`
4. Update `README.md` with installation instructions
5. Optionally scaffold from template:
   ```bash
   npm run scaffold:extension -- <new-name>
   ```

## Pull request guidelines

- Keep PRs focused and small when possible
- Explain permission changes and why they are needed
- Update docs for user-visible behavior changes
- Run `npm run build` before opening PR
- Use clear commit messages that explain "why"

## Security reporting

Do not open public issues for security vulnerabilities. Use
[GitHub Security Advisories](https://github.com/byrdltd/whyEXT/security/advisories/new)
and review [SECURITY.md](SECURITY.md).

## License

By contributing, you agree your contributions are licensed under [MIT](LICENSE).
