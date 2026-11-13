# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-hotels.spec.js >> C3 台北德立莊酒店 >> AI 聊天 >> 詢問「位置」時，回答的是自己這間旅館
- Location: tests\e2e\all-hotels.spec.js:119:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#chatMessages .ai-message').last()
Expected: "台北德立莊酒店位於台北市中正區寶慶路4號。您可以在頁面的位置周邊區塊查看詳細地圖和周邊資訊。"
Received: "飯店位於西門町中心，交通便利，周邊有豐富的購物和餐飲選擇。您可以在「位置周邊」區塊查看詳細地圖和周邊資訊。"
Timeout:  7000ms

Call log:
  - Expect "toHaveText" locator('#chatMessages .ai-message').last() with timeout 7000ms
  - waiting for locator('#chatMessages .ai-message').last()
    6 × locator resolved to <div class="ai-message">↵                您好！我是您的AI助手，有什麼可以幫助您的嗎？↵        …</div>
      - unexpected value "
                您好！我是您的AI助手，有什麼可以幫助您的嗎？
            "
    12 × locator resolved to <div class="ai-message">飯店位於西門町中心，交通便利，周邊有豐富的購物和餐飲選擇。您可以在「位置周邊」區塊查看詳細地圖和周…</div>
       - unexpected value "飯店位於西門町中心，交通便利，周邊有豐富的購物和餐飲選擇。您可以在「位置周邊」區塊查看詳細地圖和周邊資訊。"

```

```yaml
- text: 飯店位於西門町中心，交通便利，周邊有豐富的購物和餐飲選擇。您可以在「位置周邊」區塊查看詳細地圖和周邊資訊。
```