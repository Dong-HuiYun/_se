# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: index.spec.js >> 首頁：AI 語音分類推薦 >> 點擊麥克風：品質服務類語句 → B，並跳轉到 hotel_interface.html?type=B
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
    - navigated to "http://localhost:3100/hotel_interface.html?type=B"

```

```yaml
- banner:
  - heading "旅遊推薦平台" [level=1]
  - paragraph: 根據您的偏好，為您精選最合適的旅遊選擇
  - button "重新語音輸入"
- heading "高CP值精選" [level=2]
- img "台北君悅酒店"
- text: 免費早餐 · 設施齊全
- heading "台北君悅酒店" [level=3]
- paragraph: 台北市信義區松壽路2號 · 距離台北101 0.3公里
- paragraph: 台北君悅酒店位於信義區中心，提供超高CP值的五星級住宿體驗。包含豐盛自助早餐、免費使用所有設施（室內泳池、健身中心、Spa）、迎賓禮品及彈性入住退房服務。館內8間餐廳提供多國料理，讓您物超所值。
- text: 豐盛自助早餐 免費設施使用 迎賓禮品 彈性入住退房 免費接駁服務 免費停車 4.7 (1,542 則評論) · 8.7 很棒 TWD 5,800 含早餐及所有設施 · 含稅費
- button "查看超值方案"
- img "台北晶華酒店"
- text: 多項服務 · 設施完善
- heading "台北晶華酒店" [level=3]
- paragraph: 台北市中山區中山北路二段39巷3號 · 距離中山站商圈 0.4 公里
- paragraph: 晶華酒店以頂級設施與親切服務著稱，卻維持極高性價比。入住即可享用健身房、露天泳池與頂樓Spa。周邊商圈繁華，餐飲購物皆便利，是商務與休閒旅客的首選。
- text: 免費早餐 下午茶 晚間雞尾酒會 免費設施使用 免費接駁服務 免費停車 4.8 (2,125 則評論) · 8.9 很棒 TWD 6,500 含早餐及所有服務 · 含稅費
- button "查看超值方案"
- img "台北遠東國際大飯店"
- text: 豐富設施 · 服務完善
- heading "台北遠東國際大飯店" [level=3]
- paragraph: 台北市大安區敦化南路二段201號 · 距離台北101 1.2 公里
- paragraph: 遠東飯店結合香格里拉品牌優雅與實惠價格，提供極具CP值的五星體驗。房間可俯瞰台北全景，擁有豪華Spa、露天泳池與多國餐飲。特別適合追求品質又精打細算的旅人。
- text: 免費早餐 健身中心 游泳池 三溫暖 免費停車 商務中心 4.6 (1,785 則評論) · 8.4 很棒 TWD 5,200 含早餐及設施使用 · 含稅費
- button "查看超值方案"
- contentinfo:
  - paragraph: © 2023 旅遊推薦平台 - 為您提供最合適的旅遊選擇
```