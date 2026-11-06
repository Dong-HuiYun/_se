# 課程：現代軟體工程 -- 學生作業與專案

欄位 | 內容
-----|--------
學期 | 115 學年上學期
教師 | [陳鍾誠](https://www.nqu.edu.tw/educsie/index.php?act=blog&code=list&ids=4)
學校 | [金門大學資訊工程系](https://www.nqu.edu.tw/educsie/index.php)
學生 | 董惠筠
學號 | 111310531

## 二、作業列表（期中以前）

### 每週檢驗表格

第幾週 |  習題內容 | 有上課且準時繳交 |  補交且附上請假證明 | 作業連結
-------|----------|--------------------|---------------------|-------------
1          |    |   是 |   | [01](https://github.com/ccc115a/_co/tree/main/01)
2          |    |   是 |   | [01](https://github.com/ccc115a/_co/tree/main/01)
3          |    |   是 |   | [01](https://github.com/ccc115a/_co/tree/main/01)
4          |  | 是 |    是  |  [03](https://github.com/ccc115a/_co/tree/main/03) | 
5          |  | 是 |  |  [04](https://github.com/ccc115a/_co/tree/main/04) | 
6          |  | 是 |  | | 
7          |  | 是 |  |  [05](https://github.com/ccc115a/_co/tree/main/05) | 
8          |  | 是 |   | | 

| Github 對應標題名稱 | 有上課且準時繳交 | 檔案 / 連結 | 是否使用 AI 與連結
|------|----------|--------------|--------------|
| 習題1  | 是 |https://github.com/Dong-HuiYun/_se/tree/main/%E7%BF%92%E9%A1%8C1              |[使用 Claude](https://claude.ai/share/2ab99421-da4a-4f1b-b946-40a2a2e1bf19)|
| 習題2  | 是 |https://github.com/Dong-HuiYun/_se/tree/main/%E7%BF%92%E9%A1%8C2              |[使用 Claude](https://claude.ai/share/1e92bb33-1b99-4636-adad-7b94d04dd09d)|
| 習題3  | 是 |https://github.com/Dong-HuiYun/_se/tree/main/%E7%BF%92%E9%A1%8C3              |[使用 Claude](https://claude.ai/share/85f93029-7eab-45f3-b609-85326b24ffa4)|
| 第四週  |  是          |https://github.com/Dong-HuiYun/_se/tree/main/%E7%BF%92%E9%A1%8C4              |否|
| 第六週  |  是          |https://github.com/Dong-HuiYun/_se/tree/main/Week6              |Docker 的使用是自己寫的，程式碼 [使用 Claude](https://claude.ai/share/b1ac6e10-e84d-4611-b9d8-d54244716ad5)|
| 第七週  |  是          |https://github.com/Dong-HuiYun/_se/tree/main/Week6              |[使用 Claude](https://claude.ai/share/d44d4889-6dd4-4d74-b9b1-803e9bf1e9f7)測試習題2的校務系統，並[使用 Claude](https://claude.ai/share/9d7076fa-04ea-4035-9d4e-6a4bcdb59fcb)測試以前寫的旅游網頁|
| 第八週  |  請假但有準時繳交（下圖是請假證明）          |https://github.com/Dong-HuiYun/_se/tree/main/Week8              |[使用 Google AI Studio](https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221ix9DZleeecdbmqaORPVQxw27tx3J9KEA%22%5D,%22action%22:%22open%22,%22userId%22:%22104108532823114063447%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing)|

### 請假證明

第八週：已經提前請假，但班導尚未核准，後續會附上核准圖

![第八週事假](images/事假請假證明.png)

---

## 三、各作業說明

### 習題1 ：請做一個類似 curl 的專案程式 (可用 AI, opencode + big pickle)

- **目標**：做一個 curl 程式，提供與 curl 相近的常用介面（method、header、body、輸出、重新導向、認證、代理、壓縮、計時），用 Python 標準函式庫就能執行，不依賴第三方套件。專案也能作為 HTTP 的測試工具。

- **程式碼/檔案路徑**：[習題1](https://github.com/Dong-HuiYun/_se/tree/main/%E7%BF%92%E9%A1%8C1)

- **成果説明**：[成果説明](https://github.com/Dong-HuiYun/_se/blob/main/%E7%BF%92%E9%A1%8C1/README.md)

### 習題 2 : 請做一個類似金門大學校務系統的專案程式 (可用 AI, opencode + big pickle)

- **目標**：實作一個類似金門大學校務系統的網頁，具備校務系統應具備的功能，如：選課、停修、請假、成績查詢之類的相關事宜。並需要確保該系統具備一定的安全性，如：初次登陸建議重設密碼、管理者無法看到學生的密碼，確保個資不被泄露。

- **程式碼/檔案路徑**：[習題2](https://github.com/Dong-HuiYun/_se/tree/main/%E7%BF%92%E9%A1%8C2)

- **成果説明**：[成果説明](https://github.com/Dong-HuiYun/_se/blob/main/%E7%BF%92%E9%A1%8C2/README.md)

### 習題 3 : 請想出一個有價值的專案程式，並實作出來 (可用 AI, opencode + big pickle, muse spark 1.3)

- **目標**：實作一個有商業價值或是使用價值的專案程式。因為在填寫資料、寫論文的時候，常常需要對 pdf 進行修改，需要在瀏覽器搜尋如：pdf 合併、pdf 刪除頁數等，資料上傳到雲端缺乏安全性，因此我實作了一個 pdf 操作工具，包含多種可用功能，並可在後續進行擴充。

- **程式碼/檔案路徑**：[習題3](https://github.com/Dong-HuiYun/_se/tree/main/%E7%BF%92%E9%A1%8C3)

- **成果説明**：[成果説明](https://github.com/Dong-HuiYun/_se/blob/main/%E7%BF%92%E9%A1%8C2/README.md)

### 

- **目標**：

- **程式碼/檔案路徑**：

- **成果説明**：