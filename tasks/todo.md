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

---

# 任务：移动端响应式适配修复（2026-08-02）

## 问题清单（浏览器实测 + 15 个审查 agent 双重确认）
测试环境：dev server :3003，admin 登录态，视口 360×640 / 375×667 / 390×844。

### High（功能在移动端不可见/不可达）
1. **抽屉菜单无「店主工作台」入口** — `Navbar.tsx:121` 桌面用户区 `hidden sm:flex`，抽屉里只有 4 个公共链接 + 退出按钮。admin 在手机端完全进不了 /admin（实测确认，全仓 /admin 入口仅此一处）。
2. **抽屉菜单溢出不可滚动，「退出登录」被推出视口** — `Navbar.tsx:203` 抽屉 nav 无 `overflow-y-auto`，4 个竖排 text-3xl 链接 + gap-8 总高约 820px，超过手机视口（360×640 下按钮 top=850 完全不可见，实测确认）。

### Medium
3. **首页 Hero 在 360px 下 CTA 被裁** — `Home.tsx:78-128` 竖排标题 44px×3 列 + gap-8 挤占，右侧只剩 ~115px < 按钮宽 136px：「去货架看看」折行、「写一封信」被裁掉一半（实测截图确认）。
4. **小柴浮在抽屉菜单之上** — 抽屉 `z-[60]` 在 header `z-50` 层叠上下文内，小柴根级 `z-[60]` 更高，抽屉打开时狗在菜单上游走、可误点打开聊天面板。
5. **小柴遮挡底部固定结算条** — `/cart`（及 /checkout、/pay）底部结算条 `z-40`，狗游走时会盖住左侧合计金额、游到右侧时拦截「去结账」点击（实测截图确认）。
6. **货架管理表格名称列一字一行** — `AdminProducts.tsx` 名称列无 min-w，390px 下「牛奶箱信纸套装」逐字竖排，行高爆炸（外层已有 overflow-x-auto，补 min-w 即可横滚可读；订单表头同款折行）。

### Low（单 className 级顺手修）
7. `AdminLetters.tsx:341` 回信操作行无 flex-wrap，360px 签名被挤成竖排 → 加 `flex-wrap`。
8. 小柴气泡 + `LettersMine.tsx:232` 未读 Toast：framer-motion 内联 transform 覆盖 Tailwind `-translate-x-1/2` → 居中失效、贴边溢出视口 → 拆「定位层 + 动画层」。
9. `Checkout.tsx:258` 步骤条 360px 折行拥挤 → 容器加 `flex-wrap gap-y-2`。
10. `LetterDetail.tsx:252,326` 信纸首行日期被邮戳挤成两行 → `pr-24` 改 `pr-20 sm:pr-24`。

## 待办（Todo）
- [x] 1. `Navbar.tsx`：抽屉 z-[60]→z-[80]；nav 加 overflow-y-auto 可滚动；抽屉内为 admin 补「店主工作台」入口（顺带补「我的信件/购物篮」快捷项）。
- [x] 2. `Home.tsx`：Hero 小屏适配（标题 `text-[36px] sm:text-[44px]`、`gap-8`→`gap-5`、右下木牌 `bottom-4 right-4`）。
- [x] 3. `ShibaConcierge.tsx`：/cart|checkout|pay 路径 bottom-3→bottom-20；气泡拆定位层修居中。
- [x] 4. `AdminProducts.tsx`/`AdminOrders.tsx`：关键列 min-w / 表头 whitespace-nowrap。
- [x] 5. 低优先级小修 ×4（AdminLetters、Checkout、LetterDetail、LettersMine）。
- [x] 6. 多视口回归验证（360/375/390/768 + 桌面 1280），确认桌面端零影响；清理 shots/ 截图目录。

## 不做的事
- 不改任何业务逻辑、接口、数据结构；纯 className/布局级改动。
- 不动小柴的漫游/状态机逻辑（仅改定位 className）。
- 信件乱码（种子数据 mojibake）与本次无关，不处理。

## Review（2026-08-02 完成）

### 修复明细（9 个源文件，全部 className/JSX 结构级，零业务逻辑改动）
1. **`Navbar.tsx`（核心）**：
   - 抽屉菜单 nav 改 `overflow-y-auto` + 内层 `m-auto` 包裹（超高可滚动、不超高仍居中），并加 `data-lenis-prevent` 让 Lenis 放行抽屉内滚动 → **「退出登录」在 360/375/390 视口均可达**。
   - 抽屉按钮区为 admin 补「店主工作台」入口（木棕底按钮，位于退出按钮上方）→ **admin 移动端可进 /admin**。
   - 桌面导航断点 md→lg（桌面链接/汉堡按钮/抽屉三处）→ 修复 768~1024px 档导航链接折行挤压（回归中发现的预存问题）。
   - 抽屉 z-[60]→z-[80]。
