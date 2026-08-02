# 商品详情 `/products/:id` — product-detail.md

> 气质：像在柜台前拿起一件商品，店主从旁边探过头说一句这件东西的来历。

## Section 1 · 面包屑

「货架 / 信纸文具 / 和纸信纸套装」（Caption 12，青灰，链接 hover 手绘下划线）。
**Animation**：入场 opacity 0→1（500ms）。

## Section 2 · 主区（左图右信息，lg 55:45，移动竖排）

**左 · 图廊**：主图 4:3 大卡（牛皮纸底衬 + 双线框），下排缩略图 ×N（当前=朱红描边）。hover 主图 1.5s 缓慢推近至 1.08 倍（仿"拿近了看"）。
**Animation**：图切换 300ms 交叉淡入；入场 scale 0.98→1 + opacity（700ms）。

**右 · 信息栈**：
- 分类小签 + 商品名（H1 36/44，Noto Serif SC 700）
- 价格行：EB Garamond 28「¥128.00」+ 右侧邮戳朱小章「现货」（售罄时改灰章「售罄」）
- 库存提示：库存 <10 显示苔绿小字「架上只剩 N 件」；=0 显示「这件卖完了」
- 缝纫虚线分隔
- 数量选择器（− 数量 ＋，木牌按钮，上限=库存，超限 Toast「架上只有这么多了」）
- 按钮组（间距 12）：主 CTA「加入购物篮」（邮戳朱，加购成功盖"已入篮"半透明章 600ms）+ 次 CTA「直接买下」（木棕描边双线，→checkout 直达）
- 未登录点击 → `/login?from=...`
**Animation**：信息栈 stagger 0.1s 自右滑入（x 30→0, 700ms）；CTA hover 下沉 1px + 邮戳纹理浮现。

## Section 3 · 店主手记（本页灵魂）

**Layout**：窄栏 720px 居中，`<ShopkeeperNote/>`：手写体大段（20/34，Ma Shan Zheng），左侧 2px 朱红竖线，整体微倾 -0.5°，末尾署名「店主 记」+ 当天日期邮戳小章。内容为该商品的 keeper_note（种子文案示例：「这套信纸用的是越前和纸，写长信不洇墨。有位常客说，用它写的信，回信都来得快一些。」）。
**Animation**：滚动进入时竖线先 draw 下（400ms），文字随后逐段浮现（y 20→0, stagger 0.15s, 800ms, trigger 80%）。

## Section 4 · 商品详情（富文本）

**Layout**：窄栏 720px。牛皮纸大卡内排版富文本（规格表=双线表格，图=圆角 8 + 暖滤镜）。段落间缝纫虚线。
**Animation**：段落入场 y 30→0 stagger 0.1s（trigger 85%）。

## Section 5 · 联动带（商城→信箱双轨）

**Layout**：`bg-milk` 窄通栏，左 `milkbox-letter.png`（120px），右文案「买不买都好，若心里有事——写信给店主，明早牛奶箱取回信。」+ 文字链「去写信 →」。
**Animation**：牛奶箱 hover 时箱盖开合一次（600ms）；带入场淡入 600ms。

## Section 6 · 同架商品（相关推荐）

**Layout**：标题「同一个货架上」+ 同分类 4 张 `<ProductCard/>` 横排（移动横滑）。
**Animation**：同列表页卡片规范，stagger 0.08s。

## 状态与边界
- 已下架（off_shelf）：整页保留但顶置褪朱红横幅「这件商品已下架」+ CTA 禁用 + 推荐同类。
- 库存 0：数量器禁用，主 CTA 变灰「卖完了」。
- 本页 Assets：商品图（或 `product-placeholder.png`）、`milkbox-letter.png`。
