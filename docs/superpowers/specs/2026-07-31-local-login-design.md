# 本地账号登录设计（替换 Kimi OAuth）

> 日期：2026-07-31
> 目标：用本地用户名+密码登录替换 Kimi OAuth，最小改动复用现有 JWT session 链路。

## 背景
现登录走 Kimi OAuth：前端 `Login.tsx` 跳 Kimi 授权 → 回调 `createOAuthCallbackHandler` 换 token、验 JWKS、upsert 用户、签 session token、写 cookie。`authenticateRequest` 读 cookie → `verifySessionToken` 取 `unionId` → `findUserByUnionId`。

## 核心思路
本地登录仍签发**带 `unionId` 的 HS256 token**（jose，secret=`APP_SECRET`），写同名 cookie `kimi_sid`。因 `authenticateRequest` 按 unionId 查用户，下游 context / 中间件 / `auth.me` / 所有 authed 查询**零改动**。用户名复用 `users.unionId`（唯一）。

## 改动清单

### 1. 数据库 `db/schema.ts`
- `users` 加 `passwordHash: varchar("passwordHash", { length: 255 })`（nullable）。OAuth 老用户为 null。
- `npm run db:push` 自动 ALTER。

### 2. 密码哈希 `api/lib/password.ts`（新）
- `hashPassword(plain): Promise<string>` — `crypto.scrypt`，随机 16B 盐，输出 `${saltB64}.${hashB64}`。
- `verifyPassword(plain, stored): Promise<boolean>`。
- 异步，不阻塞事件循环。**零新依赖**（Node 内置）。

### 3. 后端 `api/auth-router.ts`
保留 `me` / `logout`，新增：
- `register { username(3-32, [a-zA-Z0-9_-]), password(6-128), name? }` → 用户名未占用 → 建 user(unionId=username, name, passwordHash, role=user) → sign → setCookie → return user。
- `login { username, password }` → findUserByUnionId → passwordHash 存在且 verify 通过 → 更新 lastSignInAt → sign → setCookie → return user。失败抛 BAD_REQUEST/UNAUTHORIZED。
- 复用 `signSessionToken({ unionId, clientId: env.appId })`、`getSessionCookieOptions`、`Session.cookieName`、`Session.maxAgeMs`。zod 校验输入。

### 4. 种子管理员 `db/seed.ts`
- 末尾 upsert：unionId=`admin`，passwordHash=hash(`process.env.ADMIN_PASSWORD ?? "admin123"`)，role=`admin`，name=`店主`。
- 保留现有 OWNER_UNION_ID 提权逻辑兼容。

### 5. 前端
- `src/pages/Login.tsx`：表单（username/password）→ `auth.login` → 成功 `utils.invalidate()` + navigate(`searchParams.from || "/"`)；「去注册」链接 /register。
- `src/pages/Register.tsx`（新）+ `App.tsx` 路由 `/register`：表单 → `auth.register` → 成功跳 /login 或直接登录态。
- `src/components/Navbar.tsx`：「Kimi 登录」→「登录」。

## 不动
`api/context.ts`、`api/middleware.ts`、所有业务 router、`api/kimi/*`（dormant）、OAuth callback 路由、`useAuth`（仍 auth.me/logout）。

## 验证
- `curl /api/trpc/auth.login`（tRPC GET/mutation）→ 验 Set-Cookie `kimi_sid`。
- 浏览器：注册 → 登录 → `/admin`（admin 账号）可进；普通用户 `/admin` 被挡。
- `auth.me` 携带 cookie 返回 user。

## 风险/边界
- scrypt 用异步回调包装为 Promise，避免阻塞。
- 用户名精确匹配，不做大小写归一（简单）。
- admin 默认密码弱（`admin123`），文档提示生产改 `ADMIN_PASSWORD`。