2. **`Home.tsx`**：Hero 竖排标题 `text-[36px] sm:text-[44px] md:text-[56px]` + 间距 `gap-5 md:gap-14` → 360px 下「去货架看看」「写一封信」双 CTA 完整可见。
3. **`ShibaConcierge.tsx`**：
   - 狗按钮 z-[60]→z-[40]（在 header z-50 层叠上下文之下）→ 抽屉打开时狗不再浮在菜单上（注：先改抽屉 z 无效，因抽屉 z 只在 header 局部层叠上下文生效）。
   - /cart 路径 bottom-3→bottom-20 → 不再遮挡移动端结算条与「去柜台结账」。
   - 气泡拆「定位层（left-1/2 -translate-x-1/2）+ 动画层（motion）」→ 修复 framer-motion 内联 transform 覆盖 Tailwind 位移类导致的居中失效。
4. **`helpers.tsx`**：`ADMIN_TH` 加 `whitespace-nowrap` → 后台所有表头不再逐字折行；**`AdminProducts.tsx`** 名称列加 `min-w-36` → 商品名单行可读（横滚由外层 overflow-x-auto 承担）。
5. **低优先级**：`AdminLetters.tsx` 操作行加 `flex-wrap`；`Checkout.tsx` 步骤条加 `flex-wrap gap-y-2`；`LetterDetail.tsx` 信纸首行 `pr-20 sm:pr-24`（两处）；`LettersMine.tsx` Toast 同款拆定位层修居中。

### 验证
- **视口矩阵实测通过**：360×640、375×667、390×844（抽屉滚到底部后店主工作台/退出登录 getBoundingClientRect 均在视口内）、768×1024（导航单行、Admin 侧栏正常）、1280×800（桌面导航 4 链接+店主工作台可见、汉堡隐藏、Hero 布局不变）。
- `tsc -b`：仅 2 个预存报错（Letters.tsx 未用 import、ProductDetail toFixed on never），无新增。
- ESLint 改动文件：11 报错均为预存（helpers.tsx 混合导出、setState-in-effect 等），与本次改动无关。
- 已清理 shots/ 截图目录与根目录 nul 残留文件；drawer-repro.html（审查 agent 临时产物）已不存在。

### 运行状态
- dev server 仍在后台运行：**http://localhost:3003**（admin/admin123 登录态）。
- 待用户确认后可提交 commit。

---

# 任务：商品下拉选择移动端「弹出选项失去样式」修复（2026-08-02）

## 根因（用户真机截图 + 代码双重确认）
- 用户截图：Android Chrome 打开排序下拉，弹出的是**系统原生 picker**（白底卡片 + 单选圆圈），与店铺暖棕/牛皮纸设计完全脱节 → 即「弹出的选项会失去样式」。
- 根因：`src/pages/Products.tsx:151` 排序下拉用的是**原生 `<select>`**（全仓仅此一处，Grep 确认）。桌面端原生弹层由浏览器渲染尚可接受，移动端会强制走系统组件，自定义样式完全失效。
- 附带问题（换自定义组件后必然碰到，需配套修）：
  1. `ui/select.tsx` 的 `SelectItem` 用 `focus:bg-accent`（--accent = 亮橙黄 36 74% 57%），选中项高亮刺眼，与暖棕店铺风不搭（Admin「全部分类」下拉实测复现）；
  2. `ui/select.tsx` 的 `max-h-(--var)` / `origin-(--var)` 是 Tailwind v4 简写语法，本项目 v3.4 不编译 → 弹层最大高度与动画原点失效。

## 待办（Todo）
- [x] 1. `Products.tsx`：原生 `<select>` 换成项目已有的 shadcn Select（`ui/select.tsx`），触发器保持现有外观（kraft 底、wood 边框、下拉箭头），排序逻辑与 URL 参数同步不变。
- [x] 2. `ui/select.tsx`：`SelectItem` 高亮 `focus:bg-accent` → 店铺色系 `focus:bg-lamp/25 focus:text-ink`（与货架分类 Tab 的选中态一致；Admin 两处下拉同步受益）。
- [x] 3. `ui/select.tsx`：两处 v4 语法改 v3 方括号写法（`max-h-[var(...)]`、`origin-[var(...)]`），并给弹层加 `data-lenis-prevent` 防 Lenis 拦截滚动。
- [x] 4. 移动端视口（375×667）实测 /products 排序下拉 + Admin 分类下拉回归；桌面 1280 回归；`tsc -b` 无新增报错。
- [x] 5. （用户反馈后追加）`SelectContent` 加 `position="popper"`——默认 item-aligned 会覆盖触发器，看起来像「选项脱离了下拉框」；popper 从触发器下方展开、宽度对齐。

## 不做的事
- 不改排序逻辑、URL 参数、接口；仅替换下拉组件与弹层样式。
- 不动 Admin 下拉的选项结构与交互（Admin 弹层保持 item-aligned 默认，仅高亮色随 select.tsx 统一变好）。

## Review（2026-08-02 完成）

### 根因
排序下拉用的是原生 `<select>`（全仓唯一一处）。移动端浏览器（用户真机 Android Chrome）点击后强制弹**系统原生 picker**（白底卡片 + 单选圆圈），店铺样式全部失效 → 用户感知「弹出的选项失去样式」。

