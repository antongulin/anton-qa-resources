import { expect, test } from '@playwright/test';

async function resetPaymentCount(page: import('@playwright/test').Page) {
  await page.request.post('/__reset-payment-count');
}

async function paymentCount(page: import('@playwright/test').Page) {
  return (await page.request.get('/__payment-count')).json() as Promise<{ paymentRequestCount: number }>;
}

test('route.fulfill shows a synthetic payment error without contacting the local service', async ({ page }) => {
  await resetPaymentCount(page);
  await page.route('**/api/payment', route => route.fulfill({
    status: 402,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Synthetic payment error' }),
  }));
  await page.goto('/payment');
  await page.getByRole('button', { name: 'Submit synthetic payment' }).click();

  await expect(page.getByRole('status')).toHaveText('Synthetic payment error');
  expect((await paymentCount(page)).paymentRequestCount).toBe(0);
});

test('route.fetch returns the same synthetic payment error after exactly one local request', async ({ page }) => {
  await resetPaymentCount(page);
  await page.route('**/api/payment', async route => {
    const localResponse = await route.fetch();
    await route.fulfill({
      response: localResponse,
      status: 402,
      json: { message: 'Synthetic payment error' },
    });
  });
  await page.goto('/payment');
  await page.getByRole('button', { name: 'Submit synthetic payment' }).click();

  await expect(page.getByRole('status')).toHaveText('Synthetic payment error');
  expect((await paymentCount(page)).paymentRequestCount).toBe(1);
});

test('browser clock reaches the timeout screen at the 300000ms boundary', async ({ page }) => {
  const knownStart = new Date('2026-01-02T03:04:05.000Z');
  // Install before navigation so page time APIs are controlled before the timeout starts.
  await page.clock.install({ time: new Date(knownStart.getTime() - 10_000) });
  await page.goto('/timeout');
  await page.clock.pauseAt(knownStart);
  await page.getByRole('button', { name: 'Start local timeout' }).click();

  await page.clock.runFor(299_999);
  await expect(page.getByTestId('session-state')).toHaveText('Signed in');
  await page.clock.runFor(1);
  await expect(page.getByTestId('session-state')).toHaveText('Timed out');
});
