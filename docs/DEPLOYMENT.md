# Data Analyzer - 部署指南

**版本**: 2.0
**最後更新**: 2025-01-22

## 目錄

1. [部署概覽](#部署概覽)
2. [環境需求](#環境需求)
3. [開發環境設定](#開發環境設定)
4. [生產環境部署](#生產環境部署)
5. [Docker 部署](#docker-部署)
6. [資料庫配置](#資料庫配置)
7. [反向代理配置](#反向代理配置)
8. [SSL/TLS 配置](#ssltls-配置)
9. [監控與日誌](#監控與日誌)
10. [備份與復原](#備份與復原)
11. [效能優化](#效能優化)
12. [故障排除](#故障排除)

---

## 部署概覽

Data Analyzer 是一個基於 Node.js + React 的全端應用，支援多種部署方式。本指南涵蓋從開發環境到生產環境的完整部署流程。

### 架構概覽

```
┌─────────────────────────────────────────────────────────┐
│                      使用者                              │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Nginx (反向代理 + SSL)                      │
│  - 靜態檔案服務                                          │
│  - API 請求轉發                                          │
│  - HTTPS 終止                                            │
└─────────────┬───────────────────────┬───────────────────┘
              │                       │
              ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐
    │  前端 (React)    │     │  後端 (Node.js)  │
    │  Port: 3000     │     │  Port: 3001     │
    │  - 靜態資源      │     │  - REST API     │
    │  - SPA 路由     │     │  - 檔案處理      │
    └─────────────────┘     └────────┬─────────┘
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                  ┌───────────────┐    ┌───────────────┐
                  │  PostgreSQL   │    │  檔案系統      │
                  │  (資料庫)     │    │  - uploads/   │
                  │               │    │  - exports/   │
                  └───────────────┘    └───────────────┘
```

### 部署模式

| 模式 | 適用場景 | 優點 | 缺點 |
|------|---------|------|------|
| **開發模式** | 本地開發、測試 | 熱重載、快速迭代 | 不穩定、效能較低 |
| **生產模式** | 正式環境 | 高效能、穩定 | 需要構建步驟 |
| **Docker** | 容器化部署 | 環境一致、易於擴展 | 需要 Docker 知識 |

---

## 環境需求

### 最低需求

| 組件 | 開發環境 | 生產環境 |
|------|---------|---------|
| **CPU** | 2 核心 | 4 核心 |
| **記憶體** | 4 GB | 8 GB |
| **硬碟** | 10 GB | 50 GB（取決於數據量） |
| **作業系統** | Windows/macOS/Linux | Linux (Ubuntu 20.04+, CentOS 8+) |

### 軟體需求

- **Node.js**: 16.x 或更高版本（推薦 18.x LTS）
- **npm**: 8.x 或更高版本
- **資料庫**:
  - 開發環境: SQLite 3.x
  - 生產環境: PostgreSQL 13+ （推薦）
- **反向代理**: Nginx 1.18+ 或 Apache 2.4+
- **Process Manager**: PM2（生產環境）
- **Docker**: 20.10+ （若使用 Docker 部署）

### 網路需求

- **前端**: HTTP/HTTPS (Port 80/443)
- **後端 API**: HTTP (Port 3001，內部訪問)
- **資料庫**: TCP (Port 5432 for PostgreSQL，內部訪問)
- **SSH**: TCP (Port 22，管理訪問)

---

## 開發環境設定

### 1. 安裝依賴

```bash
# 複製專案
git clone <repository-url>
cd dataanalyzer

# 安裝所有依賴（前端 + 後端）
npm run install:all
```

### 2. 環境變數配置

建立環境變數檔案：

**後端環境變數** (`backend/.env`):

```bash
# 伺服器配置
NODE_ENV=development
PORT=3001
HOST=localhost

# 資料庫配置（開發環境使用 SQLite）
DB_TYPE=sqlite
DB_PATH=./data/dev.db

# 檔案上傳配置
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
MAX_FILE_SIZE=52428800  # 50 MB

# CORS 配置
CORS_ORIGIN=http://localhost:3000

# 日誌配置
LOG_LEVEL=debug
LOG_DIR=./logs
```

**前端環境變數** (`frontend/.env`):

```bash
# API 端點
REACT_APP_API_URL=http://localhost:3001/api

# 應用配置
REACT_APP_NAME=Data Analyzer
REACT_APP_VERSION=2.0.0

# 功能開關
REACT_APP_ENABLE_COLLABORATION=false
```

### 3. 啟動開發伺服器

```bash
# 同時啟動前端和後端（推薦）
npm run dev
```

或分別啟動：

```bash
# 終端機 1：啟動後端
cd backend
npm run dev

# 終端機 2：啟動前端
cd frontend
npm start
```

### 4. 驗證安裝

開啟瀏覽器並訪問：
- **前端**: http://localhost:3000
- **後端 API**: http://localhost:3001/api/health

預期回應：
```json
{
  "status": "ok",
  "timestamp": "2024-10-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

## 生產環境部署

### 方案 A: 傳統部署（Linux Server）

#### 1. 準備伺服器

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安裝 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安裝 Nginx
sudo apt install -y nginx

# 安裝 PM2（Process Manager）
sudo npm install -g pm2

# 安裝 Git
sudo apt install -y git
```

#### 2. 複製專案並安裝依賴

```bash
# 建立應用目錄
sudo mkdir -p /var/www/dataanalyzer
sudo chown $USER:$USER /var/www/dataanalyzer
cd /var/www/dataanalyzer

# 複製專案
git clone <repository-url> .

# 安裝依賴
npm run install:all
```

#### 3. 配置生產環境變數

**後端環境變數** (`backend/.env.production`):

```bash
# 伺服器配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 資料庫配置（PostgreSQL）
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dataanalyzer
DB_USER=dataanalyzer_user
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# 檔案配置
UPLOAD_DIR=/var/www/dataanalyzer/uploads
EXPORT_DIR=/var/www/dataanalyzer/exports
MAX_FILE_SIZE=52428800

# CORS 配置（設定為實際域名）
CORS_ORIGIN=https://yourdomain.com

# 安全性
SESSION_SECRET=YOUR_SESSION_SECRET_HERE
JWT_SECRET=YOUR_JWT_SECRET_HERE

# 日誌配置
LOG_LEVEL=info
LOG_DIR=/var/log/dataanalyzer
```

**前端環境變數** (`frontend/.env.production`):

```bash
# API 端點（使用實際域名）
REACT_APP_API_URL=https://yourdomain.com/api

# 應用配置
REACT_APP_NAME=Data Analyzer
REACT_APP_VERSION=2.0.0

# 功能配置
REACT_APP_ENABLE_COLLABORATION=false
```

#### 4. 構建應用

```bash
# 構建前端
cd frontend
npm run build
cd ..

# 構建後端（TypeScript → JavaScript）
cd backend
npm run build
cd ..
```

#### 5. 配置 PM2

建立 PM2 配置檔 (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'dataanalyzer-backend',
      cwd: '/var/www/dataanalyzer/backend',
      script: 'dist/index.js',
      instances: 4,  // 使用 4 個實例（根據 CPU 核心數調整）
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/dataanalyzer/backend-error.log',
      out_file: '/var/log/dataanalyzer/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false
    }
  ]
};
```

啟動應用：

```bash
# 建立日誌目錄
sudo mkdir -p /var/log/dataanalyzer
sudo chown $USER:$USER /var/log/dataanalyzer

# 啟動 PM2
pm2 start ecosystem.config.js

# 查看狀態
pm2 status

# 查看日誌
pm2 logs dataanalyzer-backend

# 設定開機自動啟動
pm2 startup
pm2 save
```

#### 6. 配置 Nginx

建立 Nginx 配置檔 (`/etc/nginx/sites-available/dataanalyzer`):

```nginx
# 上游後端服務
upstream backend_api {
    least_conn;
    server localhost:3001;
}

# HTTP 伺服器（重導向到 HTTPS）
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # 重導向到 HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS 伺服器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 憑證（使用 Let's Encrypt 或其他 CA）
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全標頭
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日誌
    access_log /var/log/nginx/dataanalyzer-access.log;
    error_log /var/log/nginx/dataanalyzer-error.log;

    # 根目錄（前端構建檔案）
    root /var/www/dataanalyzer/frontend/build;
    index index.html;

    # 檔案上傳大小限制
    client_max_body_size 50M;

    # API 請求代理
    location /api {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout 設定（適合大檔案上傳）
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Socket.io（未來協作功能）
    location /socket.io {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 靜態檔案（前端）
    location / {
        try_files $uri $uri/ /index.html;

        # 靜態資源快取
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 匯出檔案（臨時）
    location /exports {
        alias /var/www/dataanalyzer/backend/exports;
        autoindex off;

        # 設定適當的 MIME 類型
        types {
            text/csv csv;
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet xlsx;
            image/png png;
            image/svg+xml svg;
        }
    }

    # 安全性：拒絕訪問敏感檔案
    location ~ /\. {
        deny all;
    }

    location ~ /\.env {
        deny all;
    }
}
```

啟用配置：

```bash
# 建立符號連結
sudo ln -s /etc/nginx/sites-available/dataanalyzer /etc/nginx/sites-enabled/

# 測試配置
sudo nginx -t

# 重新載入 Nginx
sudo systemctl reload nginx

# 確認 Nginx 開機自動啟動
sudo systemctl enable nginx
```

#### 7. 設定 SSL 憑證（Let's Encrypt）

```bash
# 安裝 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 取得 SSL 憑證
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 測試自動更新
sudo certbot renew --dry-run

# Certbot 會自動設定 cron job 進行憑證更新
```

---

## Docker 部署

### 方案 B: Docker Compose 部署（推薦）

#### 1. 建立 Dockerfile

**後端 Dockerfile** (`backend/Dockerfile`):

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製原始碼
COPY . .

# 構建 TypeScript
RUN npm run build

# 生產環境
FROM node:18-alpine

WORKDIR /app

# 複製構建結果和依賴
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 建立必要目錄
RUN mkdir -p uploads exports logs

# 設定非 root 使用者
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動應用
CMD ["node", "dist/index.js"]
```

**前端 Dockerfile** (`frontend/Dockerfile`):

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package.json
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製原始碼
COPY . .

# 構建生產版本
RUN npm run build

# 生產環境：使用 Nginx 服務靜態檔案
FROM nginx:1.24-alpine

# 複製構建結果
COPY --from=builder /app/build /usr/share/nginx/html

# 複製 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]
```

**前端 Nginx 配置** (`frontend/nginx.conf`):

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 靜態資源快取
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 2. 建立 Docker Compose 配置

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  # PostgreSQL 資料庫
  postgres:
    image: postgres:15-alpine
    container_name: dataanalyzer-postgres
    environment:
      POSTGRES_DB: dataanalyzer
      POSTGRES_USER: dataanalyzer_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - dataanalyzer-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dataanalyzer_user -d dataanalyzer"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 後端 API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dataanalyzer-backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_TYPE: postgresql
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: dataanalyzer
      DB_USER: dataanalyzer_user
      DB_PASSWORD: ${DB_PASSWORD}
      CORS_ORIGIN: ${FRONTEND_URL}
      SESSION_SECRET: ${SESSION_SECRET}
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - uploads_data:/app/uploads
      - exports_data:/app/exports
      - logs_data:/app/logs
    networks:
      - dataanalyzer-network
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 前端
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        REACT_APP_API_URL: ${API_URL}
    container_name: dataanalyzer-frontend
    networks:
      - dataanalyzer-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx 反向代理
  nginx:
    image: nginx:1.24-alpine
    container_name: dataanalyzer-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - exports_data:/var/www/exports:ro
    networks:
      - dataanalyzer-network
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  uploads_data:
    driver: local
  exports_data:
    driver: local
  logs_data:
    driver: local

networks:
  dataanalyzer-network:
    driver: bridge
```

**環境變數檔** (`.env`):

```bash
# 資料庫
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# 安全性
SESSION_SECRET=YOUR_SESSION_SECRET_HERE
JWT_SECRET=YOUR_JWT_SECRET_HERE

# URL 配置
FRONTEND_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api
```

**Nginx 配置** (`nginx/nginx.conf`):

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:3001;
    }

    server {
        listen 80;
        server_name _;

        client_max_body_size 50M;

        # 前端
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # 後端 API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeout for large file uploads
            proxy_connect_timeout 600;
            proxy_send_timeout 600;
            proxy_read_timeout 600;
        }

        # 匯出檔案
        location /exports {
            alias /var/www/exports;
            autoindex off;
        }
    }
}
```

#### 3. 啟動 Docker Compose

```bash
# 構建並啟動所有服務
docker-compose up -d --build

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f backend

# 停止服務
docker-compose down

# 停止並刪除資料卷（警告：會刪除所有數據）
docker-compose down -v
```

#### 4. 驗證部署

```bash
# 檢查容器健康狀態
docker-compose ps

# 測試前端
curl http://localhost

# 測試後端 API
curl http://localhost/api/health

# 進入容器內部（除錯）
docker-compose exec backend sh
docker-compose exec postgres psql -U dataanalyzer_user -d dataanalyzer
```

---

## 資料庫配置

### PostgreSQL 設定

#### 1. 建立資料庫和使用者

```sql
-- 以 postgres 超級使用者身分登入
sudo -u postgres psql

-- 建立使用者
CREATE USER dataanalyzer_user WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';

-- 建立資料庫
CREATE DATABASE dataanalyzer OWNER dataanalyzer_user;

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE dataanalyzer TO dataanalyzer_user;

-- 退出
\q
```

#### 2. 初始化資料表

**backend/init.sql**:

```sql
-- 上傳記錄表
CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    upload_id VARCHAR(255) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    row_count INTEGER NOT NULL,
    column_count INTEGER NOT NULL,
    columns JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 數據檢視表
CREATE TABLE IF NOT EXISTS data_views (
    id SERIAL PRIMARY KEY,
    view_id VARCHAR(255) UNIQUE NOT NULL,
    upload_id VARCHAR(255) NOT NULL,
    view_type VARCHAR(50) NOT NULL,  -- 'detailed' | 'grouped' (hierarchical removed in v2.0)
    config JSONB NOT NULL,
    row_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(upload_id) ON DELETE CASCADE
);

-- 建立索引
CREATE INDEX idx_uploads_upload_id ON uploads(upload_id);
CREATE INDEX idx_data_views_view_id ON data_views(view_id);
CREATE INDEX idx_data_views_upload_id ON data_views(upload_id);
```

執行初始化：

```bash
# 方式 1：直接執行 SQL 檔案
sudo -u postgres psql -d dataanalyzer -f backend/init.sql

# 方式 2：透過應用程式執行（需實作遷移機制）
cd backend
npm run migrate
```

#### 3. 資料庫備份與還原

**備份**:

```bash
# 完整備份
sudo -u postgres pg_dump dataanalyzer > backup_$(date +%Y%m%d_%H%M%S).sql

# 僅備份資料（不含結構）
sudo -u postgres pg_dump -a dataanalyzer > data_backup.sql

# 壓縮備份
sudo -u postgres pg_dump dataanalyzer | gzip > backup.sql.gz
```

**還原**:

```bash
# 還原備份
sudo -u postgres psql dataanalyzer < backup.sql

# 還原壓縮備份
gunzip -c backup.sql.gz | sudo -u postgres psql dataanalyzer
```

---

## 反向代理配置

（詳見上述 Nginx 配置章節）

### Apache 替代方案

若使用 Apache 而非 Nginx，配置如下：

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    # 重導向到 HTTPS
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    # SSL 配置
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # 前端靜態檔案
    DocumentRoot /var/www/dataanalyzer/frontend/build

    # API 代理
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    # Socket.io 代理
    ProxyPass /socket.io http://localhost:3001/socket.io
    ProxyPassReverse /socket.io http://localhost:3001/socket.io

    # 前端路由
    <Directory /var/www/dataanalyzer/frontend/build>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        # SPA 路由
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # 日誌
    ErrorLog ${APACHE_LOG_DIR}/dataanalyzer-error.log
    CustomLog ${APACHE_LOG_DIR}/dataanalyzer-access.log combined
</VirtualHost>
```

---

## SSL/TLS 配置

（詳見上述 Let's Encrypt 章節）

### 手動 SSL 憑證配置

若使用自簽憑證或商業 CA 憑證：

```bash
# 生成自簽憑證（僅用於測試）
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/dataanalyzer.key \
  -out /etc/ssl/certs/dataanalyzer.crt

# 更新 Nginx 配置指向新憑證
ssl_certificate /etc/ssl/certs/dataanalyzer.crt;
ssl_certificate_key /etc/ssl/private/dataanalyzer.key;
```

---

## 監控與日誌

### 1. 應用程式日誌

**PM2 日誌**:

```bash
# 即時查看日誌
pm2 logs dataanalyzer-backend

# 查看錯誤日誌
pm2 logs dataanalyzer-backend --err

# 清空日誌
pm2 flush
```

**應用程式日誌** (`backend/src/utils/logger.ts`):

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: '/var/log/dataanalyzer/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/var/log/dataanalyzer/combined.log'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 2. Nginx 日誌

```bash
# 即時查看訪問日誌
sudo tail -f /var/log/nginx/dataanalyzer-access.log

# 即時查看錯誤日誌
sudo tail -f /var/log/nginx/dataanalyzer-error.log

# 分析日誌（統計 IP、路徑等）
sudo cat /var/log/nginx/dataanalyzer-access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

### 3. 監控工具（可選）

**Prometheus + Grafana**:

```yaml
# docker-compose.yml 添加監控服務
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: dataanalyzer-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - dataanalyzer-network

  grafana:
    image: grafana/grafana:latest
    container_name: dataanalyzer-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - dataanalyzer-network

volumes:
  prometheus_data:
  grafana_data:
```

---

## 備份與復原

### 自動化備份腳本

**backup.sh**:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/dataanalyzer"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 備份資料庫
echo "Backing up database..."
sudo -u postgres pg_dump dataanalyzer | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# 備份上傳檔案
echo "Backing up uploads..."
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz /var/www/dataanalyzer/backend/uploads

# 備份匯出檔案
echo "Backing up exports..."
tar -czf $BACKUP_DIR/exports_$TIMESTAMP.tar.gz /var/www/dataanalyzer/backend/exports

# 刪除舊備份
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

**設定 Cron Job**:

```bash
# 編輯 crontab
crontab -e

# 每天凌晨 2 點執行備份
0 2 * * * /var/www/dataanalyzer/scripts/backup.sh >> /var/log/dataanalyzer/backup.log 2>&1
```

---

## 效能優化

### 1. Node.js 應用優化

- 使用 PM2 cluster 模式（多實例）
- 啟用 Gzip 壓縮
- 設定適當的記憶體限制（`max_memory_restart: '1G'`）
- 使用 Redis 快取（規劃中）

### 2. 資料庫優化

```sql
-- 分析查詢效能
EXPLAIN ANALYZE SELECT * FROM uploads WHERE upload_id = 'xxx';

-- 建立適當的索引
CREATE INDEX idx_uploads_created_at ON uploads(created_at);

-- 定期清理舊數據
DELETE FROM uploads WHERE created_at < NOW() - INTERVAL '30 days';
VACUUM ANALYZE uploads;
```

### 3. Nginx 優化

```nginx
# 啟用 Gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

# 設定 Worker Processes
worker_processes auto;

# 增加 Worker Connections
events {
    worker_connections 2048;
}

# 啟用快取
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;
```

---

## 故障排除

### 常見問題

**問題 1: 後端啟動失敗（資料庫連線錯誤）**

```bash
# 檢查 PostgreSQL 狀態
sudo systemctl status postgresql

# 檢查連線
sudo -u postgres psql -d dataanalyzer -c "SELECT 1;"

# 檢查環境變數
cat backend/.env.production | grep DB_
```

**問題 2: Nginx 502 Bad Gateway**

```bash
# 檢查後端是否運行
pm2 status

# 檢查後端端口
netstat -tlnp | grep 3001

# 檢查 Nginx 錯誤日誌
sudo tail -f /var/log/nginx/dataanalyzer-error.log
```

**問題 3: 檔案上傳失敗**

```bash
# 檢查目錄權限
ls -ld /var/www/dataanalyzer/backend/uploads

# 修正權限
sudo chown -R $USER:$USER /var/www/dataanalyzer/backend/uploads
chmod 755 /var/www/dataanalyzer/backend/uploads

# 檢查 Nginx 上傳大小限制
grep client_max_body_size /etc/nginx/sites-available/dataanalyzer
```

**問題 4: Docker 容器無法啟動**

```bash
# 查看容器日誌
docker-compose logs backend

# 檢查容器健康狀態
docker-compose ps

# 進入容器檢查
docker-compose exec backend sh

# 重建容器
docker-compose down
docker-compose up -d --build
```

---

## 總結

本部署指南涵蓋了 Data Analyzer 從開發到生產的完整部署流程。根據您的需求選擇適合的部署方案：

- **小型部署**: 傳統方式（PM2 + Nginx）
- **中大型部署**: Docker Compose
- **企業級部署**: Kubernetes（需額外配置）

如有任何部署問題，請參考：
- [系統架構文檔](ARCHITECTURE.md)
- [API 文檔](API_REFERENCE.md)
- [使用者指南](USER_GUIDE.md)

**祝您部署順利！**
