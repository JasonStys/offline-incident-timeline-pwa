# Security policy

## Supported version

The current `main` branch is supported for security fixes. This is a local-first demonstration application, not a hosted incident-management service.

## Reporting

Do not publish exploit details or real incident data in a public issue. Report a vulnerability privately through GitHub's security-advisory workflow for this repository. Include the affected commit, browser, reproduction steps using synthetic data, expected behavior, and observed behavior.

## Data policy

Use synthetic or explicitly approved records only. The application intentionally has no upload endpoint, authentication, telemetry, third-party analytics, or remote persistence. Imported records remain in the current browser profile's IndexedDB and generated exports remain local unless the user shares them.

## Security controls

- Bounded file size, record count, strings, identifiers, and metadata.
- Parsed content is rendered through `textContent` and DOM construction, never dynamic HTML.
- No dynamic code evaluation.
- Versioned worker message validation.
- Atomic database replacement after successful validation.
- Persisted-record revalidation during startup.
- Formula-injection mitigation in CSV exports.
- Same-origin-only runtime caching with a fixed cache bound.
- Lockfile installation, dependency audit, Dependabot, dependency review, CodeQL, and pinned Actions.

Threats, boundaries, residual risks, and controls are detailed in [docs/SECURITY.md](docs/SECURITY.md).
