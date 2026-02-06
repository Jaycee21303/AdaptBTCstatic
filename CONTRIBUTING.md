# Contributing

## Structure guidance

When adding new files, follow the existing layout:

- Root: route pages and deployment metadata (`CNAME`, `sitemap.xml`).
- `education/`: educational topic pages.
- `tools/<tool-name>/`: self-contained tools with local assets.
- `assets/`: shared static assets and shared data files.

## Naming guidance

- Use lowercase file names with hyphens for new pages (example: `bitcoin-history.html`).
- Prefer descriptive directory names over abbreviations.

## Pre-commit checklist

- Verify links between pages still work.
- Verify any new assets use relative paths that match deployment from repo root.
- If adding a new top-level page, include it in navigation and sitemap where relevant.
