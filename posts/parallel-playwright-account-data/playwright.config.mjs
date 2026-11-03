import { defineConfig } from '@playwright/test';

if (!process.env.DEMO_URL || !process.env.DEMO_RUN_DIR) throw new Error('Run npm run demo -- <scenario> or npm run verify.');
if (process.env.PW_TEST_REUSE_CONTEXT || process.env.PW_TEST_CONNECT_WS_ENDPOINT) throw new Error('Context reuse and remote browsers are unsupported in this isolation demonstration.');

export default defineConfig({
  testDir: './tests',
  testMatch: 'accounts.spec.js',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: `${process.env.DEMO_RUN_DIR}/test-results`,
  reporter: [['json', { outputFile: `${process.env.DEMO_RUN_DIR}/report.json` }]],
  use: { baseURL: process.env.DEMO_URL, headless: true, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
