import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node tests/e2e/start-backend.mjs', url: 'http://127.0.0.1:18766/api/health', timeout: 120000, reuseExistingServer: false },
    { command: 'npm run dev -- --hostname 127.0.0.1 --port 3101', url: 'http://127.0.0.1:3101/api/backend-health', timeout: 120000, reuseExistingServer: false, env: { LARAVEL_API_URL: 'http://127.0.0.1:18766', NEXT_BUILD_DIR: '.next-e2e' } },
  ],
});
