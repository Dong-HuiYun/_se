'use strict';
const base = require('@playwright/test');

/**
 * 共用 fixture：擋掉外部 CDN（Font Awesome、Leaflet、地圖圖磚），
 * 讓測試不依賴網路、速度快且結果穩定。頁面功能（按鈕、表單、聊天…）不受影響。
 */
const test = base.test.extend({
  page: async ({ page }, use) => {
    await page.route(/(cdnjs\.cloudflare\.com|unpkg\.com|openstreetmap\.org)/, (route) => route.abort());
    await use(page);
  },
});

module.exports = { test, expect: base.expect };
