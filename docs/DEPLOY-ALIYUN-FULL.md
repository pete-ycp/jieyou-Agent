# 解忧杂货店 · 阿里云部署完整流程

> 本文档记录 **解忧杂货店** 在阿里云轻量应用服务器上的完整部署流程，从零到网站 + AI 服务上线。  
> 适合复盘、二次部署、或交给他人参考。
>
> **本部署涉及两个项目（同机部署）**
> - **主站** `jieyou-grocery-store`：Node + Hono + tRPC + MySQL（商品/登录/下单/信件）
> - **AI 服务** `jieyou-ai-concierge`：Python + LangGraph（小柴聊天 + AI 起草回信）
>
> **部署环境（本次实操）**
> - 服务器：阿里云轻量应用服务器
> - 系统：Alibaba Cloud Linux 3（`dnf` 包管理器）
> - 宝塔面板（应用镜像）
> - 主站目录：`/www/wwwroot/jieyou`（端口 `3000`）
> - AI 服务目录：`/www/wwwroot/jieyou-ai-concierge`（端口 `8001`，仅本机访问）
> - 访问地址：`http://<服务器公网IP>:3000`

---

## 目录

1. [整体架构](#1-整体架构)
2. [架构结论（读代码确认）](#2-架构结论读代码确认)
3. [部署前准备](#3-部署前准备)
4. [逐步部署 · 主站](#4-逐步部署--主站)
   - [步骤 1：买服务器 + 选镜像](#步骤-1买服务器--选镜像)
   - [步骤 2：放行端口](#步骤-2放行端口)
   - [步骤 3：安装基础软件](#步骤-3安装基础软件)
   - [步骤 4：建库](#步骤-4建库)
   - [步骤 5：传代码](#步骤-5传代码)
   - [步骤 6：装依赖 + 构建](#步骤-6装依赖--构建)
   - [步骤 7：配置 .env](#步骤-7配置-env)
   - [步骤 8：推表 + 灌数据](#步骤-8推表--灌数据)
   - [步骤 9：PM2 启动主站](#步骤-9pm2-启动主站)
   - [步骤 10：浏览器访问](#步骤-10浏览器访问)
5. [逐步部署 · AI 服务](#5-逐步部署--ai-服务)
   - [步骤 11：装 uv（Python 包管理器）](#步骤-11装-uvpython-包管理器)
   - [步骤 12：clone AI 服务代码](#步骤-12clone-ai-服务代码)
   - [步骤 13：装 Python 依赖](#步骤-13装-python-依赖)
   - [步骤 14：配置 AI 服务 .env](#步骤-14配置-ai-服务-env)
   - [步骤 15：PM2 启动 AI 服务](#步骤-15pm2-启动-ai-服务)
   - [步骤 16：主站对接 AI 服务](#步骤-16主站对接-ai-服务)
6. [步骤 17（可选）：Nginx 反代 + SSL](#步骤-17可选nginx-反代--ssl)
7. [登录账号](#登录账号)
8. [常见问题排查](#常见问题排查)
9. [运维命令速查](#运维命令速查)

---

## 1. 整体架构

```
            ┌──────────────────────────────────────────────────┐
            │       阿里云轻量应用服务器                        │
            │       (Alibaba Cloud Linux + 宝塔)                │
            │                                                  │
浏览器 ───► │  Nginx(可选) :80/:443  ──┐                       │
            │                          ▼                       │
            │              PM2 守护进程（管 2 个服务）          │
            │                   │                              │
            │         ┌─────────┴──────────┐                   │
            │         ▼                    ▼                   │
            │  主站 Node :3000      AI 服务 Python :8001       │
            │  (Hono/tRPC)         (LangGraph + FastAPI)       │
            │  (dist/boot.js)      (uvicorn app.main:app)      │
            │         │                    │                   │
            │         │                    ├─ qwen 模型 API    │
            │         │                    ├─ Tavily 搜索 API  │
            │         │                    └─ 阿里云 OSS       │
            │         │                                        │
            │         ▼                                        │
            │       MySQL 8.0 :3306                            │
            │       (数据库 jieyou)                             │
            └──────────────────────────────────────────────────┘
```

**两个服务的通信关系**：
- 主站收到「小柴聊天」请求 → 通过 `127.0.0.1:8001/chat` 调 AI 服务 → AI 服务调模型/搜索 → 返回回复
- AI 服务端口 `8001` **仅本机访问**，不对外暴露（安全）

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
| 主站 Git 仓库 | `https://github.com/pete-ycp/jieyou-Agent.git`（develop 分支） |
| AI 服务 Git 仓库 | `https://github.com/pete-ycp/jieyou-Agent1.git`（develop 分支） |
| **AL_BASE_URL** | qwen 模型 API 地址（阿里云 MaaS，形如 `https://xxx.maas.aliyuncs.com/compatible-mode/v1`） |
| **AL_API_KEY** | qwen 模型 API Key（阿里云 MaaS 长令牌） |
| **TAVILY_API_KEY** | Tavily 联网搜索 API Key |
| **OSS_ACCESS_KEY_ID** | 阿里云 OSS AccessKey ID（图片上传用） |
| **OSS_ACCESS_KEY_SECRET** | 阿里云 OSS AccessKey Secret |
| **OSS_BUCKET** | 阿里云 OSS Bucket 名称 |

> 🔒 以上 6 个 API Key/OSS 凭证都属于敏感信息，**不要提交到 git**，只在服务器 `.env` 里配置。

### 3.2 推荐的密码字符规范

⚠️ `DATABASE_URL` 是 URL 格式，密码里**不能含** `@ # : /` 等特殊符号，否则 URL 解析报错。
建议密码只用 **字母 + 数字**（如 `jieyou2026X`）。

---

## 4. 逐步部署 · 主站

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

### 步骤 9：PM2 启动主站

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

### 步骤 10：浏览器访问（主站验证）

打开浏览器访问：

> 🎉 **http://<服务器公网IP>:3000**

应看到「解忧杂货店」复古杂货店风格首页。

**打不开的排查**（curl 能返回 HTML 但浏览器打不开 = 端口没放行）：
1. 阿里云控制台 → 防火墙 → 放行 TCP `3000`
2. 宝塔面板 → 安全 → 放行端口 `3000`
3. 等 10 秒刷新浏览器

---

## 5. 逐步部署 · AI 服务

> AI 服务（`jieyou-ai-concierge`）是独立的 Python 项目，提供「小柴聊天」和「AI 起草回信」两个能力。  
> **不部署也能用主站**——主站会走兜底回复（"小柴暂时不在"）。要真实的 AI 回复才需要部署本服务。

### 步骤 11：装 uv（Python 包管理器）

⚠️ **重要经验**：
- 系统自带 Python 是 3.6.8（2018 老版本），项目要求 **3.13+**，但**不用手动装 Python**——`uv` 会自动下载管理 Python 3.13。
- `uv` 是 Rust 写的独立二进制，不依赖系统 Python 版本。

#### 11.1 下载 uv 二进制

国内服务器访问 GitHub 慢，**必须用加速镜像**（`astral.sh` 官方源和 pip 源都装不上）：

```bash
# 用 ghfast 加速镜像下载预编译二进制（推荐，13 秒下完）
curl -L https://ghfast.top/https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-gnu.tar.gz -o /tmp/uv.tar.gz

# 备选镜像（ghfast 不通用换这个）：
# curl -L https://gh-proxy.com/https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-gnu.tar.gz -o /tmp/uv.tar.gz
```

预期：`20.7M` 大小，速度 1MB/s+。

#### 11.2 解压安装

```bash
mkdir -p /tmp/uv-extract
tar -xzf /tmp/uv.tar.gz -C /tmp/uv-extract
mv /tmp/uv-extract/uv-x86_64-unknown-linux-gnu/uv /usr/local/bin/uv
mv /tmp/uv-extract/uv-x86_64-unknown-linux-gnu/uvx /usr/local/bin/uvx
chmod +x /usr/local/bin/uv /usr/local/bin/uvx
```

#### 11.3 把 `/usr/local/bin` 加进 PATH（关键）

⚠️ **坑**：Alibaba Cloud Linux 默认 PATH **不包含 `/usr/local/bin`**，uv 装那里会 `command not found`。

```bash
echo 'export PATH=/usr/local/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
uv --version   # 应显示 uv 0.12.x
```

---

### 步骤 12：clone AI 服务代码

```bash
cd /www/wwwroot
git clone https://github.com/pete-ycp/jieyou-Agent1.git jieyou-ai-concierge
cd /www/wwwroot/jieyou-ai-concierge
git checkout develop
ls -la   # 应看到 app/、pyproject.toml、uv.lock
```

> 💡 GitHub 慢用镜像：`git clone https://ghfast.top/https://github.com/pete-ycp/jieyou-Agent1.git jieyou-ai-concierge`

---

### 步骤 13：装 Python 依赖

```bash
cd /www/wwwroot/jieyou-ai-concierge
uv sync
```

⚠️ **这步会**：
1. 自动下载 Python 3.13（约 50MB，从 GitHub，可能耗时几分钟）
2. 创建 `.venv/` 虚拟环境
3. 从清华源装所有依赖（langchain/langgraph/fastapi 等大包）

**总耗时 5-15 分钟**，别打断。无报错即成功。

---

### 步骤 14：配置 AI 服务 .env

#### 14.1 创建 db 目录（关键，否则启动必崩）

⚠️ **大坑**：项目用相对路径 `./db/Relieving_Sorrow.db` 连 sqlite，但 `db/` 目录被 git 忽略（git 不跟踪空目录），clone 后**目录不存在** → sqlite 报 `unable to open database file` → 服务反复崩溃。

```bash
mkdir -p /www/wwwroot/jieyou-ai-concierge/db
```

> 💡 sqlite 首次连接会自动建空库，只需保证父目录存在。

#### 14.2 创建 .env

```bash
cd /www/wwwroot/jieyou-ai-concierge
cat > .env <<'EOF'
# 模型（qwen 多模态，OpenAI 兼容协议）
AL_BASE_URL=https://xxx.maas.aliyuncs.com/compatible-mode/v1
AL_API_KEY=你的长令牌

# 联网搜索
TAVILY_API_KEY=tvly-xxxxx

# OSS（图片上传，用户给小柴发图片时用）
OSS_ACCESS_KEY_ID=你的AK
OSS_ACCESS_KEY_SECRET=你的SK
OSS_BUCKET=你的bucket名
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
EOF
chmod 600 .env
```

#### 14.3 字段说明

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `AL_BASE_URL` | **必填** | qwen 模型 API 地址（阿里云 MaaS，含 `/compatible-mode/v1`） |
| `AL_API_KEY` | **必填** | 阿里云 MaaS 长令牌（约 117 字符，非 sk- 短 key） |
| `TAVILY_API_KEY` | **必填** | Tavily 联网搜索 key（`tvly-` 开头） |
| `OSS_ACCESS_KEY_ID` | **必填** | 阿里云 OSS AK（24 字符） |
| `OSS_ACCESS_KEY_SECRET` | **必填** | 阿里云 OSS SK（30 字符） |
| `OSS_BUCKET` | **必填** | OSS Bucket 名 |
| `OSS_ENDPOINT` | 可选 | 默认 `oss-cn-beijing.aliyuncs.com`，按 bucket 所在 region 改 |

> ⚠️ **为什么 OSS 必填**：`app/common/oss.py` 在**模块加载时**就创建 OSS 客户端，配置缺失可能导致启动崩溃。即使不发图片，也建议配齐。

#### 14.4 验证配置（不暴露敏感值）

```bash
awk -F= '/^[A-Z]/{if(length($2)>0) print $1"=✅已填("length($2)"字符)"; else print $1"=❌空"}' .env
```

每个变量应显示 `✅已填`。

---

### 步骤 15：PM2 启动 AI 服务

#### 15.1 创建 PM2 配置文件

```bash
cd /www/wwwroot/jieyou-ai-concierge
cat > ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    {
      name: "jieyou-ai-concierge",
      script: "/usr/local/bin/uv",           // uv 的绝对路径，避免 PATH 问题
      args: "run uvicorn app.main:app --host 127.0.0.1 --port 8001",
      cwd: __dirname,
      interpreter: "none",                    // 关键：禁用 node 解释器，直接执行 uv 二进制
      autorestart: true,
      max_restarts: 10,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin",
      },
    },
  ],
};
EOF
```

> ⚠️ **关键点**：
> - `script` 用 **`/usr/local/bin/uv` 绝对路径**（PM2 的 PATH 可能找不到）
> - `interpreter: "none"` 必须——否则 PM2 用 node 去执行 uv，报语法错

#### 15.2 启动

```bash
cd /www/wwwroot/jieyou-ai-concierge
pm2 start ecosystem.config.cjs
sleep 8
pm2 list
```

预期：`jieyou-ai-concierge` 状态 `online`，**`↺` 重启次数不再涨**。

#### 15.3 验证服务（关键）

```bash
# 看日志（应有 Uvicorn running）
pm2 logs jieyou-ai-concierge --lines 20 --nostream

# 测试 /chat 端点（第一次会慢，5-15 秒）
curl -X POST http://127.0.0.1:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","history":[],"requestId":"test1","attachments":[]}'
```

预期返回：`{"reply":"（摇晃着尾巴...）你好呀！我是小柴..."}`

> ⚠️ **崩溃判断**：如果 `pm2 list` 里 `↺` 数字一直涨（>0 且不断增加），说明服务启动崩了。常见原因见 [Q14](#q14ai-服务启动崩溃pm2-重启次数一直涨)。

---

### 步骤 16：主站对接 AI 服务

#### 16.1 主站 .env 加两个变量

```bash
cat >> /www/wwwroot/jieyou/.env <<'EOF'

# ── AI 解忧（小柴）────────────────────────────────────────────
AI_CONCIERGE_URL=http://127.0.0.1:8001/chat

# ── AI 回信起草（浪矢爷爷口吻）──────────────────────────────
AI_DRAFT_URL=http://127.0.0.1:8001/draft-reply
EOF

# 验证
grep -E "AI_CONCIERGE_URL|AI_DRAFT_URL" /www/wwwroot/jieyou/.env
```

> 💡 用 `>>`（追加），不要用 `>`（覆盖整个文件）。

#### 16.2 重启主站（关键：加 --update-env）

⚠️ **坑**：`pm2 restart` 默认**不重新加载环境变量**！不加 `--update-env` 的话，新加的 `AI_CONCIERGE_URL` 主站读不到。

```bash
pm2 restart jieyou-grocery-store --update-env
sleep 5
pm2 logs jieyou-grocery-store --lines 10 --nostream   # 应有 Server running
```

#### 16.3 保存进程列表 + 开机自启（重要）

两个服务都正常后，**务必保存**，否则服务器重启后进程丢失：

```bash
pm2 save
pm2 startup
```

`pm2 startup` 会输出一条 `sudo env PATH=... pm2 startup ...` 命令，**复制粘贴执行那条命令**（部分系统会自动执行）。看到 `Command successfully executed` 即生效。

#### 16.4 浏览器测试

访问 **http://<服务器公网IP>:3000**：

1. **登录**：`admin` / `admin123`
2. **小柴聊天**：点右下角小柴图标 → 发「我最近压力大」→ 应收到 AI 真实回复（不是兜底文案）
3. **AI 起草回信**（管理员）：进「店主工作台」→ 找用户来信 → 点「AI 起草」→ 自动生成浪矢爷爷口吻回信

三个都 ✅ → **完整部署大功告成！** 🎉

---

## 步骤 17（可选）：Nginx 反代 + SSL

让网站用域名 + HTTPS 访问，更专业更安全。

#### 17.1 绑域名
- 域名 DNS 解析 A 记录 → 服务器公网 IP

#### 17.2 宝塔建站 + 反代
1. 宝塔 → **网站** → **添加站点** → 域名填你的域名，**不要**创建数据库
2. 站点 → **设置** → **反向代理** → 添加反向代理：
   - 代理名称：`jieyou`
   - 目标URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
3. 启用反代

#### 17.3 配 SSL（免费 Let's Encrypt）
站点 → 设置 → **SSL** → **Let's Encrypt** → 申请 → 强制 HTTPS

完成后访问：`https://你的域名`

> 💡 AI 服务（8001 端口）**不需要对外暴露**，主站通过 `127.0.0.1` 内网调用即可。无需为它单独配反代。

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

### Q12：登录后仍显示登录页（Cookie 没保存）
**原因**：HTTP 直连公网 IP 时，浏览器拒绝 `SameSite=None; Secure` 的 Cookie。  
**解决**：已修复（`api/lib/cookies.ts` 改为基于「安全上下文」判定）。若仍出现：
1. 清浏览器 Cookie（F12 → Application → Cookies → 清除该站点）
2. `Ctrl+F5` 硬刷新
3. 重新登录

### Q13：`uv: command not found`（uv 已下载到 /usr/local/bin）
**原因**：PATH 不含 `/usr/local/bin`。  
**解决**：
```bash
echo 'export PATH=/usr/local/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Q14：AI 服务启动崩溃（PM2 重启次数一直涨）
查日志定位：
```bash
pm2 stop jieyou-ai-concierge
pm2 logs jieyou-ai-concierge --lines 50 --nostream
```

**最常见原因：`sqlite3.OperationalError: unable to open database file`**  
→ 没建 `db/` 目录（见步骤 14.1）：
```bash
mkdir -p /www/wwwroot/jieyou-ai-concierge/db
pm2 restart jieyou-ai-concierge
```

**其他原因**：
- `CredentialsProviderError` / `InvalidAccessKeyId` → OSS 凭证错，检查 `.env` 的 `OSS_*`
- `ModuleNotFoundError` → `uv sync` 没跑或失败，重跑
- `Address already in use` → 8001 端口被占，`lsof -i:8001` 查谁占了

### Q15：AI 服务 PM2 报 `uv: not found`（但命令行能跑）
**原因**：PM2 运行环境 PATH 与命令行不同。  
**解决**：`ecosystem.config.cjs` 里 `script` 用绝对路径 `/usr/local/bin/uv`（见步骤 15.1）。

### Q16：小柴聊天一直转圈 / 返回兜底文案
**排查链**：
1. AI 服务在不在？`pm2 list` 看 `jieyou-ai-concierge` 是否 `online`
2. AI 服务能响应吗？`curl -X POST http://127.0.0.1:8001/chat ...`（见步骤 15.3）
3. 主站 `.env` 配了吗？`grep AI_CONCIERGE_URL /www/wwwroot/jieyou/.env`
4. 主站重启加载了吗？`pm2 restart jieyou-grocery-store --update-env`（必须加 `--update-env`）

### Q17：改了主站 .env 但不生效
**原因**：`pm2 restart` 默认不重新加载环境变量。  
**解决**：加 `--update-env` 标志：
```bash
pm2 restart jieyou-grocery-store --update-env
```

---

## 运维命令速查

### PM2 操作（两个服务通用）
```bash
pm2 list                                # 查看所有进程
pm2 logs                                # 所有进程实时日志（Ctrl+C 退出）
pm2 logs jieyou-grocery-store --lines 100      # 主站最近 100 行
pm2 logs jieyou-ai-concierge --lines 100       # AI 服务最近 100 行
pm2 restart jieyou-grocery-store --update-env  # 重启主站（改了 .env 必须加 --update-env）
pm2 restart jieyou-ai-concierge                # 重启 AI 服务
pm2 monit                               # 实时监控面板
pm2 save                                # 保存进程列表（修改后必做）
pm2 flush                               # 清空所有日志（排查时有用）
```

### 主站更新代码后重新部署
```bash
cd /www/wwwroot/jieyou
git pull
npm ci                            # 依赖有变动时
npm run build
pm2 restart jieyou-grocery-store --update-env
```

### AI 服务更新代码后重新部署
```bash
cd /www/wwwroot/jieyou-ai-concierge
git pull
uv sync                           # 依赖有变动时
pm2 restart jieyou-ai-concierge
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

### 测试两个服务健康度
```bash
# 主站
curl -s http://127.0.0.1:3000 | head -5    # 返回 HTML = 正常

# AI 服务
curl -X POST http://127.0.0.1:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","history":[],"requestId":"t1","attachments":[]}'
# 返回 {"reply":"..."} = 正常
```

### 查看开机自启状态
```bash
systemctl status pm2-root         # PM2 开机自启服务状态
```

### 日志位置
- PM2 进程日志：`/root/.pm2/logs/`
- 主站 stdout：`/root/.pm2/logs/jieyou-grocery-store-out.log`
- 主站 stderr：`/root/.pm2/logs/jieyou-grocery-store-error.log`
- AI 服务 stdout：`/root/.pm2/logs/jieyou-ai-concierge-out.log`
- AI 服务 stderr：`/root/.pm2/logs/jieyou-ai-concierge-error.log`

---

## 文件结构参考

### 主站 `/www/wwwroot/jieyou/`
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

### AI 服务 `/www/wwwroot/jieyou-ai-concierge/`
```
/www/wwwroot/jieyou-ai-concierge/
├── .env                    # 环境变量（AL_*/TAVILY_*/OSS_*，chmod 600）
├── .env.example            # 模板
├── ecosystem.config.cjs    # PM2 配置（手工创建，见步骤 15.1）
├── pyproject.toml          # Python 依赖声明（uv 用）
├── uv.lock                 # 依赖锁文件
├── langgraph.json          # LangGraph 图配置
├── .venv/                  # Python 虚拟环境（uv sync 自动生成）
├── db/                     # sqlite 记忆库（手工 mkdir，运行时生成 .db）
└── app/                    # 源码
    ├── main.py            # FastAPI 入口（uvicorn 启动）
    ├── agents/
    │   └── Relieving_Sorrow.py  # 小柴 Agent + sqlite 连接（注意 db 目录坑）
    ├── api/v1/
    │   ├── chat.py        # 流式对话（/api/v1/chat/stream）
    │   └── concierge.py   # ★ 网站契约端点 POST /chat（非流式）
    ├── common/
    │   ├── oss.py         # OSS 图片上传（模块加载即建客户端，配置必填）
    │   └── logger.py
    └── models/schemas.py  # Pydantic 模型
```

---

## 部署checklist（精简版）

### 主站
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
- [ ] 浏览器访问 `http://IP:3000` 验证
- [ ] 登录测试（admin / admin123）

### AI 服务
- [ ] uv 已装（`uv --version`，PATH 含 `/usr/local/bin`）
- [ ] AI 代码 clone 到 `/www/wwwroot/jieyou-ai-concierge`，切 develop
- [ ] `uv sync` 装依赖成功
- [ ] **`mkdir -p db`**（否则 sqlite 必崩）
- [ ] `.env` 配齐 AL_*/TAVILY_*/OSS_* 6 个变量，`chmod 600`
- [ ] `ecosystem.config.cjs` 创建（uv 绝对路径 + `interpreter: "none"`）
- [ ] `pm2 start`（status: online，↺ 不涨）
- [ ] `curl /chat` 测试返回 `{"reply":"..."}`
- [ ] 主站 `.env` 加 `AI_CONCIERGE_URL` + `AI_DRAFT_URL`
- [ ] `pm2 restart jieyou-grocery-store --update-env`
- [ ] 浏览器测小柴聊天 + AI 起草

### 收尾
- [ ] `pm2 save && pm2 startup`（两个服务开机自启）
- [ ] （可选）Nginx 反代 + SSL 绑域名
