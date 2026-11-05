# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-hotels.spec.js >> A2 台北W飯店 >> 願望清單：通知文字提到的是自己的旅館名稱
- Location: tests\e2e\all-hotels.spec.js:81:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('已將台北W飯店加入您的願望清單！')
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('已將台北W飯店加入您的願望清單！') with timeout 7000ms
  - waiting for getByText('已將台北W飯店加入您的願望清單！')

```

```yaml
- text: 台北W飯店
- button "返回"
- img "台北凱達大飯店"
- text: VR體驗
- paragraph: 點擊查看360度全景
- img "酒店大堂"
- paragraph: 酒店大堂
- img "酒店房间"
- paragraph: 豪華套房
- img "酒店设施"
- paragraph: 游泳池
- img "酒店餐厅"
- paragraph: 餐廳
- heading "台北W飯店" [level=1]
- paragraph: 台北市萬華區艋舺大道167號
- text: 8.7 很棒 · 1,248 則評價 TWD 2,231 平均每晚價格
- paragraph: W 飯店以未來感設計與潮流科技著稱，結合聲光互動與智能控制系統。位於信義區核心，步行即可到台北101與百貨商圈，擁有絕佳夜景與娛樂資源，是數位世代旅人的理想選擇。
- button "立即預訂"
- button "已加入願望清單"
- button "分享"
- text: 位置地點 智能定位與周邊探索 客房內裝 現代化設計與科技設施 公共空間 設施使用與共享空間 疑義詢問 AI智能助理即時解答
- heading "位置地點" [level=2]
- heading "智能定位" [level=3]
- paragraph: 快速定位周邊熱門景點，點擊按鈕立即查看詳細資訊與地圖位置。
- button "龍山寺 步行3分鐘"
- button "華西街夜市 步行4分鐘"
- button "西門町 步行8分鐘"
- button "艋舺公園 步行2分鐘"
- button "剝皮寮老街 步行5分鐘"
- button "台北車站 步行10分鐘"
- heading "龍山寺" [level=4]
- text: 步行3分鐘
- paragraph: 台北最古老的寺廟之一，香火鼎盛，建築精美，是重要的文化古蹟。
- text: 文化古蹟 宗教聖地 免費參觀
- img "龍山寺"
- heading "交通方式" [level=3]
- heading "捷運" [level=5]
- paragraph: 龍山寺站 (板南線)
- text: 步行5分鐘
- heading "公車" [level=5]
- paragraph: 多條公車路線
- text: 艋舺公園站
- heading "接駁服務" [level=5]
- paragraph: 免費酒店接駁
- text: 定時發車
- heading "自行開車" [level=5]
- paragraph: 免費停車場
- text: 代客泊車
- heading "交通便利" [level=3]
- paragraph: 步行5分鐘可達龍山寺捷運站，10分鐘抵達台北車站，周邊有多條公車路線。
- heading "互動地圖載入中..." [level=3]
- paragraph: 台北市信義區忠孝東路五段10號
- button "返回原始定位"
- heading "客房內裝" [level=2]
- img "豪華雙床房"
- text: 尊榮
- button "影片導覽"
- heading "豪華雙床房" [level=3]
- text: 30平方公尺 2人 2張單人床
- paragraph: 寬敞空間，獨立客廳，尊享台北101壯麗景色，商務休閒兩相宜。
- button
- button
- heading "智能控制" [level=4]
- paragraph: 語音控制燈光、窗簾、空調，個性化場景模式，一鍵切換
- heading "高速網路" [level=4]
- paragraph: Wi-Fi 6 極速上網，無線充電設備，暢享數位生活
- heading "娛樂系統" [level=4]
- paragraph: 4K超高清電視，藍牙音響，智能鏡面顯示器
- heading "智能安防" [level=4]
- paragraph: 電子門鎖，智能保險箱，24小時安全監控
- img "衛浴空間"
- heading "奢華衛浴" [level=4]
- paragraph: 乾濕分離設計，智能免治馬桶，獨立浴缸，高級沐浴備品
- list:
  - listitem: ✓ 雨淋式花灑
  - listitem: ✓ 地暖系統
  - listitem: ✓ 防霧鏡面
