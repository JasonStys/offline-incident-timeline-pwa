# Offline Incident Timeline PWA handbook

By Jason Stys.

Combine exact UTC filters, safe URL state, no-result/export handling and offline restoration; fix owned Lighthouse startup parsing.

Combine exact UTC filters, safe URL state, no-result/export handling and offline restoration; fix owned Lighthouse startup parsing.

Supports reliable field investigation and honest validation without adopting another local server.

## Read the documentation

| Edition                                          | Audience and contents                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [project-guide.docx](reports/project-guide.docx) | User and developer guide: purpose, current usage, design, boundaries and source references. |

The editable Markdown remains the maintenance source. The Word files are readable editions. See [publication identities and review](reports/publications.json) and the [documentation refresh record](reports/documentation-refresh-2026-11-09.md).

## Current usage and help

[README quick start](../README.md) is the entry point. Use the project-specific guides below before changing inputs, operating modes or deployment assumptions.

### Usage and operations

- [OFFLINE OPERATIONS](OFFLINE_OPERATIONS.md)

### Design and contracts

- [ARCHITECTURE](ARCHITECTURE.md)
- [COMPLEXITY](COMPLEXITY.md)
- [DATA CONTRACT](DATA_CONTRACT.md)
- [RESEARCH](RESEARCH.md)
- [adr/0001 framework free local first pwa](adr/0001-framework-free-local-first-pwa.md)

### Security and validation

- [SECURITY](SECURITY.md)
- [TESTING](TESTING.md)

## Historical results and reproduction

The reviewed source is [`b14606df53ff13e21473ad8c3357050bbbc40abc`](https://github.com/JasonStys/offline-incident-timeline-pwa/tree/b14606df53ff13e21473ad8c3357050bbbc40abc). The observed functional workflow baseline is `b14606df53ff13e21473ad8c3357050bbbc40abc`; those observations are recorded at `2026-11-10T05:25:40.628667+00:00`. They do not certify an unrun later revision.

- [Detailed recorded validation](reports/PRACTICAL_WORKFLOWS_2026-11-09.md)
- [Current Actions](https://github.com/JasonStys/offline-incident-timeline-pwa/actions) records later integration checks separately.
- Preserve dated measurements and follow the existing testing guide to reproduce them; a test-source inventory alone does not establish execution.

## Practical boundaries

- Local approved evidence only; no account service, encryption or server upload boundary is added.
- Allowlisted URL filters can reveal investigation terms when shared; they are not confidential storage.
- Offline/cancel emulation cases run only in Chromium; automated Axe/Lighthouse results do not certify screen-reader comprehension.

## Maintaining these editions

Update the editable usage/design/test documents first. Rebuild and visually review every Word page and workbook tab before replacing an edition; verify the exact binary digests and evidence source in publications.json. Keep account data, logs with secrets, installed-app state and private test stores out of documentation. Source and release assets retain their existing security and licensing boundaries.
