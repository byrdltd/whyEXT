# Security Policy

## Reporting a Vulnerability

If you discover a security issue in whyEXT, report it privately via:

- [GitHub Security Advisories](https://github.com/byrdltd/whyEXT/security/advisories/new)

Please do **not** open public issues for vulnerabilities.

## In scope

Examples of issues that should be reported:

- Privilege misuse in extension scripts
- Sensitive data leakage via logs, storage, or network requests
- Unsafe handling of extension messages
- Injection opportunities (DOM/script injection)
- Supply-chain/dependency vulnerabilities in runtime tooling

## Out of scope

- Generic browser bugs not caused by this project
- Social engineering scenarios without a project defect
- Vulnerabilities in third-party services unrelated to whyEXT code

## Responsible disclosure

Please include:

- Affected files/components
- Reproduction steps
- Impact assessment
- Proof of concept (if available)

We will investigate and coordinate a fix before public disclosure.

## Supported versions

Only the latest `main` branch is guaranteed to receive security fixes during
early development.
