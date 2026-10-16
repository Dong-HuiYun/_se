# Docker 入門與微服務範例

本專案分成兩部分：**Docker 使用方式介紹**，以及一個可直接執行的**微服務系統**，把 Nginx、PostgreSQL、Node.js、Python、Rust 分別放進不同容器，再用 Docker Compose 組合起來。

## 1. Docker 基本概念

| 名詞 | 說明 |
|------|------|
| Image（映像） | 唯讀的應用程式模板，包含程式、依賴與設定 |
| Container（容器） | Image 執行起來的實例，彼此隔離 |
| Dockerfile | 描述如何建置 Image 的腳本 |
| Volume | 讓資料獨立於容器之外保存，容器刪除後資料仍在 |
| Network | 容器之間的虛擬網路，同網路內可用服務名稱互相連線 |
| Docker Compose | 用一個 YAML 檔定義並同時管理多個容器 |

容器與虛擬機不同：容器共用主機的核心，所以啟動快、佔用資源少。

## 2. 安裝

安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（Windows / macOS），或在 Linux 安裝 Docker Engine 與 Compose plugin。確認安裝成功：

```bash
docker --version
docker compose version
```

## 3. 常用指令

```bash
# 映像
docker pull nginx:alpine            # 下載映像
docker images                       # 列出映像
docker build -t myapp:1.0 .         # 以當前目錄的 Dockerfile 建置
docker rmi myapp:1.0                # 刪除映像

# 容器
docker run -d --name web -p 8080:80 nginx:alpine   # 背景執行並對應埠號
docker ps            # 執行中的容器（加 -a 看全部）
docker logs -f web   # 追蹤日誌
docker exec -it web sh   # 進入容器的 shell
docker stop web && docker rm web

# 資料與網路
docker volume ls
docker network ls

# 清理未使用的資源
docker system prune
```

常用 `docker run` 參數：`-d` 背景執行、`-p 主機埠:容器埠`、`-e KEY=VALUE` 環境變數、`-v 來源:目標` 掛載、`--name` 命名、`--network` 指定網路。

## 4. Dockerfile 範例

```dockerfile
FROM node:20-alpine        # 基底映像
WORKDIR /app               # 工作目錄
COPY package.json ./       # 先複製依賴描述檔，可善用建置快取
RUN npm install --omit=dev
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]  # 容器啟動指令
```

重點：把變動少的步驟放前面（快取）；用 `alpine`、`slim` 縮小映像；編譯型語言用**多階段建置**（見 `rust-service/Dockerfile`），最終映像只留執行檔。

## 5. Docker Compose 常用指令

```bash
docker compose up -d --build   # 建置並背景啟動全部服務
docker compose ps              # 查看狀態
docker compose logs -f node    # 查看單一服務日誌
docker compose restart python  # 重啟單一服務
docker compose down            # 停止並移除容器（保留 volume）
docker compose down -v         # 連資料 volume 一起刪除
```

## 6. 微服務系統

### 架構

```
                         ┌── Node.js  :3000 ──┐
瀏覽器 ──► Nginx :8080 ──┼── Python   :5000 ──┼──► PostgreSQL :5432
          (靜態網頁 +    └── Rust     :8080   │      (只在 backend 網路)
           反向代理)                          
```

| 容器 | 技術 | 職責 |
|------|------|------|
| nginx | nginx:alpine | 提供網頁，並依路徑反向代理到後端服務 |
| postgres | PostgreSQL 16 | 儲存留言資料，資料放在 `pgdata` volume |
| node | Node.js 20 + Express | 留言的新增與查詢 API（`/api/node/`） |
| python | Python 3.12 + Flask | 讀取資料庫並統計留言（`/api/python/`） |
| rust | Rust + Axum | 質數運算，示範高效能計算（`/api/rust/`） |

設計重點：

- **網路隔離**：PostgreSQL 只加入 `backend` 網路，Nginx 與外部都無法直接連到資料庫。
- **啟動順序**：資料庫有 `healthcheck`，Node 與 Python 等它就緒才啟動（`service_healthy`）。
- **服務名稱即主機名**：Nginx 設定中的 `http://node:3000` 由 Docker 內建 DNS 解析。
- **只有 Nginx 對外開放埠號**，其餘服務不暴露到主機。

### 目錄結構

```
.
├── docker-compose.yml
├── .env                  # 資料庫帳密（正式環境請更換）
├── nginx/default.conf    # 反向代理設定
├── web/index.html        # 展示用網頁介面
├── db/init.sql           # 初始化資料表與範例資料
├── node-service/         # server.js, package.json, Dockerfile
├── python-service/       # app.py, requirements.txt, Dockerfile
└── rust-service/         # src/main.rs, Cargo.toml, Dockerfile
```

### 啟動

```bash
docker compose up -d --build
```

第一次建置需要編譯 Rust，約需數分鐘。完成後開啟 <http://localhost:8080>。

網頁介面可以：查看五個服務的狀態、新增留言（Node → PostgreSQL）、查看統計（Python 讀資料庫）、執行質數計算（Rust）。

### API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/node/health` | Node 狀態與資料庫連線檢查 |
| GET / POST | `/api/node/notes` | 查詢 / 新增留言（POST body：`{"text":"..."}`） |
| GET | `/api/python/stats` | 留言數、字數、常見詞 |
| GET | `/api/rust/primes?n=1000000` | n 以內的質數數量與耗時 |

```bash
curl http://localhost:8080/api/rust/primes?n=5000000
```

### 實驗看看

```bash
docker compose stop python     # 網頁上 Python 變成離線，其他服務不受影響
docker compose start python
docker compose exec postgres psql -U demo -d demo -c "SELECT * FROM notes;"
docker compose down && docker compose up -d   # 留言仍在，因為有 volume
```

## 7. 疑難排解

- **埠號被占用**：修改 `docker-compose.yml` 的 `"8080:80"` 左側數字。
- **Rust 建置很慢**：首次需下載並編譯依賴，之後有快取會快很多。
- **想重置資料庫**：`docker compose down -v` 後重新 `up`（`init.sql` 只在資料庫首次建立時執行）。
- **改了程式沒生效**：加上 `--build` 重新建置，或 `docker compose build --no-cache 服務名`。
