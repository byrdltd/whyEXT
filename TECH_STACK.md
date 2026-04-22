# whyEXT Tech Stack

## Stack decision

This repository uses a two-phase strategy:

1. Keep the current JavaScript baseline running for fast iteration.
2. Move to a future-proof baseline early in implementation (not at the very end).

## Current baseline (implemented)

- Runtime: Manifest V3 (Chrome + Firefox compatible)
- Language: TypeScript
- UI: HTML + CSS + vanilla TS
- Build: Node build orchestrator + TypeScript compiler (`scripts/build.js`)
- Testing: Vitest (unit) + build smoke checks
- Shared groundwork: `packages/shared` helpers + extension scaffold template

## Next hardening steps

- Build tool standardization with Vite
- Browser API compatibility layer with `webextension-polyfill`
- Runtime schema validation with `zod`
- Full quality gates with ESLint + Prettier

## Why this stack

- Strong typing reduces breakage as rule models grow.
- Polyfill keeps cross-browser API behavior consistent.
- Runtime validation protects import/export and migrations.
- Vite speeds up local development and future extension scaffolding.

## Migration guardrails

- No telemetry libraries.
- No mandatory backend dependency.
- Keep permission surface minimal during migration.
- Migrate incrementally: shared data/rule layer first, UI surfaces second.
