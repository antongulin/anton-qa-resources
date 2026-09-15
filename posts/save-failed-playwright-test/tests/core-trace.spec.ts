import { expect, test } from '@playwright/test';

test('injected first failed checkout save is flaky after one retry', async ({ page }, testInfo) => {
  const firstAttempt = testInfo.retry === 0;
  await page.route('**/api/checkout', async route => {
    if (firstAttempt) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          saved: false,
          message: 'Injected first-attempt save failure',
          evidence: 'synthetic retry fixture',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        saved: true,
        message: 'Saved on retry by synthetic fixture',
        evidence: 'synthetic retry fixture',
      }),
    });
  });

  await page.goto('/');
  await page.getByLabel('Order note').fill('Leave at side door');
  await page.getByRole('button', { name: 'Save checkout' }).click();

  // This assertion intentionally fails on attempt 0. The route behavior is based only on
  // Playwright's retry number, never shared state, time, or randomness.
  await expect(page.getByRole('status')).toHaveText('Saved on retry by synthetic fixture');
});
