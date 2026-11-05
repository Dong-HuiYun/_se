const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true, // 每個測試是獨立的 browser context，localStorage 互不影響
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    headless: true, // 預設無頭；加上 --headed 參數即可看到瀏覽器
    launchOptions: { slowMo: Number(process.env.SLOWMO || 0) }, // 每個動作延遲毫秒數，方便觀看
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node server/index.js",
    url: "http://localhost:3100/api/health",
    env: { PORT: "3100" },
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