### 修复明细（2 个源文件，纯组件/样式级，零业务逻辑改动）
1. **`Products.tsx`**：
   - 原生 `<select>` → shadcn Select（Radix 弹层 portal 到 body，移动端/桌面端均为自定义米色弹层，不再触发系统 picker）。
   - 触发器 className 保持原外观：kraft 底、wood/30 边框、shadow-paper、focus 时 lamp 色 ring；`size="sm"`（h-8 与原 py-1.5 高度一致）；aria-label="排序方式" 保留。
   - `SelectContent position="popper"`：选项从触发器下方展开、宽度对齐触发器（修复用户反馈的「下拉选项脱离文档」——item-aligned 默认会覆盖触发器）。
   - 删除不再使用的 lucide `ChevronDown` 导入。
2. **`ui/select.tsx`**：
   - `SelectItem` 高亮 `focus:bg-accent focus:text-accent-foreground`（亮橙黄 36 74% 57%，刺眼）→ `focus:bg-lamp/25 focus:text-ink`（与货架分类 Tab 选中态同色系）；Admin「全部分类/全部状态」下拉同步受益。
   - Tailwind v4 简写 `max-h-(--var)` / `origin-(--var)`（v3.4 不编译）→ v3 方括号 `max-h-[var(--radix-select-content-available-height)]` / `origin-[var(--radix-select-content-transform-origin)]`。
   - 弹层加 `data-lenis-prevent`（防全局 Lenis 拦截弹层内滚动，对应 memory 已记录的 Lenis 坑）。

### 验证
- **375×667 移动视口实测**：/products 排序弹层为店铺米色卡片、lamp 暖黄高亮 + 对勾、从触发器下方展开；选「价格从低到高」→ URL `?sort=price_asc`、商品重排（¥12 信封升首位）✓；Admin 分类下拉高亮柔和 ✓。
- **1280×800 桌面回归**：工具条/弹层正常，布局零影响 ✓。
- `tsc -b` 仅 2 个预存报错；ESLint 两个改动文件 0 报错。
- 后台审查 workflow（2 个独立审查 agent：Products 页维度 + select 组件全使用点维度）：**0 个确认问题**。

### 部署提示
- 用户真机访问的是阿里云部署站点（120.27.194.54:3000），本地修复需重新构建部署后生效。

---

# 任务：移动端滚动时头部吸顶容器抖动修复（2026-08-02）

## 根因（注入 rAF 监测脚本实测确诊）
- `Navbar.tsx` 的 `scrolled = scrollY > 80` 是**单阈值无滞后**：移动端惯性/橡皮筋滚动必然在 80px 附近来回穿越。
- 实测：阈值附近来回滚动 2.7 秒，**header 高度切换 91 次**（64↔52 反复 + 大量过渡中间值），且 header 是 sticky 占文档流——高度每变一次，整页内容跟着位移 12px → 全屏抖动。

## 待办（Todo）
- [x] 1. `Navbar.tsx`：阈值加滞后（>80 收缩、<40 展开，中间保持原状态；setScrolled 函数式更新，同值自动 bail out）。
- [x] 2. `Navbar.tsx`：高度收缩仅桌面生效（`h-16` 恒定 + `scrolled && 'md:h-[52px]'`）——移动端 header 恒 64px，根除布局位移。
- [x] 3. `Products.tsx`：工具条 `top-[52px]` → `top-16 md:top-[52px]`（随移动端 header 恒高同步）。
- [x] 4. 复测：移动端振荡脚本 + 桌面滞后/收缩功能验证。

## 不做的事
- 不改桌面端收缩交互（滚动收缩是设计意图，仅消除振荡）；阴影切换保留（不占布局）。
- 不动 Lenis 配置（移动端 touch 滚动为原生，与本案无关）。

## Review（2026-08-02 完成）

### 修复明细（2 个源文件、3 处改动，零业务逻辑改动）
1. **`Navbar.tsx`**：
   - onScroll 滞后阈值：`>80` 才收缩、`<40` 才展开，40~80 区间保持原状态 → 消除阈值附近振荡（桌面端同样受益）。
   - 高度类名 `scrolled ? 'h-[52px]' : 'h-16'` → 基础 `h-16` + `scrolled && 'md:h-[52px]'` → 移动端 header 恒高 64px，整页内容不再随滚动位移。
2. **`Products.tsx`**：工具条吸顶 `top-16 md:top-[52px]`，与移动端 header 恒高 64px / 桌面收缩 52px 分别对齐。

### 验证（同一振荡脚本前后对比）
- **移动端 375×667**：高度切换次数 **91 → 0**，恒 64px；工具条与 header 底边间隙 0px ✓。
- **桌面 1280×800**：滞后区间（40~80）来回高度不切换；越过 80 正常收缩 52、越过 40 正常展开 64；收缩后工具条间隙 0px ✓。
- `tsc -b` 仅 2 个预存报错；ESLint 两文件 0 报错。