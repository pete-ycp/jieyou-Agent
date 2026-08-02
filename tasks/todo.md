# 任务：安装依赖并运行项目

## 现状（已探明）
- 项目类型：React 19 + TS + Vite 7（前端）+ Hono + tRPC 11（后端，dev 模式由 `@hono/vite-dev-server` 一体运行）。
- Node v24.9.0（满足 ≥20 要求），npm 11.6.0。
- `node_modules/` 已存在（313 项），但 **`node_modules/.bin/vite` 缺失** → 安装不完整，需重装。
- **无 `.env` 文件**。
- `api/lib/env.ts` 中 `required()` 仅在 production 下抛错；dev 模式缺变量只返回空串 → **dev 服务器可不配 .env 启动**。
- DB（mysql2）懒连接，仅查询时报错，不崩服务。

## 运行前提的影响
- 仅跑前端展示页：✅ 无需 .env、无需 MySQL。
- 后端功能（登录、商城、购物车、订单、信箱）：❌ 需 MySQL + `.env`（DATABASE_URL + Kimi OAuth 凭证）。这些需用户提供真实凭证，本次不配。

## 待办（Todo）
- [x] 1. `npm install` —— 重新安装依赖（修复缺失的 .bin 链接）。
- [x] 2. `npm run dev` —— 启动 Vite 开发服务器（前后端一体，HMR），端口 3000。
- [x] 3. 冒烟测试 —— 访问 http://localhost:3000，确认页面 HTML 正常返回。

## 不做的事
- 不创建/伪造 `.env`（真实 Kimi OAuth + MySQL 凭证需你提供）。
- 不执行 `db:push` / seed（需 MySQL）。

## Review
### 做了什么
1. **修复死镜像源**：`package-lock.json`（v3）中 177 个包的 `resolved` URL 指向失效镜像 `https://npm.mirrors.msh.team`（ENOTFOUND），导致 `npm install` 全部抓取失败并崩溃（"Exit handler never called!"）。把该 host 全量替换为可用源 `https://registry.npmmirror.com`（已备份 `package-lock.json.bak`）。这是最小改动——仅替换死 host，不动版本与 integrity 哈希。
2. **重装依赖**：删除不完整的 `node_modules`（缺 `node_modules/.bin/vite`），`npm install` 成功，新增 704 包，vite 可执行已恢复。
3. **启动 dev 服务器**：`npm run dev`，Vite v7.3.0 就绪，监听 http://localhost:3000。
4. **冒烟测试**：`GET /` 返回 200，标题「解忧杂货店 · 浪矢杂货店」，`#root` 挂载点存在 → 前端正常服务。

### 运行状态（前端）
- 初次 dev 任务 `b1yg8pliw` 已停。重启见下方。

---

# 任务（续）：启动后端服务

## 待办
- [x] 1. 起 MySQL（Docker 容器，本地 `mysql:8.0` 镜像）。
- [x] 2. 写 `.env`（DATABASE_URL 指向容器；OAuth 占位）。
- [x] 3. `npm run db:push` 建表。
- [x] 4. `npx tsx db/seed.ts` 灌种子数据。
- [x] 5. 起 dev 服务器（前后端一体），冒烟测 tRPC。

## Review（后端）
- **MySQL 容器**：`jieyou-mysql`（mysql:8.0），端口 3306→3306，root/root，库 `jieyou`。本地镜像秒起，无需拉取。
- **`.env`**：新建于项目根。`DATABASE_URL=mysql://root:root@localhost:3306/jieyou`。OAuth 字段用占位值——dev 模式 `required()` 不抛错。
- **建表**：`db:push` 成功，7 张表（users/products/cart_items/orders/order_items/letters/contents）。
- **种子**：12 商品 + 12 内容（6 语录 + 5 故事 + 1 关于）。
- **端口冲突**：宿主机 3000 被 `docker-chatollama-1` 占用。dev 改跑 **3001**（tRPC client 用相对 `/api/trpc`，换端口无影响）。
- **冒烟测试**（http://localhost:3001）：
  - `GET /` → 200
  - `/api/trpc/ping` → `{ok:true}`
  - `/api/trpc/shop.featured` → 8 件商品
  - `/api/trpc/content.quotes` → 6 条语录

## 运行状态（当前）
- dev 服务器后台任务 ID：`by2mtkx8x`，监听 **http://localhost:3001**。
- MySQL 容器 `jieyou-mysql` 运行中。

## 限制（需注意）
- **登录不可用**：OAuth 用占位值。要登录进 `/admin` 需真实 Kimi OAuth 凭证 + `OWNER_UNION_ID`。
- **购物车/订单**：依赖登录态，未登录时不可用。
- 商城浏览、商品详情、语录、示例信件、关于页等**公开内容已全部可用**。