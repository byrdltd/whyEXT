# whyEXT Product Context

## Mission

whyEXT is a public, open-source umbrella repository for multiple browser
extensions. Each extension lives under `extensions/<name>/` and can be developed,
tested, and published independently.

## Current product direction

The active extension is `dark-mode`, focused on one clear job:

- Toggle dark mode per domain from popup
- Keep domain preferences local to the browser profile
- Offer simple options to inspect/clear saved domains

## Non-negotiable principles

1. Privacy-first by design
   - No telemetry by default
   - No hidden outbound requests
   - Local-only storage unless user explicitly exports data
2. Minimal permissions
   - Ask only what a feature needs
   - Prefer optional host permissions over broad defaults
3. Transparent architecture
   - Simple manifests
   - Inspectable source
   - Clear docs for permissions and data behavior

## Repository architecture

- `extensions/<name>/src`: extension source files
- `extensions/<name>/dist`: generated build output
- `scripts/build.js`: generic builder for per-extension browser targets
- Root docs: governance, security, roadmap, and sprint planning

## Technology direction

Future-proof stack is tracked in `TECH_STACK.md`.

Short version:

- Keep MV3 as runtime base.
- Migrate to TypeScript + Vite + `webextension-polyfill`.
- Use schema validation for rule data and import/export safety.

## Dark-mode scope boundary (v1)

In scope:

- Domain-level enable/disable dark mode
- Popup quick toggle for current domain
- Options list/clear for enabled domains

Out of scope:

- Cloud sync
- Telemetry pipeline
- Rule marketplace
- Complex automation engines
