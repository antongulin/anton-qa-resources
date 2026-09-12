import { test, expect } from '@playwright/test';

test('Save persists the edited display name after reload', async ({ page }) => {
  const path = process.env.APP_BROKEN === '1' ? '/?broken=1' : '/';
  await page.goto(path);
  // Reset data explicitly, in addition to Playwright's fresh browser context.
  await page.evaluate(() => localStorage.removeItem('displayName'));
  await page.reload();
  await expect(page.getByLabel('Display name')).toHaveValue('Alex');

  await page.getByRole('textbox', { name: 'Display name' }).fill('Sam');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByRole('status')).toHaveText('Saved');
  // The recorder supplies actions. The customer outcome is an authored assertion.
  await page.reload();
  await expect(page.getByLabel('Display name')).toHaveValue('Sam');
  await expect(page.getByTestId('current-name')).toHaveText('Sam');
});

