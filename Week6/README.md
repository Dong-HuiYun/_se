# Docker 入門與微服務範例

本專案分成兩部分：**Docker 使用方式介紹**，以及一個可直接執行的**微服務系統**。系統把 Nginx、Node.js、Python、Rust、PostgreSQL、RabbitMQ 分別放進不同容器，再用 Docker Compose 組合起來。

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
docker pull nginx:alpine
docker images
docker build -t myapp:1.0 .
docker rmi myapp:1.0

# 容器
docker run -d --name web -p 8080:80 nginx:alpine   # 背景執行並對應埠號
docker ps                # 執行中的容器（加 -a 看全部）
docker logs -f web       # 追蹤日誌
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
                        ┌─ Node.js ──► db-node（notes）
瀏覽器 ─► Nginx :8081 ──┼─ Python  ──► db-python（統計）
                        └─ Rust

Node ──(事件 note.created)──► RabbitMQ ──► Python
Python ──(啟動時 HTTP 呼叫)──► Node API
```

| 容器 | 技術 | 職責 |
|------|------|------|
| nginx | nginx:alpine | 提供網頁，依路徑反向代理到後端服務 |
| node | Node.js 20 + Express | 留言 API；寫入 db-node，並發出事件 |
| python | Python 3.12 + Flask | 接收事件、統計留言，寫入 db-python |
| rust | Rust + Axum | 質數運算 |
| db-node | PostgreSQL 16 | Node 專用資料庫（notes） |
| db-python | PostgreSQL 16 | Python 專用資料庫（統計結果） |
| rabbitmq | RabbitMQ 3 | 訊息佇列，傳遞 note.created 事件 |

### 微服務的設計重點

1. **每個服務擁有自己的資料庫**：Node 與 Python 各連各的 PostgreSQL，且在不同 Docker 網路，Python 連 `db-node` 的名稱都解析不到。要資料只能問 Node。
2. **同步呼叫（HTTP API）**：Python 啟動時呼叫 `GET /api/node/notes?limit=1000`，補齊既有留言。
3. **非同步訊息（RabbitMQ）**：Node 新增留言後送出 `note.created` 事件就回應，不等 Python。Python 收到事件才更新統計（刻意延遲 1.5 秒方便觀察）。
4. **佇列是持久的**：Python 停機時事件會留在 RabbitMQ，重啟後自動接著處理。
5. **冪等處理**：Python 用 `note_id` 當主鍵，同一則留言從 API 與事件各來一次也只算一次。
6. **網路分區**：`net-node`、`net-python`、`mq`、`frontend` 四個網路，各容器只加入需要的。

> 簡化之處：Node 若在 RabbitMQ 斷線時新增留言，該事件會遺失（只有 Python 重啟時的 API 補齊能追回）。正式系統會用 Outbox 模式解決。

### 目錄結構

```
.
├── docker-compose.yml
├── .env                   # 各資料庫與 RabbitMQ 的帳密
├── nginx/default.conf
├── web/index.html
├── db/node-init.sql       # Node 的資料表與範例資料
├── db/python-init.sql     # Python 的統計資料表
├── node-service/
├── python-service/
└── rust-service/
```

使用前需先打開 Docker Desktop

### 啟動

```bash

docker compose up -d --build

```

第一次啟動過後，後續只需使用

```bash

docker compose up

```

- 網頁：<http://localhost:8081>（埠號可在 `docker-compose.yml` 修改）
- RabbitMQ 管理介面：<http://localhost:15672>（帳密 `demo` / `demo_pass`）

> 從舊版（單一 postgres）升級時，先執行 `docker compose down --remove-orphans`，舊的 volume 可用 `docker volume rm docker-microservices_pgdata` 刪除。

### API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/node/health` | Node 狀態，含資料庫與 RabbitMQ 連線 |
| GET / POST | `/api/node/notes` | 查詢（可加 `?limit=`）/ 新增留言 |
| GET | `/api/python/stats` | 由 Python 資料庫提供的統計 |
| GET | `/api/rust/primes?n=1000000` | 質數數量與耗時 |

### 實驗看看

```bash
# 1. 非同步：新增留言後，統計約 1.5 秒才更新
# 2. 佇列保存事件：停掉 Python，在網頁新增幾則留言，再啟動它
docker compose stop python
docker compose start python        # 統計會追上來；RabbitMQ 管理介面可看到 Queue 的 Ready 數量變化

# 3. 資料庫隔離：Python 找不到 Node 的資料庫
docker compose exec python python -c "import socket; socket.gethostbyname('db-node')"

# 4. 各自的資料庫
docker compose exec db-node psql -U node_user -d notes -c "SELECT * FROM notes;"
docker compose exec db-python psql -U py_user -d stats -c "SELECT * FROM word_freq;"
```

## 7. 疑難排解

- **`project name must not be empty`**：資料夾名稱含中文時會發生，`docker-compose.yml` 已用 `name:` 解決。
- **埠號被占用**：修改 `docker-compose.yml` 中 `ports` 左側的數字。
- **Rust 建置很慢**：首次需編譯依賴，之後有快取。
- **RabbitMQ 啟動較慢**：容器需 20～30 秒才 healthy，Node 與 Python 會等它。
- **想重置所有資料**：`docker compose down -v` 後重新 `up`（初始化 SQL 只在資料庫首次建立時執行）。
- **改了程式沒生效**：加上 `--build`，或 `docker compose build --no-cache 服務名`。
