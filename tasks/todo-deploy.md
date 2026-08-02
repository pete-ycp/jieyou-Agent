# 任务：部署到 Render（应用）+ Aiven（MySQL）—— 免费方案

## 现状（已探明）
- **架构**：单体。React19 前端 + Hono/tRPC 后端，同一 Node 进程服务。
  - 构建：`npm run build` → 前端 `dist/public` + 后端 `dist/boot.js`。
  - 启动：`npm start` = `NODE_ENV=production node dist/boot.js`。
  - **端口读 `process.env.PORT`（默认 3000）** ✅ —— Render 自动注入 `$PORT`，兼容。
  - 生产模式下 `boot.ts` 内 `serveStaticFiles(app)` 直接托管 `dist/public`，无需额外静态服务器。
- **数据库**：Drizzle ORM + mysql2。连接 `api/queries/connection.ts`：
  ```ts
  drizzle(env.databaseUrl, { mode: "planetscale", schema: fullSchema })
  ```
  只传 URL，**无显式 SSL 选项**。
- **环境变量**（见 `.env.example`）：
  - `DATABASE_URL` —— MySQL 连接串（Drizzle 用）。
  - `APP_ID` / `APP_SECRET` —— 应用凭证（JWT 签名）。
  - `VITE_APP_ID` / `VITE_KIMI_AUTH_URL` —— 前端构建期注入（浏览器可见）。
  - `KIMI_AUTH_URL` / `KIMI_OPEN_URL` —— 后端 OAuth 地址。
  - `OWNER_UNION_ID` —— 店主 admin 角色（可选，演示可空）。
  - `AI_CONCIERGE_URL` / `AI_DRAFT_URL` —— **可选**，不配则小柴用内置兜底回复。
- **种子数据**：`db/seed.ts`（12 商品 / 12 内容 / 5 示例信件）。新库需灌一次。
- **Git**：当前在 `develop` 分支。Render 连 Git 仓库（GitHub/GitLab）。

## 两个已知风险（部署前必读）
1. **SSL 风险（高）**：Aiven 免费 MySQL **强制 TLS**。当前 `connection.ts` 只传 URL，未开 SSL。
   - 处置：URL 末尾带 `?ssl-mode=REQUIRED` 先试；若连接握手失败，则**最小改动**——给 drizzle 加 ssl 选项（见下方步骤 5）。
   - 不提前改代码，等 Aiven 实例建好实测后再定。
2. **Kimi OAuth 不随代码导出**：README 明确「Kimi 登录与平台数据库不随代码导出」。
   - 处置：演示部署先用占位 `APP_ID=local-dev`，**登录功能不可用**（其余商城/信箱/后台展示正常）。
   - 真实登录需你自行在 Kimi 平台申请 OAuth 应用并填回凭证 + `OWNER_UNION_ID`。

## Render 免费层限制（影响）
- Web Service 免费档：512MB RAM，**15 分钟无访问休眠**，下次访问冷启动 30~50s。
- 无独立「发布前钩子」（不像 Heroku release phase）→ 数据库迁移必须放进 **build 阶段**。
- 出站 TCP 不受限 → 连 Aiven MySQL 正常。

---

## 待办（Todo）

### A. 准备凭证（你来操作，我无法代注册）
- [ ] 1. **Aiven** 注册 → 建「Free plan」MySQL 服务 → 拿到连接串
      `mysql://avnadmin:PASS@HOST:PORT/defaultdb?ssl-mode=REQUIRED`（记下备用）。
- [ ] 2. **Render** 注册（GitHub/GitLab 账号即可，无需信用卡）。
- [ ] 3. 代码推到 GitHub 仓库（公开或私仓均可，Render 能拉即可）。

### B. 代码侧最小准备（我做）
- [ ] 4. 核对 `package.json` scripts 与 Render 的 build/start 命令对齐（无需改，确认即可）。
- [ ] 5. **SSL 适配（仅当步骤 8 连库失败时）**：改 `api/queries/connection.ts`，给 drizzle 调用补 ssl 选项。
      预案（一行级改动，不动其它逻辑）：
      ```ts
      instance = drizzle(env.databaseUrl, {
        mode: "planetscale",
        schema: fullSchema,
        // Aiven/云 MySQL 强制 TLS，显式开 SSL
        ssl: { rejectUnauthorized: true },
      });
      ```
      → 改完 commit → Render 自动重新构建。
- [ ] 6. 加一个 `.gitignore` 自检：确认 `.env` 不会进仓库（已忽略，确认即可）。

### C. Render Web Service 配置（你在面板操作，我给填值）
- [ ] 7. Render → New → **Web Service** → 连接 GitHub 仓库。
- [ ] 8. 填配置：
      | 项 | 值 |
      |---|---|
      | Runtime | Node |
      | Build Command | `npm install && npm run build && npm run db:push` |
      | Start Command | `npm start` |
      | Instance Type | Free |
- [ ] 9. Environment Variables（面板填）：
      | Key | Value |
      |---|---|
      | `NODE_ENV` | `production` |
      | `DATABASE_URL` | Aiven 连接串（步骤 1） |
      | `APP_ID` | `local-dev`（占位，见风险 2） |
      | `APP_SECRET` | 任意长随机串（JWT 签名用） |
      | `VITE_KIMI_AUTH_URL` | `https://auth.kimi.com` |
      | `VITE_APP_ID` | `local-dev` |
      | `KIMI_AUTH_URL` | `https://auth.kimi.com` |
      | `KIMI_OPEN_URL` | `https://open.kimi.com` |
      | `OWNER_UNION_ID` | （空，演示） |
      | `AI_CONCIERGE_URL` / `AI_DRAFT_URL` | （空，小柴走兜底） |
- [ ] 10. 点 **Create Web Service** → 等首次构建（含 `db:push` 建表）。

### D. 灌种子 + 验证（我做或 Render Shell）
- [ ] 11. 首次部署成功后，用 Render 的 **Shell** 跑一次：
      `npx tsx db/seed.ts`（灌 12 商品 + 内容 + 示例信）。
      注意：仅跑一次，避免重复灌。
- [ ] 12. 访问 Render 给的 `https://<service>.onrender.com`，冒烟测：
      - 首页加载（前端静态 OK）。
      - 商品列表 tRPC 查询返回（DB + SSL 通）。
      - 信箱页面、后台 `/admin` 展示正常。

### E.（可选，后续）真实登录 / AI 接入
- [ ] 13. 你在 Kimi 平台申请 OAuth 应用 → 把真实 `APP_ID/APP_SECRET/VITE_APP_ID/OWNER_UNION_ID` 填回 Render 环境变量 → 重建。
- [ ] 14. 若要小柴真聊：把 `jieyou-ai-concierge` 服务也部署（另起一个 Render/Railway 服务），URL 填 `AI_CONCIERGE_URL`。

---

## 不做的事
- 不伪造 Kimi OAuth / OWNER_UNION_ID（真实凭证需你提供）。
- 不提前改 `connection.ts`（等 Aiven SSL 实测）。
- 不动现有业务逻辑、不改 `.env`（生产凭证走 Render 面板，不落仓库）。

## Review
（待执行后补充：实际遇坑、SSL 是否要改、最终线上地址。）