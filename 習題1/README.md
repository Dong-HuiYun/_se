# mycurl

一個以 **Python 標準函式庫**實作的簡易 `curl` 複製品，不需要安裝任何第三方套件即可執行。

## 需求

- Python 3.7 以上

## 安裝（可選）

不安裝也能直接用 `python3 mycurl.py ...` 執行。若想以 `mycurl` 指令使用：

```bash
pip install -e .
mycurl https://example.com
```

## 快速上手

```bash
# 直接執行（不安裝）
python3 mycurl.py https://example.com

# GET 請求，顯示回應標頭 + 內容
python3 mycurl.py -i https://example.com

# 只看標頭 (HEAD)
python3 mycurl.py -I https://example.com

# 自訂 method 與標頭
python3 mycurl.py -X POST -H "X-Api-Key: abc123" https://example.com/api

# 傳送 form 資料（自動加上 Content-Type）
python3 mycurl.py -d "name=Claude" -d "lang=zh-TW" https://example.com/api

# 傳送 JSON
python3 mycurl.py --json '{"name": "Claude"}' https://example.com/api

# 上傳檔案（multipart/form-data）
python3 mycurl.py -F "file=@photo.png" -F "desc=my photo" https://example.com/upload

# 跟隨重新導向，並顯示詳細過程
python3 mycurl.py -L -v https://example.com

# 儲存回應內容到檔案
python3 mycurl.py -o result.html https://example.com
python3 mycurl.py -O https://example.com/file.zip   # 以網址檔名儲存

# Basic Auth
python3 mycurl.py -u user:pass https://example.com/private

# 透過代理伺服器
python3 mycurl.py -x http://127.0.0.1:8080 https://example.com

# 略過 TLS 憑證驗證（自簽憑證測試用）
python3 mycurl.py -k https://self-signed.example.com

# 自訂輸出格式（類似 curl --write-out）
python3 mycurl.py -s -o /dev/null -w '狀態碼: %{http_code}\n耗時: %{time_total}s\n' https://example.com
```

## 支援的參數

| 參數 | 說明 |
|---|---|
| `-X, --request` | 指定 HTTP 方法 |
| `-H, --header` | 自訂標頭，可重複使用 |
| `-d, --data` | 傳送 `application/x-www-form-urlencoded` 資料 |
| `--data-raw` | 傳送原始資料 |
| `--json` | 傳送 JSON 字串 |
| `-F, --form` | multipart 表單欄位，`field=value` 或 `field=@file` |
| `-o, --output` | 輸出到檔案 |
| `-O, --remote-name` | 以網址檔名輸出 |
| `-i, --include` | 輸出含回應標頭 |
| `-I, --head` | 只送出 HEAD 請求 |
| `-L, --location` | 跟隨重新導向 |
| `-v, --verbose` | 詳細模式 |
| `-s, --silent` | 安靜模式 |
| `-k, --insecure` | 略過 TLS 驗證 |
| `-u, --user` | Basic Auth（`user:pass`） |
| `-A, --user-agent` | 自訂 User-Agent |
| `-b, --cookie` | 傳送 Cookie |
| `-e, --referer` | 設定 Referer |
| `-x, --proxy` | 使用代理伺服器 |
| `--connect-timeout` | 連線逾時秒數 |
| `-m, --max-time` | 整體最大秒數 |
| `--compressed` | 要求並解壓縮 gzip/deflate |
| `-w, --write-out` | 格式化輸出（支援 `%{http_code}`、`%{time_total}`、`%{size_download}`、`%{url_effective}`、`%{content_type}`） |
| `--max-redirs` | 最大重新導向次數 |
| `-V, --version` | 顯示版本 |

## 已知限制

- 不支援 HTTP/2、cookie jar 檔案持久化、`--data-urlencode` 的完整編碼規則。
- 代理僅支援 HTTP／基本的 HTTPS CONNECT 隧道，未支援需要驗證的代理。
- 為教學與實用目的而寫，未涵蓋 curl 全部上百個參數。

## 專案結構

```
mycurl_project/
├── mycurl.py    # 主程式（單一檔案，零外部依賴）
├── setup.py     # 可選：安裝為 mycurl 指令
└── README.md
```
