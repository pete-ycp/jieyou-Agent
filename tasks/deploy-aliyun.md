# 解忧杂货店 · 阿里云部署手册

> 目标：在**一台阿里云轻量应用服务器**上同机部署两个服务——
> 电商主站 `jieyou-grocery-store`（Node）+ AI 解忧服务 `jieyou-ai-concierge`（Python）。
> 两者通过内网 `127.0.0.1` 通信，AI 端口不暴露公网。

---

## 0. 架构总览

```
阿里云轻量应用服务器（宝塔面板镜像 · cn-hangzhou）
│
├── jieyou-grocery-store   Node :3000   ← PM2 守护（Hono 同托管 API + 静态前端）
├── jieyou-ai-concierge    Python :8001 ← PM2 守护（FastAPI/uvicorn + LangGraph）
│
└── Nginx :80 / :443  →  反代到 :3000（对外站点）
        （AI 仅本机 127.0.0.1:8001，网站后端直连，不对外开放）
```

**关键事实（已读代码确认）**
- 主站：单 Node 进程，Hono 同时托管 tRPC API（`dist/boot.js`）+ 静态前端（`dist/public`）。
- 主站读 `process.env.PORT`（默认 3000），代码部署无关，零业务改动。
- 主站依赖外部 MySQL（`mysql2`，`mode: planetscale`，兼容标准 MySQL）。
- AI 服务可选——未配置走兜底回复，主站不报错；配上线后小柴给真回复。
- Node **≥ 20.11**（代码用 `import.meta.dirname`，`package.json` 已锁 `engines`）。
- AI 服务：Python **≥ 3.13** + uv，FastAPI + LangGraph + qwen 多模态 + Tavily 联网搜索。

---

## 1. 第一步：服务器准备（与镜像无关，立即做）

1. **拿公网 IP**：实例卡片顶部那串 `47.xxx.xxx.xxx`，记下。
2. **设 root 密码**：控制台 → 实例详情 →「更多」→「重置密码」→ 设一个 → **会要求重启**，确认后密码生效。
3. **放行端口**：实例详情 →「防火墙」→ 添加规则，放行：
   - `3000`（Node 主站，调试用，上线后可关）
   - `80` / `443`（域名 + HTTPS）
   - `8888` 或宝塔随机端口（宝塔面板入口，见应用详情提示）
   - ⚠️ **不要放行 8001**（AI 服务仅内网）

---

## 2. 进宝塔面板

1. 实例 `/app` 页 →「应用详情」，复制三样：
   - 面板地址（形如 `http://IP:端口/随机入口`）
   - 账号、密码
   - **需要放行的端口**（宝塔入口端口可能被随机化，按提示在防火墙补放行）
2. 浏览器开面板地址 → 登录 → 首次绑宝塔官网账号（免费注册）→ 同意协议。

---

## 3. 宝塔装软件

软件商店，装：
- **Nginx**
- **MySQL 8.0**
- **PM2管理器** → 装完进「设置」→ Node 版本装 **20.x 并切过去**（关键，别留 16/18，否则 `import.meta.dirname` 崩）。

---

## 4. 建库

宝塔 → 数据库 → 添加数据库：
- 库名 `jieyou`、编码 `utf8mb4`、设密码。
- 拼出连接串备用：`mysql://用户名:密码@127.0.0.1:3306/jieyou`

---

## 5. 部署主站 jieyou-grocery-store

### 5.1 推代码到远程仓库（前提）
本地仓库（`jieyou-grocery-store`）只有本地 commit，需先推远程：
```bash
git remote add origin <仓库地址>
git push -u origin develop
```

### 5.2 服务器拉代码 + 构建
宝塔终端（或软件商店装「Git」后）：
```bash
cd /www/wwwroot
git clone <仓库地址> jieyou-grocery-store
cd jieyou-grocery-store
npm ci
npm run build      # 前端 → dist/public，后端 → dist/boot.js
```

### 5.3 配主站 `.env`
项目根新建 `.env`（**勿提交**）：
```ini
APP_ID=你的Kimi应用ID
APP_SECRET=你的Kimi密钥
DATABASE_URL=mysql://用户名:密码@127.0.0.1:3306/jieyou
KIMI_AUTH_URL=https://auth.kimi.com
KIMI_OPEN_URL=https://open.kimi.com
OWNER_UNION_ID=
AI_CONCIERGE_URL=http://127.0.0.1:8001/chat
AI_DRAFT_URL=http://127.0.0.1:8001/draft-reply
```

### 5.4 建表 + 灌数据
```bash
npm run db:push        # drizzle 按 schema 建表（读 .env）
npx tsx db/seed.ts     # 灌商品/语录/信件示例数据
```

