# 任务：本地账号登录（替换 Kimi OAuth）

Spec：`docs/superpowers/specs/2026-07-31-local-login-design.md`

## Todo
- [x] 1. `db/schema.ts`：users 加 `passwordHash` 列。
- [x] 2. `npm run db:push` 同步列。
- [x] 3. 新建 `api/lib/password.ts`（scrypt hash/verify）。
- [x] 4. `api/auth-router.ts`：加 `register` + `login` mutation。
- [x] 5. `db/seed.ts`：upsert admin（admin / ADMIN_PASSWORD??admin123）。
- [x] 6. 重跑 seed（重置库）。
- [x] 7. `src/pages/Login.tsx`：改用户名/密码表单。
- [x] 8. 新增 `src/pages/Register.tsx` + `App.tsx` 路由。
- [x] 9. `Navbar.tsx`：「Kimi 登录」→「登录」。
- [x] 10. 重启 dev，端到端验证（注册/登录/admin）。

## Review
### 改了什么
- **`db/schema.ts`**：users 表加 `passwordHash varchar(255)`（nullable）。用户名复用 `unionId` 字段。
- **`api/lib/password.ts`（新）**：Node `crypto.scrypt` 异步哈希/校验，`salt.hash` 格式，`timingSafeEqual` 防时序侧信道。零新依赖。
- **`api/queries/users.ts`**：加 `createUser`（注册）、`updateLastSignIn`（登录刷新）、`publicUser`（剔除 passwordHash）。
- **`api/auth-router.ts`**：新增 `auth.register` / `auth.login`（publicQuery，zod 校验），复用 `signSessionToken`/cookie/me/logout 全链路。**所有返回前用 `publicUser` 剥离 passwordHash**。
- **`db/seed.ts`**：末尾 upsert admin（username=`admin`，密码=`ADMIN_PASSWORD ?? admin123`，role=admin）。
- **前端**：`Login.tsx` 改用户名/密码表单；新增 `Register.tsx` + `/register` 路由；`Navbar.tsx` 两处「Kimi 登录」→「登录」。

### 关键设计
本地登录仍签发**带 `unionId` 的 HS256 JWT**，写同名 cookie `kimi_sid`。`authenticateRequest` 按 unionId 查用户 → **context / 中间件 / auth.me / 所有 authed 查询零改动**。Kimi OAuth 后端代码留 dormant（未接线），改动面最小。

### 验证（全绿）
- `auth.login admin/admin123` → 200 + Set-Cookie `kimi_sid` + 返回 user（无 passwordHash）。
- `auth.me` 带 cookie → 返回 admin（unionId/role/name），无 passwordHash。
- 错误密码 → 401；重复注册 → 409；新注册 `tester` → role:user。
- **浏览器**：/login 填 admin/admin123 → 跳首页，Navbar 出现「店主工作台」(/admin) + 「店主」+「退出登录」。

### 默认账号
- 用户名 `admin` / 密码 `admin123`（可用 `.env` 的 `ADMIN_PASSWORD` 覆盖后重跑 seed）。

### 运行
- dev 服务器后台任务 `b1srfbf76`，当前监听 **http://localhost:3002**（3001 被旧进程占着，自动让到 3002）。

### 遗留（非本次任务）
`npm run check` 有两个**预存**报错（与登录无关）：`src/pages/Letters.tsx` 未用 import `KeyRound`、`src/pages/ProductDetail.tsx` toFixed on never。不影响 dev 运行；构建前需清理，可另开任务处理。