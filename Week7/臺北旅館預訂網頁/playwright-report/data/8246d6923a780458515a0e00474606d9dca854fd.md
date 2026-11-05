# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: room.spec.js >> 已知問題（用 test.fail 記錄；修好後 Playwright 會提示「預期失敗卻通過」，屆時移除標記即可） >> 選了家庭套房後修改日期，價格應維持家庭套房的房價
- Location: tests\e2e\room.spec.js:140:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#summaryRoomPrice')
Expected: "TWD 12,114"
Received: "TWD 7,370"
Timeout:  7000ms

Call log:
  - Expect "toHaveText" locator('#summaryRoomPrice') with timeout 7000ms
  - waiting for locator('#summaryRoomPrice')
    18 × locator resolved to <span id="summaryRoomPrice">TWD 7,370</span>
       - unexpected value "TWD 7,370"

```

```yaml
- text: TWD 7,370
```