- heading "休憩空間" [level=4]
- paragraph: 人體工學設計家具，電動調整床鋪，舒適工作區
- list:
  - listitem: ✓ 電動升降桌
  - listitem: ✓ 人體工學椅
  - listitem: ✓ 迷你吧台
- img "休憩空間"
- heading "公共空間" [level=2]
- button "餐飲設施"
- button "休閒設施"
- button "商務設施"
- button "健康養生"
- heading "頂級餐飲體驗" [level=3]
- paragraph: 匯聚中西美食，從精緻早餐到浪漫晚餐，為您打造難忘的味蕾之旅
- text: 5 特色餐廳 24 小時服務 100+ 精選菜色
- img "餐廳環境"
- text: 推薦
- img "家宴中餐廳"
- button
- heading "家宴中餐廳" [level=4]
- text: 午餐：11:30-14:30 晚餐：17:30-21:00 需預約
- paragraph: 大片落地窗環繞著寬敞的用餐空間，餐台上擺滿著的各式異國風味料理，在這舒適新穎的氛圍下，品味優雅時尚的用餐時光
- text: 粵滬風格中式美食 家庭友善
- img "百宴自助餐廳"
- button
- heading "百宴自助餐廳" [level=4]
- text: 早餐：06:30-10:00 午餐：11:30-14:30 晚餐：17:30-21:30 需預約
- paragraph: 享用新潮與傳統的美饌選擇，同時滿足視覺與味蕾的饗宴。 3F 的中餐廳「家宴」提供粵滬風格中式美食，附設的包廂空間是家庭聚餐與宴客的理想選擇
- text: 異國風味料理 優雅時尚
- img "98酒吧"
- button
- heading "98酒吧" [level=4]
- text: 10:00-23:00
- paragraph: 時尚都會的氛圍，無論白天或黑夜，都適合三五好友結伴同行，在變幻的窗外景色中，享受輕鬆的時刻！
- text: 景觀酒吧 下午茶 商務洽談
- img "星巴克咖啡"
- button
- heading "星巴克咖啡" [level=4]
- text: 07:00–23:00
- paragraph: 提供各式咖啡飲品與輕食，位於飯店大廳，方便旅客與顧客在此休息與會議
- text: 下午茶 飯店大廳
- heading "智能預約服務" [level=4]
- paragraph: 一鍵預約，輕鬆管理您的設施使用時段
- text: 3 步驟完成 24h 即時確認 100% 保證預約 手機App預約 即時時段查詢 預約提醒通知 免費取消政策 熱門
- heading "游泳池預約" [level=5]
- paragraph: 實時查看人數，預約專屬時段
- text: 即時人數顯示 時段選擇 目前空位充足
- button "立即預約"
- text: 推薦
- heading "健身教練課程" [level=5]
- paragraph: 專業教練一對一指導
- text: 專業認證教練 個人化訓練 部分時段已滿
- button "查看課程"
- text: 全新
- heading "會議室租借" [level=5]
- paragraph: 商務會議、活動場地
- text: 視訊會議設備 高速網路 可立即預約
- button "查看檔期"
- text: 所有預約均可於使用前2小時免費取消
- button "查看所有可預約設施"
- heading "特色服務" [level=2]
- text: 早餐服務 豐盛自助早餐，提供中西式多樣選擇，支持預訂送餐服務 設施使用 全天候開放設施，智能預約系統，實時使用狀態顯示 迎賓服務 專屬接待服務，快速入住/退房，個性化歡迎禮遇 營運彈性 24小時彈性服務，免費取消政策，行程變更保障
- heading "優惠與獎勵" [level=2]
- text: 熱門
- heading "價格折扣" [level=3]
- paragraph: 提前預訂享85折優惠，連住3晚以上額外折扣
- text: 會員專享
- heading "點數回饋" [level=3]
- paragraph: 每次入住累積點數，可兌換免費住宿或升級服務
- text: 保證
- heading "價格保證" [level=3]
- paragraph: 發現更低價格，我們將提供差價補償
- text: 限時
- heading "期間優惠" [level=3]
- paragraph: 季節性特惠套餐，含早餐及設施使用權益
```