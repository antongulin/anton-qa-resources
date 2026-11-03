import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, baseURL }, testInfo) => {
  const role = testInfo.title.startsWith('writer') ? 'writer' : 'reader';
  const account = JSON.parse(process.env.DEMO_ACCOUNTS)[role];
  await context.addCookies([{ name: 'demo-account', value: account, url: baseURL }]);
  await context.setExtraHTTPHeaders({ 'x-demo-role': role });
});

async function boundary(page, path, method = 'GET') {
  const response = await page.request.fetch(`/__demo/${path}`, { method, timeout: 12_000 });
  expect(response.ok(), `Coordination ${path} completed`).toBe(true);
  return response.json();
}

async function observe(page, context, role, initial, first, reload, save) {
  return {
    role,
    account: (await context.cookies()).find(cookie => cookie.name === 'demo-account').value,
    initial,
    value: await page.getByLabel('Email alerts').inputValue(),
    probe: await page.evaluate(() => localStorage.getItem('context-probe')),
    initialSeq: Number(first.headers()['x-demo-sequence']),
    reloadSeq: Number(reload.headers()['x-demo-sequence']),
    ...(save ? { save } : {}),
  };
}

test('writer saves Off', async ({ page, context }, testInfo) => {
  const first = await page.goto('/settings');
  const initial = await page.getByLabel('Email alerts').inputValue();
  expect(initial).toBe('On');
  await page.evaluate(() => localStorage.setItem('context-probe', 'writer'));
  await boundary(page, 'wait-reader');
  await page.getByLabel('Email alerts').selectOption('Off');
  const savedResponse = page.waitForResponse(response => response.url().endsWith('/api/settings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const response = await savedResponse;
  expect(response.ok()).toBe(true);
  const save = await response.json();
  const reload = await page.reload();
  const observation = await observe(page, context, 'writer', initial, first, reload, save);
  expect(observation.value, 'Writer saved value survives reload').toBe('Off');
  expect(observation.probe, 'Writer context keeps its own storage').toBe('writer');
  await boundary(page, 'writer-saved', 'POST');
  await testInfo.attach('observation', { body: JSON.stringify(observation), contentType: 'application/json' });
});

test('reader keeps On', async ({ page, context }, testInfo) => {
  const first = await page.goto('/settings');
  const initial = await page.getByLabel('Email alerts').inputValue();
  expect(initial).toBe('On');
  await page.evaluate(() => localStorage.setItem('context-probe', 'reader'));
  await boundary(page, 'reader-ready', 'POST');
  await boundary(page, 'wait-saved');
  const reload = await page.reload();
  const observation = await observe(page, context, 'reader', initial, first, reload);
  await testInfo.attach('observation', { body: JSON.stringify(observation), contentType: 'application/json' });
  expect(observation.probe, 'Reader context keeps its own storage').toBe('reader');
  expect(observation.value, 'Reader account remains On after reload').toBe('On');
});
