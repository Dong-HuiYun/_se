// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 3100;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,                 // 無頭瀏覽器
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // 測試前自動啟動後端（同時提供前端靜態檔案與 /api）
  webServer: {
    command: 'node server/server.js',
    url: `http://localhost:${PORT}/api/health`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
