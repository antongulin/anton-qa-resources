import { test, expect } from '@playwright/test';
import { assertReducedMotion, variantPath } from './helpers';

test('rendered transition honors the reduced-motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', media: 'screen' });
  await page.goto(variantPath());

  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

  const banner = page.getByTestId('banner');
  const duration = await banner.evaluate(node => parseFloat(getComputedStyle(node).transitionDuration));
  const flag = await page.getByTestId('banner-flag').evaluate(node => getComputedStyle(node, '::after').content);

  assertReducedMotion(duration, flag.replace(/"/g, ''));
});
