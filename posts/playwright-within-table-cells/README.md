# Select the third cell in each table row

Use Playwright 1.64's `within()` to resolve `nth(2)` inside each parent row.

Planned article for October 21, 2026:
[Playwright within table cells](https://www.anton.qa/blog/posts/playwright-within-table-cells).
The article link may not be live yet.

## Run it

Use Node.js 24 and npm. This project pins `@playwright/test` to `1.64.1`.

From the repository root:

```bash
cd posts/playwright-within-table-cells
npm ci
npx playwright install chromium
npm run verify
```

On Linux, use `npx playwright install --with-deps chromium` if browser system packages are missing.

## Compare the selections

[`table.html`](table.html) contains three synthetic stock rows:

| SKU | Bin | Item |
| --- | --- | --- |
| T-101 | North | Apricot |
| T-202 | West | Blueberry |
| T-303 | East | Coconut |

The first test loads that HTML with `page.setContent()`, then runs both selections:

```js
const rows = page.locator('tbody').getByRole('row');
const cells = page.getByRole('cell');

const thirdInEachRow = cells.nth(2).within(rows);
await expect(thirdInEachRow).toHaveText(['Apricot', 'Blueberry', 'Coconut']);

const thirdInTable = cells.nth(2);
await expect(thirdInTable).toHaveText('Apricot');
```

`nth()` uses a zero-based index, so `nth(2)` means the third matching cell.
With `within(rows)`, Playwright resolves that index separately for each matched row.
The global selection returns one cell across the table.
The `tbody` scope excludes the header row.

The full runnable tests are in [`tests/table.spec.js`](tests/table.spec.js).
P1 checks the three per-row values and the single global value on the same table.
P2 reorders the rows, uses five, three, and four cells, and repeats `Coconut`.
It checks that selection still follows each row's third cell in document order.

The tests print these selected-cell values and finish with two passing tests:

```text
within each row: ["Apricot","Blueberry","Coconut"]
global nth(2): ["Apricot"]
varied rows: ["Coconut","Apricot","Coconut"]
```

## Local effects and limits

All table data is synthetic. The tests use local HTML and make no application network requests.
Playwright manages and closes the page and browser fixtures.
Installation creates `node_modules/` and downloads Chromium into Playwright's local browser cache.
The runner may write ignored `test-results/` files.

These checks cover Chromium and rows that each have at least three ordinary cells.
They do not cover merged cells or measure performance.
Earlier versions could select columns through other locator patterns.
This example demonstrates the per-parent relative selection added in 1.64.

See the official [`Locator.within()` documentation](https://playwright.dev/docs/api/class-locator#locator-within)
and [Playwright 1.64 release notes](https://playwright.dev/docs/release-notes#version-164).
