import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4175', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (process.env.CI ? undefined : '/usr/bin/chromium'), args: ['--no-sandbox'] } },
  webServer: { command: 'npm run dev -- --port 4175', url: 'http://127.0.0.1:4175', reuseExistingServer: false },
  outputDir: 'test-results',
});
