# Table-cell selection with Playwright

## Purpose

Runnable synthetic examples of Playwright 1.64's `Locator.within()` and per-row selection.

## Ownership

This project owns `table.html`, its tests, configuration, dependency pin, and reader instructions.

## Local Contracts

- Keep this project independently runnable with the pinned `@playwright/test` version and lockfile.
- Use local synthetic HTML through `page.setContent()`. No server, credentials, or production requests.
- Keep the third-cell contract visible: `cells.nth(2).within(rows)` selects once per parent row.
- Compare the global `cells.nth(2)` on the same table in P1.
- Preserve P2's reordered rows, different row lengths, and repeated third-cell value.
- Keep the canonical article link labeled planned until the article is published.

## Work Guidance

Use Playwright's managed `page` fixture so the runner closes browser contexts after each test.
Do not infer speed improvements or claim earlier versions could not select table columns.

## Verification

Run `npm ci`, `npx playwright install chromium`, and `npm run verify` from this directory.
CI installs Chromium with `--with-deps` on Linux. Both P1 and P2 must pass.
Keep the README's selected-cell output consistent with actual test output.

## Child DOX Index

None. This file owns the whole project, including `tests/`.
