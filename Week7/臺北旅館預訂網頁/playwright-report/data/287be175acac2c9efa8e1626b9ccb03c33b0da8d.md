# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-hotels.spec.js >> B2 台北晶華酒店 >> AI 聊天 >> 詢問「位置」時，回答的是自己這間旅館
- Location: tests\e2e\all-hotels.spec.js:119:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#chatBody .ai-message').last()
Expected: "台北晶華酒店位於台北市中山區中山北路二段39巷3號。您可以在頁面的位置周邊區塊查看詳細地圖和周邊資訊。"
Received: "酒店位於台北市信義區松壽路2號，周邊有台北101、信義商圈等。步行5分鐘可達捷運站，交通十分便利。"
Timeout:  7000ms

Call log:
  - Expect "toHaveText" locator('#chatBody .ai-message').last() with timeout 7000ms
  - waiting for locator('#chatBody .ai-message').last()
    6 × locator resolved to <div class="ai-message">↵                您好！我是您的AI智能助理，有什麼關於台北君悅酒店的問題可以為您…</div>
      - unexpected value "
                您好！我是您的AI智能助理，有什麼關於台北君悅酒店的問題可以為您解答嗎？
            "
    12 × locator resolved to <div class="ai-message">酒店位於台北市信義區松壽路2號，周邊有台北101、信義商圈等。步行5分鐘可達捷運站，交通十分便利。</div>
       - unexpected value "酒店位於台北市信義區松壽路2號，周邊有台北101、信義商圈等。步行5分鐘可達捷運站，交通十分便利。"

```

```yaml
- text: 酒店位於台北市信義區松壽路2號，周邊有台北101、信義商圈等。步行5分鐘可達捷運站，交通十分便利。
```