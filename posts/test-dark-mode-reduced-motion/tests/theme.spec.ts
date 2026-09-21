import { test, expect } from '@playwright/test';
import { assertDarkTheme, variantPath } from './helpers';

test('rendered card colors follow the dark color scheme preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', media: 'screen' });
  await page.goto(variantPath());

  // Confirm the emulation flag itself is active so a failure means the CSS did
  // not apply, not that the emulation was dropped.
  expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(true);

  const card = page.getByTestId('card');
  const surface = await card.evaluate(node => getComputedStyle(node).backgroundColor);
  const text = await card.evaluate(node => getComputedStyle(node).color);
  const accent = await card.evaluate(node => getComputedStyle(node).borderTopColor);

  // The rendered values must be the dark tokens, not just "some dark color".
  // Assert the reasoned color contract first so a failure names the defect and
  // the light value actually rendered.
  assertDarkTheme(surface, text, accent);
  expect({ surface, text, accent }).toEqual({
    surface: 'rgb(16, 20, 24)',
    text: 'rgb(244, 246, 248)',
    accent: 'rgb(138, 180, 248)',
  });
});
