import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4187', headless: true },
  expect: { timeout: 1000 },
  webServer: {
    command: 'node server.ts',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
  },
});

