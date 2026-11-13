# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking-pages.spec.js >> 已知問題：訂房成功訊息的旅館名稱 >> C 類訂房頁的成功訊息應該是「台北美好境界西門館」
- Location: tests\e2e\booking-pages.spec.js:99:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "台北美好境界西門館"
Received string:    "預訂成功！
感謝 王小明 選擇台北君悅酒店。
確認信已發送至 ming@example.com"
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]: Booking.com
    - button "← 返回酒店詳情" [ref=e5] [cursor=pointer]
  - generic [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: "1"
          - generic [ref=e11]: 選擇房型
        - generic [ref=e12]:
          - generic [ref=e13]: "2"
          - generic [ref=e14]: 填寫資料
        - generic [ref=e15]:
          - generic [ref=e16]: "3"
          - generic [ref=e17]: 確認預訂
      - heading "預訂資訊" [level=2] [ref=e18]
      - generic [ref=e19]:
        - heading "住宿日期" [level=3] [ref=e20]
        - generic [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e23]: 入住日期
            - textbox "入住日期" [ref=e24]: 2026-11-05
          - generic [ref=e25]:
            - generic [ref=e26]: 退房日期
            - textbox "退房日期" [ref=e27]: 2026-11-06
        - generic [ref=e28]:
          - generic [ref=e29]: 住宿晚數
          - generic [ref=e30]: 1 晚
      - generic [ref=e31]:
        - heading "住客信息" [level=3] [ref=e32]
        - generic [ref=e33]:
          - generic [ref=e34]: 成人
          - generic [ref=e35]:
            - button "-" [ref=e36] [cursor=pointer]
            - generic [ref=e37]: "2"
            - button "+" [ref=e38] [cursor=pointer]
        - generic [ref=e39]:
          - generic [ref=e40]: 兒童 (0-12歲)
          - generic [ref=e41]:
            - button "-" [ref=e42] [cursor=pointer]
            - generic [ref=e43]: "0"
            - button "+" [ref=e44] [cursor=pointer]
        - generic [ref=e45]:
          - generic [ref=e46]: 房間數
          - generic [ref=e47]:
            - button "-" [ref=e48] [cursor=pointer]
            - generic [ref=e49]: "1"
            - button "+" [ref=e50] [cursor=pointer]
      - generic [ref=e51]:
        - heading "聯絡資訊" [level=3] [ref=e52]
        - generic [ref=e53]:
          - generic [ref=e54]: 姓名
          - textbox "姓名" [ref=e55]:
            - /placeholder: 請輸入您的全名
            - text: 王小明
        - generic [ref=e56]:
          - generic [ref=e57]: 電子郵件
          - textbox "電子郵件" [ref=e58]:
            - /placeholder: 請輸入您的電子郵件
            - text: ming@example.com
        - generic [ref=e59]:
          - generic [ref=e60]: 手機號碼
          - textbox "手機號碼" [ref=e61]:
            - /placeholder: 請輸入您的手機號碼
            - text: "0912345678"
      - generic [ref=e62]:
        - heading "特殊要求 (可選)" [level=3] [ref=e63]
        - textbox "如有特殊要求，請在此處填寫..." [ref=e65]
      - generic [ref=e66]:
        - heading "付款方式" [level=3] [ref=e67]
        - generic [ref=e68]:
          - generic [ref=e69] [cursor=pointer]: 信用卡
          - generic [ref=e71] [cursor=pointer]: PayPal
          - generic [ref=e73] [cursor=pointer]: Apple Pay
          - generic [ref=e75] [cursor=pointer]: Google Pay
      - button "預訂成功！正在跳轉..." [active] [ref=e77] [cursor=pointer]
    - generic [ref=e78]:
      - heading "訂單摘要" [level=2] [ref=e79]
      - generic [ref=e80]:
        - img "輕奢背包客" [ref=e82]
        - generic [ref=e83]:
          - generic [ref=e84]: 輕奢背包客
          - generic [ref=e85]: "面積: 20平方米 · 市景 · 單人床"
      - generic [ref=e86]:
        - generic [ref=e87]:
          - generic [ref=e88]: 1晚 x TWD 580
          - generic [ref=e89]: TWD 580
        - generic [ref=e90]:
          - generic [ref=e91]: 服務費 (5% )
          - generic [ref=e92]: TWD 29
        - generic [ref=e93]:
          - generic [ref=e94]: 稅費 (6%)
          - generic [ref=e95]: TWD 34.8
        - generic [ref=e96]: 總計 TWD 643.8
```