# 商品列表 `/products` — products.md

> 气质：不是电商大卖场，是"街角杂货店的木质货架"。少即是多，每件商品都有被认真对待的位置。

## Section 1 · 页头（分类氛围头图带）

**Layout**：高 240px 通栏，当前分类的氛围头图作底（全部=`prod-stationery.png` 拼接渐变 / 各分类用对应 `prod-*.png`），叠 60% 奶油色蒙版保证可读性。左侧：手写体 H1「货架」+ 小字「提供商品订购服务，欢迎咨询」。右侧：当前分类的一句小说氛围文案：
- 全部：「货架上的商品寥寥，但都是店主认真选的。」
- 信纸文具：「写信的纸，要用好一点的。」
- 厨房日杂：「日子是一餐一饭过出来的。」
- 治愈小物：「小东西不解决问题，但能陪你一会儿。」
**Animation**：切换分类时头图 500ms 交叉淡入 + 文案逐字浮现（40ms stagger）；入场 y 30→0（700ms）。

## Section 2 · 工具条（分类 Tab + 排序 + 搜索回显）

**Layout**：sticky 于 Navbar 下（top 84px，滚动时 `bg-cream/95` 毛玻璃纸感 + 下缝纫虚线）。
- 左：分类 Tab（全部 / 信纸文具 / 厨房日杂 / 治愈小物）——木牌样式 Tab，选中项=暖黄灯底色 + 下方 2px 朱红手划线。
- 右：排序下拉（默认上架时间 / 价格从低到高 / 价格从高到低）+ 结果计数「共 N 件」（EB Garamond）。
**Animation**：Tab 选中态用 Framer Motion `layoutId` 滑动下划线（300ms）；切换筛选时列表容器 opacity 0.4→1（300ms 骨架过渡）。

## Section 3 · 商品网格（货架本体）

**Layout**：`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`，gap 24，单页 ≤24 件 + 底部分页（木牌页码，当前页=朱红印章圈）。
`<ProductCard/>` 结构（与首页一致，此处补全规格）：
- 图区 4:3（缺省 `product-placeholder.png`），统一暖色滤镜；
- 分类小签（左上，苔绿底奶油字 Caption）；
- 商品名 H4 18/26（2 行截断）、价格 EB Garamond 20「¥ 起」样式；
- 店主手记一行（手写体 14，木棕，省略号收尾）；
- 售罄：图 50% 灰 + 斜置「售罄」朱红印章；hover 不显示加购。
- 卡内 hover 浮现底部快捷条：「加入购物车」icon 钮（邮戳朱圆钮）。
**Animation**：入场 stagger 0.08s（y 40→0，750ms，trigger 85%）；快捷条自卡底滑上（translateY 100%→0，350ms）；加购成功=商品图缩小成一点飞向 Navbar 购物车 icon（Framer Motion 贝塞尔路径 700ms）+ 购物车角标弹跳式计数（仅数字放大 1.2→1，无位移弹跳）。

## Section 4 · 空结果 / 分页底

**Layout**：筛选无结果时 `<EmptyState/>`：`milkbox-empty.png`（200px）+「这一格货架空着。」+ 两个按钮「看看全部商品」「把烦恼写下来投进信箱」（双轨互导，后者→`/letters/new`）。
分页下 footer 提示「货架就这些了，剩下的故事在信箱里。」
**Animation**：空状态牛奶箱箱盖缓慢开合一次（`<MilkBoxOpen/>` 空箱变体）。

## 本页 Assets
`prod-stationery.png` `prod-kitchen.png` `prod-healing.png` `product-placeholder.png` `milkbox-empty.png`。

## 交互备忘
- 筛选/排序全部走 URL query（`?category=&sort=&page=`），可分享。
- 售罄商品仍可进详情（显示"售罄"），不可加购。
- 移动端工具条折叠为"筛选"抽屉按钮（底部弹出牛皮纸 Drawer）。
