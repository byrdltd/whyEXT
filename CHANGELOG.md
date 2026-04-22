# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Monorepo-friendly extension layout under `extensions/`.
- Generic build script supporting `<extension-name> <target>`.
- Initial `dark-mode` extension for Chrome and Firefox.
- Root roadmap and changelog for public progress tracking.
- GitHub Actions workflow to validate builds on pushes and pull requests.
- Open-source project docs: `LICENSE`, `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, and `DISCLAIMER`.
- GitHub collaboration templates for issues, pull requests, releases, and repo metadata.
- Shared helper package scaffold added under `packages/shared` with unit tests.
- New extension scaffold flow added with `extensions/_template` and `npm run scaffold:extension`.
- Release readiness checklist added for per-extension publishing and store policy checks.
- Automated test pipeline expanded with unit tests and build smoke checks.

### Changed

- Shifted product direction to simple utility extensions, starting with `dark-mode`.
