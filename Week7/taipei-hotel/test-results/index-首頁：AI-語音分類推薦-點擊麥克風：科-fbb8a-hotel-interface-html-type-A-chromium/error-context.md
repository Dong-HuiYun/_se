# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: index.spec.js >> 首頁：AI 語音分類推薦 >> 點擊麥克風：科技類語句 → A，並跳轉到 hotel_interface.html?type=A
- Location: tests\e2e\index.spec.js:41:5

# Error details

```
Error: expect(locator).not.toHaveClass(expected) failed

Locator: locator('#voiceBtn')
Expected pattern: not /listening/
Timeout: 7000ms
Error: element(s) not found

Call log:
  - Expect "not toHaveClass" locator('#voiceBtn') with timeout 7000ms
  - waiting for locator('#voiceBtn')
    - waiting for navigation to finish...
    - navigated to "http://localhost:3100/hotel_interface.html?type=A"

```

```yaml
- banner:
  - heading "旅遊推薦平台" [level=1]
  - paragraph: 根據您的偏好，為您精選最合適的旅遊選擇
  - button "重新語音輸入"
- heading "科技體驗精選" [level=2]
- img "台北凱達大飯店"
- text: VR體驗 · AI助理
- heading "台北凱達大飯店" [level=3]
- paragraph: 台北市萬華區艋舺大道167號 · 距離龍山寺 0.2 公里
- paragraph: 台北凱達大飯店以現代科技結合都會風格，提供智能化住宿體驗。房內配備高速網路與智慧電視，館內設有無邊際泳池與健身房，坐擁城市天際線。鄰近捷運龍山寺站，交通便捷，輕鬆連結整個台北。
- text: VR實境看房 AI智能助理 3D地圖導覽 智能客房控制 高速Wi-Fi 語音控制 4.9 (2,385 則評論) · 8.7 很棒 TWD 5,800 平均每晚價格 · 含稅費
- button "體驗科技住宿"
- img "台北W飯店"
- text: 智能客房 · 科技設施
- heading "台北W飯店" [level=3]
- paragraph: 台北市信義區忠孝東路五段10號 · 距離台北101 0.3 公里
- paragraph: W 飯店以未來感設計與潮流科技著稱，結合聲光互動與智能控制系統。位於信義區核心，步行即可到台北101與百貨商圈，擁有絕佳夜景與娛樂資源，是數位世代旅人的理想選擇。
- text: 智能客房控制 互動投影牆 高科技健身中心 智能會議室 平板控制系統 高速Wi-Fi 4.7 (1,842 則評論) · 8.5 很棒 TWD 6,200 平均每晚價格 · 含稅費
- button "體驗科技住宿"
- img "台北寒舍艾美酒店"
- text: AI服務 · 智能體驗
- heading "台北寒舍艾美酒店" [level=3]
- paragraph: 台北市信義區松仁路38號 · 距離台北101 0.4 公里
- paragraph: 寒舍艾美以歐式簡約與科技質感打造高雅住宿氛圍。提供智能入住、電子客房控制、室內泳池與高階會議設施。鄰近台北101與捷運市政府站，是兼具設計美學與商務效率的高端之選。
- text: AI管家服務 智能鏡面顯示器 數位藝術展覽 智能照明系統 語音助理 高速Wi-Fi 4.8 (1,956 則評論) · 8.6 很棒 TWD 5,500 平均每晚價格 · 含稅費
- button "體驗科技住宿"
- contentinfo:
  - paragraph: © 2023 旅遊推薦平台 - 為您提供最合適的旅遊選擇
```