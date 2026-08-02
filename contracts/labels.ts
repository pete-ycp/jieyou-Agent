/** 前后端共享的业务枚举标签与文案（解忧杂货店） */

export const PRODUCT_CATEGORIES = [
  { value: "stationery", label: "信纸文具", note: "写信的纸与笔，是解忧的起点" },
  { value: "kitchen", label: "厨房日杂", note: "热汤与灯火，日常的安慰" },
  { value: "healing", label: "治愈小物", note: "摆在桌角的小小善意" },
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];

export const LETTER_CATEGORIES = [
  { value: "love", label: "爱情" },
  { value: "dream", label: "梦想" },
  { value: "family", label: "家庭" },
  { value: "career", label: "事业" },
  { value: "life", label: "人生方向" },
] as const;
export type LetterCategory = (typeof LETTER_CATEGORIES)[number]["value"];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_pay: "待支付",
  paid: "待发货",
  shipped: "已发货",
  done: "已完成",
  cancelled: "已取消",
};

export const LETTER_STATUS_LABELS: Record<string, string> = {
  pending: "待回信",
  replied: "已回信",
  egg: "白纸回信",
};

/** 随机笔名词库（日系意象，对标"月兔""迷途的小狗"） */
export const PEN_NAME_PREFIX = [
  "雨夜的", "迷路的", "望月的", "拾星的", "逆风走地", "晚风里的",
  "灯下的", "过桥的", "候车的", "追风筝的", "听海的", "种月亮的",
] as const;
export const PEN_NAME_SUFFIX = [
  "猫", "鲸", "邮差", "旅人", "萤火虫", "口琴",
  "小船", "牧羊人", "纸飞机", "兔子", "气象台", "修表匠",
] as const;

/** 白纸彩蛋回信（化用小说结尾，已改写避免大段照搬） */
export const EGG_REPLY = `致无名氏的朋友：

你寄来的是一张白纸。没有署名，也没有一个字。

我想，这也许是因为——你面前的路还没有被写下，你的地图还是一片空白。这的确让人伤脑筋，任何人都会不知所措。

可是换个角度看：正因为是一张白纸，才可以随心所欲地描绘。去哪里、成为谁、怎样生活，一切全在你自己。在你面前是无限的可能，这可是很棒的事啊。

我衷心祈祷你可以相信自己，无悔地燃烧自己的人生。

浪矢杂货店`;

/** 回信承诺文案 */
export const REPLY_PROMISE =
  "浪矢店主每天五点半起床写回信——你的回信将在 24 小时内放进牛奶箱（最迟明早 8:30）。";

/** 回信时限（小时），超时在后台标红 */
export const REPLY_SLA_HOURS = 24;

/** 感谢信开放：回信送达多少天后可写感谢信 */
export const THANKS_AFTER_DAYS = 7;

/** 温和限流：每账号每小时最多投信数 */
export const LETTER_RATE_LIMIT_PER_HOUR = 3;
