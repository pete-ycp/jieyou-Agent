# 搜索结果 `/search?q=` — search.md

## Section 1 · 搜索回显头

**Layout**：窄通栏（bg-kraft，上下缝纫虚线），居中：Caption「你在货架上找」+ H1「"关键词"」+ 结果计数「找到 N 件」（EB Garamond）。下方挂一条居中的小搜索框（预填当前词，可改词再搜）。
**Animation**：关键词逐字浮现（50ms stagger，600ms）；搜索框入场 y 20→0（500ms）。

## Section 2 · 结果网格

复用 `/products` 的 `<ProductCard/>` 网格与全部动画规范（stagger 0.08s，y 40→0）。命中关键词在商品名中以暖黄底色高亮（`bg-lamp/40`，圆角 2）。

## Section 3 · 空结果（核心设计：牛奶箱空状态导流写信）

**Layout**：整区 70vh 居中：
- `milkbox-empty.png`（240px），箱盖开合一次（`<MilkBoxOpen/>` 空箱变体 600ms）
- 手写体 H2「货架上没找到这件东西。」
- 正文：「店主进货慢，但回信快。如果心里装着别的事——写下来，投进投递口，明早牛奶箱里会有回信。」
- 双 CTA：主「写一封信」（邮戳朱→`/letters/new`）+ 次「回货架看看」（→`/products`）
**Animation**：空箱先单独入场（scale 0.9→1, 700ms），文案延迟 400ms stagger 浮现；CTA 常驻呼吸（朱红亮度 95%↔100%，3.2s）。

## 交互备忘
- 特殊字符/超长词不报错，原样回显并返回空态（防注入由后端参数化保证）。
- 无 q 参数时视同空态，文案改为「想找什么？在木牌上写下来。」+ 搜索框自动聚焦。
- 本页 Assets：`milkbox-empty.png`。
