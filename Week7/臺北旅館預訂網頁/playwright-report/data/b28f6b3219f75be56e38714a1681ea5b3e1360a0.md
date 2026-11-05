# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-hotels.spec.js >> 跨旅館 >> 願望清單各旅館應該獨立（目前全部共用同一個 localStorage 鍵）
- Location: tests\e2e\all-hotels.spec.js:131:3

# Error details

```
Error: expect(locator).not.toContainText(expected) failed

Locator: locator('#wishlistBtn')
Expected substring: not "已加入願望清單"
Received string: " 已加入願望清單"
Timeout: 7000ms

Call log:
  - Expect "not toContainText" locator('#wishlistBtn') with timeout 7000ms
  - waiting for locator('#wishlistBtn')
    17 × locator resolved to <button id="wishlistBtn" class="btn btn-secondary">…</button>
       - unexpected value " 已加入願望清單"

```

```yaml
- button "已加入願望清單"
```