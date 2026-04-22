# Release Readiness Checklist

Use this checklist before publishing any extension under `whyEXT`.

## Per-extension release checklist

- [ ] Version updated in `manifest.base.json`
- [ ] Build passes for Chrome and Firefox (`npm run build`)
- [ ] `CHANGELOG.md` includes user-visible changes
- [ ] Permissions reviewed for least privilege
- [ ] Privacy model unchanged (or docs updated if changed)
- [ ] Import/export behavior validated (if extension stores user data)
- [ ] Manual smoke test on latest Chrome and Firefox

## Store policy readiness (Chrome + Firefox)

- [ ] Permission usage clearly explained in extension README
- [ ] No hidden data collection, tracking, or remote code execution
- [ ] Host permissions minimized and justified
- [ ] Description does not imply unsupported security/privacy claims
- [ ] Screenshots/icons prepared for listing
- [ ] Contact/support links available in repository docs
- [ ] Policy-sensitive APIs (network, scripting, cookies) reviewed

## Packaging notes

- Chrome package source: `extensions/<name>/dist/chrome`
- Firefox package source: `extensions/<name>/dist/firefox`
- Keep release artifacts reproducible from repository state.
