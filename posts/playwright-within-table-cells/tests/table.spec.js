import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

test('P1: select the third cell within each row, compared with global nth', async ({ page }) => {
  await page.setContent(readFileSync(new URL('../table.html', import.meta.url), 'utf8'));

  const rows = page.locator('tbody').getByRole('row');
  const cells = page.getByRole('cell');
  const thirdInEachRow = cells.nth(2).within(rows);
  const thirdInTable = cells.nth(2);

  await expect(rows).toHaveCount(3);
  await expect(thirdInEachRow).toHaveCount(3);
  await expect(thirdInEachRow).toHaveText(['Apricot', 'Blueberry', 'Coconut']);
  await expect(thirdInTable).toHaveCount(1);
  await expect(thirdInTable).toHaveText('Apricot');

  console.log(`within each row: ${JSON.stringify(await thirdInEachRow.allTextContents())}`);
  console.log(`global nth(2): ${JSON.stringify(await thirdInTable.allTextContents())}`);
});

test('P2: keep per-row positions with uneven rows and repeated values', async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html lang="en"><meta charset="utf-8"><title>Varied synthetic stock</title>
    <table><caption>Varied synthetic stock</caption><tbody>
      <tr><td>T-303</td><td>East</td><td>Coconut</td><td>Overflow C</td><td>Ready</td></tr>
      <tr><td>T-101</td><td>North</td><td>Apricot</td></tr>
      <tr><td>T-202</td><td>West</td><td>Coconut</td><td>Overflow B</td></tr>
    </tbody></table></html>
  `);

  const rows = page.locator('tbody').getByRole('row');
  const thirdInEachRow = page.getByRole('cell').nth(2).within(rows);

  await expect(rows).toHaveCount(3);
  await expect(thirdInEachRow).toHaveCount(3);
  await expect(thirdInEachRow).toHaveText(['Coconut', 'Apricot', 'Coconut']);

  console.log(`varied rows: ${JSON.stringify(await thirdInEachRow.allTextContents())}`);
});
