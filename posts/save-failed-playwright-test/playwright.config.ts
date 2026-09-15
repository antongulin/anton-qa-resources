import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4191',
    headless: true,
  },
  expect: { timeout: 1_000 },
  webServer: {
    command: 'node server.ts',
    url: 'http://127.0.0.1:4191/__health',
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'on-first-retry',
      testMatch: /core-trace\.spec\.ts/,
      retries: 1,
      use: { trace: 'on-first-retry' },
    },
    {
      name: 'retain-on-failure',
      testMatch: /core-trace\.spec\.ts/,
      retries: 1,
      use: { trace: 'retain-on-failure' },
    },
    {
      name: 'companions',
      testMatch: /companions\.spec\.ts/,
      retries: 0,
      use: { trace: 'off' },
    },
  ],
});
