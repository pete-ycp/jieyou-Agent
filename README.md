# 解忧杂货店 · 线上杂货铺与解忧信箱

> 写下烦恼，明天牛奶箱里取回答。
> 以东野圭吾《解忧杂货店》为蓝本的全栈网站：一间卖文具百货的线上杂货铺，
> 加上一个可以投信、收信的「解忧信箱」，还有一只值守店门口的柴犬「小柴」（AI 解忧员）。

**项目位置：`/mnt/agents/output/app`**

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite 7 · Tailwind CSS 3.4 + shadcn/ui · GSAP/ScrollTrigger · Framer Motion · Lenis |
| 后端 | Hono + tRPC 11（端到端类型安全） |
| 数据库 | MySQL + Drizzle ORM |
| 登录 | Kimi OAuth（JWT 会话，店主=admin 角色） |
| AI 解忧 | 预留接口，转发到你自己的 LangChain 服务（见 `docs/AI-CONCIERGE.md`） |

要求 **Node.js 20+**。

---

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（见下节；在 Kimi 平台上 .env 已自动生成，无需改动）

# 3. 同步数据库表结构
npm run db:push

# 4. 灌入种子数据（12 件商品 / 6 条语录 / 5 篇示例信件 / 关于文本）
npx tsx db/seed.ts

# 5. 启动开发服务器（前后端一体，HMR）
npm run dev
# → http://localhost:3000
```

生产构建与运行：

```bash
npm run build    # 构建前端 dist/public + 打包后端 dist/boot.js
npm start        # 以生产模式启动（默认 3000 端口）
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发模式（HMR），http://localhost:3000 |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint |
| `npm run test` | Vitest 单元测试 |
| `npm run db:push` | 开发期同步 schema 到数据库（推荐） |
| `npm run db:generate` | 生成迁移 SQL |
| `npm run db:migrate` | 应用迁移文件 |
| `npx tsx db/seed.ts` | 写入种子数据 |

## 环境变量（`.env`）

> `.env` 被 git 忽略，不会进版本库。在 Kimi 平台上由系统自动生成，**请勿修改**。
> 本地自部署时需要自行准备等价的配置。

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | MySQL 连接串（ Drizzle 使用 ） |
| `APP_ID` / `APP_SECRET` | Kimi OAuth 应用凭证 |
| `VITE_APP_ID` / `VITE_KIMI_AUTH_URL` / `KIMI_AUTH_URL` / `KIMI_OPEN_URL` | Kimi 登录相关地址（前后端） |
| `OWNER_UNION_ID` | 店主（admin）的 unionId；该账号登录后可进入 `/admin` 店主工作台 |
| `AI_CONCIERGE_URL` | **（可选，自己添加）** 你的 LangChain 服务地址，如 `http://localhost:8000/chat`。不配则「小柴」使用内置兜底回复。详见 `docs/AI-CONCIERGE.md` |

## 项目结构

```
app/
├── api/                    # 后端（Hono + tRPC）
│   ├── router.ts           # tRPC 路由注册入口
│   ├── routers-shop.ts     # 商城/购物车/订单/信件/内容/后台 路由
│   ├── routers-chat.ts     # AI 解忧 chat.send
│   ├── ai/concierge.ts     # ★ 小柴大脑对接点（AI_CONCIERGE_URL）
│   ├── queries/            # Drizzle 查询函数
│   └── kimi/               # Kimi OAuth（框架内部，勿改）
├── contracts/              # 前后端共享类型与常量（labels、chat 契约）
├── db/
│   ├── schema.ts           # 7 张表：users/products/cartItems/orders/orderItems/letters/contents
│   └── seed.ts             # 种子数据
├── src/
│   ├── pages/              # 20 个页面（商城、信箱、订单、后台……）
│   ├── components/         # Navbar/Footer/Layout + shop/ + admin/ + shiba/
│   ├── hooks/  providers/  # useDayNight、useAuth、tRPC client
│   └── index.css           # 设计系统（信纸横线、昼夜主题、纸纹理……）
├── public/                 # 全部插画/图标素材（含 shiba-idle/happy.png）
└── docs/
    └── AI-CONCIERGE.md     # ★ LangChain 对接文档（含 FastAPI 示例）
```

## 功能地图

- **商城**：货架浏览/搜索/详情（店主寄语）、购物车、下单、模拟支付、订单管理、售罄印章
- **解忧信箱**：笔名投信（五个烦恼分类印章）、24 小时回信承诺、牛奶箱取回信、
  白纸彩蛋回信、回信满 7 天写感谢信、示例信件墙（化名故事）
- **小柴 · AI 解忧**：右下角柴犬，点击即聊；接口已预留，等你接入自己的 LangChain Agent
- **店主工作台** `/admin`：商品上下架、回信工作台（含五条回信 SOP 侧栏）、订单发货、内容管理
- **氛围**：昼夜自动切换（08:30–20:00 日间，夜间暖灯）、昭和复古纸木质感、全站响应式

## 设计与需求文档

| 文档 | 位置 |
|---|---|
| 需求文档（PRD） | `/mnt/agents/output/解忧杂货店网站-需求文档.footnote.docx` |
| 全局与页面设计稿 | `/mnt/agents/output/design/`（design.md + 16 个页面文档） |
| AI 解忧对接 | 本仓库 `docs/AI-CONCIERGE.md` |

## 部署说明（Kimi 平台）

- 每次交付会保存一个**版本**，点击会话中的版本卡即可预览；可随时回滚到历史版本。
- **发布**为公开网址需在页面上手动点击「发布」按钮（`<name>.ok.kimi.link`，可改名）。
- 导出代码自部署时请注意：**Kimi 登录与平台数据库不随代码导出**，
  需要自己配置 OAuth 与 MySQL（见「环境变量」）。