### 5.5 PM2 启动 + 开机自启
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup            # 复制它返回的命令再执行一次
pm2 logs jieyou-grocery-store   # 看到 "Server running on ...:3000" 即成功
```
浏览器开 `http://公网IP:3000` 验证首页加载。

---

## 6. 部署 AI 服务 jieyou-ai-concierge（同机 :8001）

### 6.1 服务器装 uv（自带 Python 3.13）
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env    # 让 uv 进 PATH
uv --version                   # 确认
```
> 国内拉 astral.sh 慢时备用：`pip install uv -i https://pypi.tuna.tsinghua.edu.cn/simple`

### 6.2 拉 AI 代码 + 装依赖
⚠️ 前提：AI 仓库先推远程。
```bash
cd /www/wwwroot
git clone <AI仓库地址> jieyou-ai-concierge
cd jieyou-ai-concierge
uv sync                        # 按 pyproject.toml 装依赖（清华源）
```

### 6.3 配 AI 的 `.env`
项目根新建 `.env`（参考项目 `.env.example`）：
```ini
AL_API_KEY=...
AL_BASE_URL=...
TAVILY_API_KEY=...
```

### 6.4 PM2 守护 AI 服务
```bash
pm2 start "uv run uvicorn app.main:app --host 127.0.0.1 --port 8001" \
  --name jieyou-ai-concierge \
  --cwd /www/wwwroot/jieyou-ai-concierge
pm2 save
pm2 logs jieyou-ai-concierge   # 看到 Uvicorn running on http://127.0.0.1:8001 即成功
```

### 6.5 网站接 AI
主站 `.env` 已是 `http://127.0.0.1:8001/chat`，重启即可：
```bash
pm2 restart jieyou-grocery-store
```

---

## 7. 域名 + HTTPS（推荐）

1. 阿里云 DNS → 域名 A 记录指向公网 IP。
2. 宝塔 → 网站 → 添加站点（填域名）→ 反向代理目标 `http://127.0.0.1:3000`。
3. 站点 SSL → Let's Encrypt 一键申请 → 开强制 HTTPS。

> AI 服务无需独立域名，仅内网被主站后端调用。

---

## 8. 验证清单

- [ ] `http://公网IP:3000` 或域名 → 首页加载（柴犬/夜景图）
- [ ] 登录走 Kimi OAuth 通
- [ ] AI 本机自测：
      ```bash
      curl -X POST http://127.0.0.1:8001/chat \
        -H "Content-Type: application/json" \
        -d '{"message":"我最近压力大","history":[],"requestId":"test"}'
      # 应返回 {"reply":"..."}
      ```
- [ ] 网站点小柴 → 真回复（不再走兜底文案）
- [ ] `pm2 status` 两个进程都 `online`
- [ ] 重启服务器后 PM2 自启两个进程

---

## 9. 坑预警

| # | 坑 | 解法 |
|---|---|---|
| 1 | Node 版本低 | PM2 管理器手动切 20.11+，否则 `import.meta.dirname` 崩 |
| 2 | `.env` 位置错 | 必须在项目根；PM2 配置 `cwd: __dirname` 已保证 dotenv 读到 |
| 3 | MySQL 密码含特殊字符 | `@#%` 等需 URL 编码，否则连接串解析挂 |
| 4 | 8001 开了公网 | **不要放行** 8001，仅本机访问 |
| 5 | uv 装的 Python 不在系统 PATH | PM2 用 `uv run` 包一层即可，别手找 python 路径 |
| 6 | AI 响应慢 | LangGraph + 模型调用 5-15s 正常；网站侧 30s 超时够 |
| 7 | 内存吃紧 | LangGraph SDK 比 Node 重，2核2G 可能卡 → 升 2核4G+ 或 AI 拆另一台 |

---

## 10. 常用运维命令

```bash
pm2 list                                # 看所有进程
pm2 logs                                # 实时日志（全部）
pm2 logs jieyou-grocery-store           # 单看主站
pm2 logs jieyou-ai-concierge            # 单看 AI
pm2 restart all                         # 重启所有
pm2 reload jieyou-grocery-store         # 零停机重启（如支持）
```

更新代码后重新部署：
```bash
cd /www/wwwroot/jieyou-grocery-store
git pull && npm ci && npm run build
pm2 restart jieyou-grocery-store

cd /www/wwwroot/jieyou-ai-concierge
git pull && uv sync
pm2 restart jieyou-ai-concierge
```

---

## 附：本次部署相关改动文件

| 文件 | 作用 |
|---|---|
| `package.json` | 锁 Node `>=20.11.0`（`engines`） |
| `ecosystem.config.cjs` | 主站 PM2 进程配置 |
| `render.yaml` | Render Blueprint 模板（阿里云方案下不用，保留无害） |
| `.gitignore` | 排除 `.env`/`node_modules`/IDE/系统文件 |
| `tasks/deploy-aliyun.md` | 本手册 |
```