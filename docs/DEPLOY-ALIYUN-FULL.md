# 解忧杂货店 · 阿里云部署完整流程

> 本文档记录 **解忧杂货店（jieyou-grocery-store）** 在阿里云轻量应用服务器上的完整部署流程，从零到网站上线。  
> 适合复盘、二次部署、或交给他人参考。
>
> **部署环境（本次实操）**
> - 服务器：阿里云轻量应用服务器
> - 系统：Alibaba Cloud Linux 3（`dnf` 包管理器）
> - 宝塔面板（应用镜像）
> - 部署目录：`/www/wwwroot/jieyou`
> - 服务端口：`3000`
> - 访问地址：`http://<服务器公网IP>:3000`

---

## 目录

1. [整体架构](#1-整体架构)
2. [架构结论（读代码确认）](#2-架构结论读代码确认)
3. [部署前准备](#3-部署前准备)
4. [逐步部署](#4-逐步部署)
   - [步骤 1：买服务器 + 选镜像](#步骤-1买服务器--选镜像)
   - [步骤 2：放行端口](#步骤-2放行端口)
   - [步骤 3：安装基础软件](#步骤-3安装基础软件)
   - [步骤 4：建库](#步骤-4建库)
   - [步骤 5：传代码](#步骤-5传代码)
   - [步骤 6：装依赖 + 构建](#步骤-6装依赖--构建)
   - [步骤 7：配置 .env](#步骤-7配置-env)
   - [步骤 8：推表 + 灌数据](#步骤-8推表--灌数据)
   - [步骤 9：PM2 启动服务](#步骤-9pm2-启动服务)
   - [步骤 10：浏览器访问](#步骤-10浏览器访问)
   - [步骤 11（可选）：Nginx 反代 + SSL](#步骤-11可选nginx-反代--ssl)
5. [登录账号](#登录账号)
6. [常见问题排查](#常见问题排查)
7. [运维命令速查](#运维命令速查)

---

## 1. 整体架构

```
            ┌──────────────────────────────────────┐
            │     阿里云轻量应用服务器              │
            │     (Alibaba Cloud Linux + 宝塔)      │
            │                                      │
浏览器 ───► │  Nginx(可选) :80/:443  ──┐            │
            │                          ▼            │
            │              PM2 守护进程              │
            │                   │                  │
            │                   ▼                  │
            │     Node 20 + Hono/tRPC :3000         │
            │     (dist/boot.js + dist/public)      │
            │                   │                  │
            │                   ▼                  │
            │            MySQL 8.0 :3306            │
            │            (数据库 jieyou)             │
            └──────────────────────────────────────┘
```

---

## 2. 架构结论（读代码确认）

- **单 Node Web 服务**：Hono 同托管 tRPC API（`dist/boot.js`）+ 静态前端（`dist/public`）。
- **端口**：读 `process.env.PORT`（默认 3000），宝塔/阿里云安全组放行端口即可。
- **数据库**：依赖 MySQL（`mysql2`，`mode: planetscale`，兼容标准 MySQL 8.0）。
- **AI 服务**（`AI_CONCIERGE_URL`/`AI_DRAFT_URL`）**可选** —— 未配走兜底回复，主站正常。
- **登录机制**：项目**自实现的账号密码登录**（scrypt 哈希 + JWT），**不依赖 Kimi 平台**。Kimi OAuth 是死代码旁路（前端无按钮调用）。
- **Node 版本**：**≥ 20.11**（代码用 `import.meta.dirname`，`package.json` 已锁 `engines`）。
- **生产启动校验**：`api/lib/env.ts` 在 `NODE_ENV=production` 时强制校验 `APP_ID`/`APP_SECRET`/`DATABASE_URL`/`KIMI_AUTH_URL`/`KIMI_OPEN_URL` 这 5 个变量非空。**即使功能上用不到 Kimi，这 5 个也必须给非空值**才能启动。

---

## 3. 部署前准备

### 3.1 必备信息清单

| 项 | 说明 |
|---|---|
| 服务器公网 IP | 阿里云控制台查看 |
| 服务器 root 密码 | 买服务器时设的；忘可在控制台「重置密码」 |
| 数据库密码 | 本部署自设（建议只用字母数字，避免特殊符号 `@ # : /`） |
| Git 仓库地址 | `https://github.com/pete-ycp/jieyou-Agent.git` |

### 3.2 推荐的密码字符规范

⚠️ `DATABASE_URL` 是 URL 格式，密码里**不能含** `@ # : /` 等特殊符号，否则 URL 解析报错。
建议密码只用 **字母 + 数字**（如 `jieyou2026X`）。

---

## 4. 逐步部署

### 步骤 1：买服务器 + 选镜像

1. 阿里云 → 轻量应用服务器 → 创建实例
2. 地域：选离用户近的（如华东）
3. 系统镜像：**Alibaba Cloud Linux**（或 Ubuntu 22.04）
4. 应用镜像：**宝塔面板**
5. 设置 root 密码并记好

### 步骤 2：放行端口

放行 **两处** 防火墙（缺一不可）：

**① 阿里云控制台防火墙**
- 控制台 → 轻量应用服务器 → 实例 → **防火墙** → 添加规则
- 协议 `TCP`，端口范围 `3000`（调试用）/ `80`、`443`（域名用）/ `8888`（宝塔），来源 `0.0.0.0/0`

**② 宝塔面板防火墙**
- 宝塔 → 安全 → 放行端口：`3000`、`80`、`443`、`8888`

### 步骤 3：安装基础软件

#### 3.1 SSH 登录服务器
```bash
ssh root@<服务器公网IP>
```
或用阿里云控制台「远程连接」/ 宝塔「终端」。

#### 3.2 安装 Node 20（系统级，命令行可用）

⚠️ **重要经验**：宝塔「Node.js 版本管理器」装的 Node 只在宝塔内部可见，**SSH 命令行用不了**。务必用下面的命令行方式装一套。

```bash
# 切 root
sudo -i

# 用 dnf 装 Node（走阿里云内网镜像，秒装）
dnf install -y nodejs

# 验证版本（需 ≥ 20.11）
node -v   # 应显示 v20.x
npm -v
```

如果 dnf 装的版本不够 20，用 `n` 升级：
```bash
npm install -g n
n 20
hash -r
node -v
```

#### 3.3 安装 git
```bash
dnf install -y git
git --version
```

#### 3.4 安装 PM2
```bash
npm install -g pm2
```

⚠️ **PM2 命令找不到的修复**（如果 `pm2 -v` 报 command not found）：
```bash
# 找到 npm 全局 bin 目录
npm root -g
# 假设输出 /www/server/nodejs/v20.18.3/lib/node_modules
# 则 bin 目录是 /www/server/nodejs/v20.18.3/bin，加进 PATH：

echo 'export PATH=/www/server/nodejs/v20.18.3/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
pm2 -v
```

#### 3.5 宝塔面板安装软件
宝塔 → 软件商店，安装：
- **MySQL 8.0**
- **Nginx**（步骤 11 反代用）

---

### 步骤 4：建库

宝塔面板 → **数据库** → **添加数据库**：

| 字段 | 值 |
|---|---|
| 数据库名 | `jieyou` |
| 用户名 | `jieyou` |
| 密码 | 自设强密码（**只用字母数字**，记好） |
| 访问权限 | **本地服务器** 或 **所有人** |
| 编码 | **`utf8mb4`** ⚠️（必须，支持 emoji 和中文） |

创建后，拼出 `DATABASE_URL`：
```
mysql://jieyou:你的密码@127.0.0.1:3306/jieyou
```

---

### 步骤 5：传代码

```bash
cd /www/wwwroot
git clone https://github.com/pete-ycp/jieyou-Agent.git jieyou
cd /www/wwwroot/jieyou
```

**国内服务器访问 GitHub 慢的替代方案**：
- 用镜像：`git clone https://ghproxy.com/https://github.com/pete-ycp/jieyou-Agent.git jieyou`
- 或宝塔面板上传项目 zip（**不要包含 `node_modules`**）后解压

**⚠️ 关键：切换到 develop 分支**（`ecosystem.config.cjs` 在 develop 分支，main 分支没有）：
```bash
cd /www/wwwroot/jieyou
git checkout develop
ls -la ecosystem.config.cjs   # 确认文件存在
```

验证关键文件齐全：
```bash
ls -la
# 应看到：package.json、package-lock.json、ecosystem.config.cjs、src/、db/
# 不应有：node_modules
```

---

### 步骤 6：装依赖 + 构建

```bash
cd /www/wwwroot/jieyou

# 装依赖（3-5 分钟，别打断）
npm ci

# 国内服务器慢可换镜像源：
# npm config set registry https://registry.npmmirror.com

# 构建（生成 dist/）
npm run build
```

验证构建产物：
```bash
ls -la dist
# 应看到：boot.js（服务端入口）、public/（前端静态文件）
```

---

### 步骤 7：配置 .env

#### 7.1 创建 .env

宝塔面板 → 文件 → `/www/wwwroot/jieyou/` → 复制 `.env.example` 改名为 `.env` → 编辑。

或 SSH 命令行：
```bash
cd /www/wwwroot/jieyou
cat > .env <<'EOF'
DATABASE_URL=mysql://jieyou:你的密码@127.0.0.1:3306/jieyou
APP_SECRET=jieyou_$3cr3t_K8y_2026_aBcDeFgH
APP_ID=local-jieyou
KIMI_AUTH_URL=https://auth.kimi.com
KIMI_OPEN_URL=https://open.kimi.com
OWNER_UNION_ID=
EOF
```

#### 7.2 字段说明

| 字段 | 是否必填 | 填什么 |
|---|---|---|
| `DATABASE_URL` | **必填** | `mysql://jieyou:密码@127.0.0.1:3306/jieyou`（连数据库） |
| `APP_SECRET` | **必填** | JWT 签名密钥，**设一个 30+ 字符强随机串** |
| `APP_ID` | 占位必填 | 不用 Kimi 就填 `local-jieyou`（启动校验要求非空） |
| `KIMI_AUTH_URL` | 占位必填 | `https://auth.kimi.com`（同上） |
| `KIMI_OPEN_URL` | 占位必填 | `https://open.kimi.com`（同上） |
| `OWNER_UNION_ID` | 可选 | 留空即可 |
| `ADMIN_PASSWORD` | 可选 | 管理员密码，不设默认 `admin123`（见步骤 8） |

> 💡 **为什么不用 Kimi 还要填它**：`api/lib/env.ts` 在生产模式把这 5 个变量都标成 `required`，任一为空启动即崩。其中只有 `DATABASE_URL`/`APP_SECRET` 是登录真用到的，其他 3 个填占位值即可。

#### 7.3 设置权限（安全）
```bash
chmod 600 /www/wwwroot/jieyou/.env
```

#### 7.4 验证
```bash
cat /www/wwwroot/jieyou/.env   # 检查内容
ls -la /www/wwwroot/jieyou/.env  # 应显示 -rw------- (只有 root 可读写)
```

---

### 步骤 8：推表 + 灌数据

⚠️ **重要**：本步**不要设置 `NODE_ENV=production`**，让脚本在 dev 模式跑（环境变量校验宽松）。

#### 8.1 推表结构
```bash
cd /www/wwwroot/jieyou
npm run db:push
```
看到 `[✓] Changes applied` 即成功。

#### 8.2 灌数据（运行 seed 脚本）

⚠️ **坑**：项目 `package.json` **没有 `db:seed` 脚本**，且没装 `tsx`/`ts-node`。需用 esbuild 编译后运行。**必须加 banner**（解决 mysql2 的 require 问题，与 `build` 脚本同款技巧）：

```bash
cd /www/wwwroot/jieyou

# 编译 seed.ts（注意整条命令，banner 不能省）
npx esbuild db/seed.ts --bundle --platform=node --format=esm --outfile=dist/seed.mjs --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);"

# 运行
node dist/seed.mjs
```

预期输出：
```
Seeding database...
Admin seeded → username: admin / password: admin123
Done.
```

灌入的数据：
- **12 件商品**（信纸文具/厨房日杂/治愈小物，各配店主手记）
- **6 条语录**
- **5 篇示例信件**
- **1 篇关于页**
- **1 个管理员账号**（`admin` / `admin123` 或你设的 `ADMIN_PASSWORD`）

---

### 步骤 9：PM2 启动服务

#### 9.1 启动
```bash
cd /www/wwwroot/jieyou
pm2 start ecosystem.config.cjs
```

预期输出（status 为 `online`）：
```
┌────┬──────────────────────┬──────┬───────────┐
│ id │ name                 │ ...  │ status    │
├────┼──────────────────────┼──────┼───────────┤
│ 0  │ jieyou-grocery-store │ ...  │ online    │
└────┴──────────────────────┴──────┴───────────┘
```

#### 9.2 验证服务
```bash
pm2 list                          # 确认 status: online，↺ 重启次数应为 0
curl http://127.0.0.1:3000        # 应返回 HTML（首页）
```

#### 9.3 持久化 + 开机自启
```bash
pm2 save        # 保存当前进程列表
pm2 startup     # 生成开机自启脚本
```

`pm2 startup` 会输出一条 `sudo env PATH=... pm2 startup ...` 命令，**复制粘贴执行那条命令**（部分系统会自动执行）。看到 `Command successfully executed` 即生效。

---

### 步骤 10：浏览器访问

打开浏览器访问：

> 🎉 **http://<服务器公网IP>:3000**

应看到「解忧杂货店」复古杂货店风格首页。

**打不开的排查**（curl 能返回 HTML 但浏览器打不开 = 端口没放行）：
1. 阿里云控制台 → 防火墙 → 放行 TCP `3000`
2. 宝塔面板 → 安全 → 放行端口 `3000`
3. 等 10 秒刷新浏览器

---

### 步骤 11（可选）：Nginx 反代 + SSL

让网站用域名 + HTTPS 访问，更专业更安全。

#### 11.1 绑域名
- 域名 DNS 解析 A 记录 → 服务器公网 IP

#### 11.2 宝塔建站 + 反代
1. 宝塔 → **网站** → **添加站点** → 域名填你的域名，**不要**创建数据库
2. 站点 → **设置** → **反向代理** → 添加反向代理：
   - 代理名称：`jieyou`
   - 目标URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
3. 启用反代

#### 11.3 配 SSL（免费 Let's Encrypt）
站点 → 设置 → **SSL** → **Let's Encrypt** → 申请 → 强制 HTTPS

完成后访问：`https://你的域名`

---

## 登录账号

灌数据脚本创建的管理员账号：

| 字段 | 值 |
|---|---|
| 用户名 | `admin` |
| 密码 | `admin123`（或在 `.env` 设 `ADMIN_PASSWORD` 自定义） |

---

## 常见问题排查

### Q1：`npm: command not found` / `node: command not found`
**原因**：宝塔装的 Node 只在宝塔内部可见，命令行用不了。  
**解决**：用 `dnf install -y nodejs` 在系统级装一套（见步骤 3.2）。

### Q2：`pm2: command not found`（但 `npm install -g pm2` 已执行）
**原因**：npm 全局 bin 目录不在 PATH 中。  
**解决**：
```bash
echo 'export PATH=$(npm root -g | sed "s|/lib/node_modules|/bin|"):$PATH' >> ~/.bashrc
source ~/.bashrc
```
或直接写死路径（见步骤 3.4）。

### Q3：`git: command not found`
**解决**：`dnf install -y git`

### Q4：`ecosystem.config.cjs` 不存在
**原因**：clone 默认是 main 分支，该文件在 develop 分支。  
**解决**：
```bash
cd /www/wwwroot/jieyou
git checkout develop
```

### Q5：seed 报 `Dynamic require of "node:buffer" is not supported`
**原因**：esbuild 用 ESM 格式，但 mysql2 内部用了 require。  
**解决**：编译时加 banner（见步骤 8.2），与项目 `build` 脚本同款。

### Q6：`npm run db:push` 报 `Access denied for user`
**原因**：数据库用户名/密码不对。  
**解决**：检查 `.env` 的 `DATABASE_URL` 密码与宝塔建的库一致。

### Q7：`npm run db:push` 报 `ECONNREFUSED 127.0.0.1:3306`
**原因**：MySQL 没启动。  
**解决**：宝塔 → 软件商店 → MySQL → 启动。

### Q8：PM2 启动报 `Missing required environment variable`
**原因**：生产模式校验 5 个必填变量，某个为空。  
**解决**：`cat .env` 检查 `APP_ID`/`APP_SECRET`/`DATABASE_URL`/`KIMI_AUTH_URL`/`KIMI_OPEN_URL` 都有非空值。

### Q9：PM2 状态是 `errored` 或一直重启
查日志定位：
```bash
pm2 logs jieyou-grocery-store --lines 50
```

### Q10：服务器重启后网站打不开
```bash
pm2 list              # 看进程在不在
pm2 resurrect         # 恢复保存的进程列表
# 若没自启，重新执行：
pm2 startup           # 复制输出的 sudo env 命令再执行一次
```

### Q11：浏览器打不开，但 curl 能返回 HTML
**原因**：端口没放行。放行两处：阿里云防火墙 + 宝塔安全（见步骤 2）。

---

## 运维命令速查

### PM2 操作
```bash
pm2 list                          # 查看所有进程
pm2 logs jieyou-grocery-store     # 实时日志（Ctrl+C 退出）
pm2 logs jieyou-grocery-store --lines 100   # 看最近 100 行
pm2 restart jieyou-grocery-store  # 重启
pm2 reload jieyou-grocery-store   # 零停机重启
pm2 stop jieyou-grocery-store     # 停止
pm2 delete jieyou-grocery-store   # 删除进程
pm2 monit                         # 实时监控面板
pm2 save                          # 保存进程列表（修改后必做）
```

### 更新代码后重新部署
```bash
cd /www/wwwroot/jieyou
git pull                          # 拉最新代码
npm ci                            # 依赖有变动时
npm run build                     # 重新构建
pm2 restart jieyou-grocery-store  # 重启服务
```

### 数据库相关
```bash
npm run db:push                   # 推表结构（schema 变动后）
node dist/seed.mjs                # 重灌数据（会清空 contents/products 表）
```

### MySQL 连接（命令行）
```bash
mysql -ujieyou -p jieyou          # 输密码后进入
# 在 mysql> 提示符下：
SHOW TABLES;
SELECT * FROM products;
EXIT;
```

### 查看服务状态
```bash
pm2 list                          # PM2 进程状态
curl http://127.0.0.1:3000        # 服务响应测试
systemctl status pm2-root         # 开机自启服务状态
```

### 日志位置
- PM2 进程日志：`/root/.pm2/logs/`
- 应用 stdout：`/root/.pm2/logs/jieyou-grocery-store-out.log`
- 应用 stderr：`/root/.pm2/logs/jieyou-grocery-store-error.log`

---

## 文件结构参考

```
/www/wwwroot/jieyou/
├── .env                    # 环境变量（chmod 600，勿提交）
├── .env.example            # 模板
├── ecosystem.config.cjs    # PM2 配置（develop 分支才有）
├── package.json
├── drizzle.config.ts       # drizzle-kit 配置（读 DATABASE_URL）
├── dist/                   # 构建产物
│   ├── boot.js            # 服务端入口（PM2 启动这个）
│   ├── seed.mjs           # seed 编译产物（手工生成）
│   └── public/            # 前端静态资源
├── db/
│   ├── schema.ts          # 数据库 schema
│   ├── seed.ts            # 种子数据脚本
│   └── migrations/
├── api/                    # 后端源码
│   ├── boot.ts            # 服务入口
│   ├── lib/env.ts         # 环境变量校验（生产模式严格）
│   └── ...
└── src/                    # 前端源码
```

---

## 部署checklist（精简版）

- [ ] 服务器：Alibaba Cloud Linux + 宝塔镜像
- [ ] 防火墙放行：3000 / 80 / 443 / 8888（阿里云 + 宝塔两处）
- [ ] Node 20+（`dnf install nodejs`，命令行可用）
- [ ] git（`dnf install git`）
- [ ] pm2（`npm install -g pm2`，PATH 配好）
- [ ] MySQL 8.0（宝塔装，运行中）
- [ ] 数据库 `jieyou`（utf8mb4 编码）
- [ ] 代码 clone 到 `/www/wwwroot/jieyou`，**切到 develop 分支**
- [ ] `npm ci && npm run build`
- [ ] `.env` 配齐 5 个必填变量，`chmod 600`
- [ ] `npm run db:push` 推表
- [ ] esbuild 编译 + 运行 `seed.mjs` 灌数据
- [ ] `pm2 start ecosystem.config.cjs`（status: online）
- [ ] `pm2 save && pm2 startup`（开机自启）
- [ ] 浏览器访问 `http://IP:3000` 验证
- [ ] 登录测试（admin / admin123）
- [ ] （可选）Nginx 反代 + SSL 绑域名
