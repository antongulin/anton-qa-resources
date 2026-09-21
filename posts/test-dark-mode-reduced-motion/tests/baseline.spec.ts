import { test, expect } from '@playwright/test';
import { variantPath } from './helpers';

test('default light rendering is the untouched baseline', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference', media: 'screen' });
  await page.goto(variantPath());

  expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(false);

  const card = page.getByTestId('card');
  const surface = await card.evaluate(node => getComputedStyle(node).backgroundColor);
  const text = await card.evaluate(node => getComputedStyle(node).color);
  const duration = await page
    .getByTestId('banner')
    .evaluate(node => parseFloat(getComputedStyle(node).transitionDuration));

  // Light is the product default and must stay light with normal motion.
  expect(surface).toBe('rgb(255, 255, 255)');
  expect(text).toBe('rgb(23, 23, 23)');
  expect(duration).toBeGreaterThan(0);
});
