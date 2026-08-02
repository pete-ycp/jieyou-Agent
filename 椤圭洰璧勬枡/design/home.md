# 首页 `/` — home.md

> 任务：一屏讲清"这是一家能买日杂好物、也能投递烦恼的店"。氛围优先，转化其次。
> 全局元素（Navbar + DayNightBar + Footer）见 design.md，本文件只写页面主体。

## Section 1 · Hero：黄昏店头（全屏，100vh）

**Layout**：满屏头图（日间 `/hero-storefront.png`，夜间 `/hero-storefront-night.png`，随昼夜主题切换，切换时 1200ms 交叉淡入）。图上叠一层暖黄→透明径向光（左下提灯位置）。内容居中偏左：
- 竖排大字（手写体 Ma Shan Zheng，Display 56/64，奶油色带 2px 暖光晕）：「写下烦恼，明天来牛奶箱取回答。」
- 其下横排小字（Noto Serif SC 16/28，奶油 90%）：「浪矢杂货店 · 提供商品订购服务，欢迎咨询」
- 双 CTA（间距 16）：
  - 主 CTA（邮戳朱实心，盖章感）：「去货架看看」→ `/products`
  - 次 CTA（描边双线、信封 icon）：「写一封信」→ `/letters/new`
- 右下角一枚竖挂小木牌：「牛奶箱已就位」，hover 显示"我的信件"入口（登录后）。

**Animation**：载入时头图 scale 1.06→1（1600ms ease-out）+ 竖排标题逐字自上而下落字（每字 80ms stagger，opacity 0→1, y -12→0）；双 CTA 延迟 900ms 浮入（y 24→0, 600ms）。提灯位置挂 `<LampGlow/>` 呼吸光晕常驻。向下滚动时头图 0.4 倍速视差上移，标题以 0.15 倍速淡出。

## Section 2 · 昼夜说明带（机制一句话）

**Layout**：窄通栏（`bg-kraft` 上下缝纫虚线），三段横排（移动竖排），每段：SVG icon + 一句说明——
① 投递口 icon「晚上，把信投进卷帘门的投递口」② 时钟 icon「店主清晨五点半起身写回信」③ 牛奶箱 icon「次日早上 8:30 前，回信放进牛奶箱」。
**Animation**：入场 stagger 0.15s，y 40→0，opacity 0→1（800ms，trigger 85%）；三个 icon hover 时轻微点亮（暖黄光晕浮现 400ms）。

## Section 3 · 经典语录轮播（竖排）

**Layout**：`bg-cream`，左侧竖排小标题「店里的话」+ `quote-brush.svg` 墨点；中央大面积竖排语录（H1 36/44，手写体），右下角落款「——《解忧杂货店》· 第X章」（Caption 12，旧瓦青灰）。轮播 3–5 条种子数据：
- 「人的心声是绝对不能无视的。」（第一章）
- 「无论现在多么不开心，你要相信，明天会比今天更好。」（第二章）
- 「你的地图是一张白纸，一切全在你自己。」（第五章，改写）
左右各一枚木牌箭头，自动 6s 切换。
**Animation**：切换=旧语录整列字向上淡出（y -20, opacity→0, 500ms）→ 新语录逐列自右向左浮现（竖排先右列，每列 120ms stagger，700ms）。滚动进入时整区淡入 800ms。

## Section 4 · 商城精选货架（主线入口）

**Layout**：`divider-wave.svg` 开场。标题组：手写体 H2「货架上寥寥的商品」+ 小字「但每一件，店主都用纸包好了」。下方 `grid-cols-2 md:grid-cols-4` 精选商品卡（`<ProductCard/>` ×4–8，取自三个分类各代表 SKU）：
- 卡片=明信片风（牛皮纸底、双线框、圆角 12）：商品图（4:3，暖色滤镜）、商品名（H4 18）、价格（EB Garamond 20 + ¥）、底部一行手写体店主手记摘录（14，木棕，超长省略）。
- 售罄卡：图置灰 + 斜贴「售罄」朱红印章（rotate -12°）。
底部「去货架看看全部 →」文字链。
**Animation**：卡片入场 stagger 0.1s（y 40→0 + opacity，750ms，trigger 80%）；hover：卡片 y -6、背后暖光晕浮现、商品图 scale 1→1.03（600ms）；价格数字 EB Garamond italic 微变。点击卡片整卡可点，按下时下沉 1px。

## Section 5 · 解忧信箱入口（特色板块，情绪峰值区）

**Layout**：左右 5:7（移动竖排）。左=`mail-slot.png` 大图（卷帘门投递口特写，加 `<LampGlow/>`），右侧牛皮纸大卡：
- 手写体 H2「卷帘门上有一个投递口」
- 正文：「把烦恼写在信里，投进来。不必署名——给自己取个笔名就好。店主会在明早 8:30 前，把回信放进店后的牛奶箱。你的信，只有店主会读。」
- 三枚分类印章小 icon 预览（爱情/梦想/人生方向…「五类烦恼，都可以」）
- 主 CTA（邮戳朱）：「现在写一封」→ `/letters/new`；次链「先看看别人怎么写 →」→ `/stories`
**Animation**：左侧图滚动视差（0.85 倍速）；右卡入场 slide-left 60px→0 + opacity（900ms）；CTA 上常驻一次微弱呼吸（朱红 95%↔100% 亮度，3.2s）；hover 次链手绘下划线 draw 300ms。

## Section 6 · 示例信件摘要（双轨互导）

**Layout**：标题「他们曾这样写信」+ 横滑卡片带（桌面 3 张可见，移动横滑 snap）：取 5 篇示例信件中的 3 篇，每张 `<PostcardCard/>`：左上分类印章 + 笔名（手写体 H4，如「月兔」）+ 来信首句摘录（2 行截断）+ 「读这封回信 →」。卡尾一张"更多"卡→ `/stories`。
**Animation**：卡带入场 stagger 0.12s 自右滑入（x 60→0, 800ms）；hover 卡片上浮 4px + 邮戳图案淡入右上角（300ms）。

## Section 7 · 收尾带（ Footer 前）

**Layout**：深夜蓝窄带（提前预告页脚气质），中央一行手写体奶油字「无论现在多么不开心，你要相信，明天会比今天更好。」+ 左侧红豆面包牛奶小插画 `/anpan-milk.svg`。
**Animation**：插画热气 4s 循环；文字入场逐字浮现（60ms stagger）；整带只做一次入场，不循环。

## 本页 Assets
`hero-storefront.png` `hero-storefront-night.png` `mail-slot.png` `quote-brush.svg` `divider-wave.svg` `anpan-milk.svg` `night-lamp.svg` 分类印章×5（icon 预览）· 商品图用 `prod-*.png` 或 `product-placeholder.png`。

## 交互与状态备忘
- 未登录点「写一封信」→ 跳转 `/login?from=/letters/new`（Toast：「先进店来，写不写随你。」）。
- 牛奶箱角标=未读回信数（登录后轮询/推送）；点击直达 `/letters/mine`。
- 搜索 icon 展开挂于 Navbar 下的木牌搜索条（input 自动聚焦，Enter→`/search?q=`）。
