# 阿里云部署清单 — jieyou-grocery-store（轻量应用服务器 + 宝塔）

## 架构结论（已读代码确认）
- 单 Node Web 服务：Hono 同托管 tRPC API（`dist/boot.js`）+ 静态前端（`dist/public`）。
- 读 `process.env.PORT`（默认 3000），宝塔/阿里云安全组放行端口即可。
- 依赖 MySQL（`mysql2`，`mode: planetscale`，兼容标准 MySQL）。
- AI 服务（`AI_CONCIERGE_URL`/`AI_DRAFT_URL`）**可选**——未配走兜底回复，主站正常。
- Node **≥ 20.11**（代码用 `import.meta.dirname`，`package.json` 已锁 `engines`）。

## TODO

- [ ] 1. 买轻量应用服务器：地域选近的，系统镜像选 **Ubuntu 22.04**，应用镜像选 **宝塔面板**。
- [ ] 2. 安全组 / 防火墙放行端口：`80`（nginx）、`443`（HTTPS）、`3000`（直连调试，可关）、宝塔面板端口（如 8888）。
- [ ] 3. 宝塔面板装「软件」：**Node.js 版本管理器**（装 20.11+）、**MySQL 8.0**、**PM2 管理器**、**Nginx**。
- [ ] 4. 建库：宝塔 MySQL 建数据库 `jieyou` + 账号，拿到 `DATABASE_URL`（形如 `mysql://user:pass@127.0.0.1:3306/jieyou`）。
- [ ] 5. 传代码：`git clone` 到服务器（或宝塔文件管理上传）。
- [ ] 6. 装依赖 + 构建：`npm ci && npm run build`。
- [ ] 7. 配 `.env`（生产值，**勿提交**）：
      - 必填：`APP_ID` `APP_SECRET` `DATABASE_URL` `KIMI_AUTH_URL` `KIMI_OPEN_URL`
      - 可选：`OWNER_UNION_ID` `AI_CONCIERGE_URL` `AI_DRAFT_URL`
      - （`VITE_*` 是构建期变量，前端打包时已烤进 `dist/public`，运行时不读）
- [ ] 8. 推表 + 灌数据：`npm run db:push`，再跑 `db/seed.ts`。
- [ ] 9. 启动：`pm2 start ecosystem.config.cjs` → `pm2 save` → `pm2 startup`（开机自启）。
- [ ] 10.（可选）宝塔 Nginx 反代 `域名 → 127.0.0.1:3000`，配免费 SSL。
- [ ] 11. 冒烟测试：访问域名 → 首页 → 登录 → 小柴聊天。

## 复核
### 已做改动（极小）
1. `package.json`：加 `"engines": { "node": ">=20.11.0" }`。
2. `ecosystem.config.cjs`（新增）：PM2 进程配置，声明入口 `dist/boot.js` + 工作目录（确保读到 `.env`）。
3. `render.yaml`：上一版 Render 方案遗留，阿里云用不到，**保留无害**（如确定只走阿里云可删）。

### 关键提醒
- Node 必须 ≥ 20.11，否则 `import.meta.dirname` 报错。
- `dotenv` 默认读 `process.cwd()/.env` → PM2 `cwd: __dirname` 保证读到项目根。
- MySQL 用本机（宝塔）即可，无需额外买 RDS；`mode: planetscale` 兼容标准 MySQL。
- 绑域名走 Nginx 反代最稳；不绑就直连 `IP:3000`。
- AI 服务独立项目 `jieyou-ai-concierge`，要真回复单独部署后回填 URL。