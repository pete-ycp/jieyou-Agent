import type { Product } from '@/components/shop/ProductCard';
import type { Story } from '@/components/shop/PostcardCard';

/** 首页种子数据（后端嫁接后由接口替换） */

export const FEATURED_PRODUCTS: Product[] = [
  {
    id: 'stationery-set',
    name: '和纸信纸套装',
    price: 36.0,
    image: '/prod-stationery.png',
    note: '写信的人，都值得用好纸。',
  },
  {
    id: 'enamel-cup',
    name: '昭和搪瓷杯',
    price: 28.0,
    image: '/prod-kitchen.png',
    note: '热水倒进旧杯子，雾气也是暖的。',
  },
  {
    id: 'harmonica-mini',
    name: '迷你口风琴',
    price: 45.0,
    image: '/prod-healing.png',
    note: '吹不响也没关系，先哼出来。',
    soldOut: true,
  },
  {
    id: 'kraft-parcel',
    name: '牛皮纸包裹盲盒',
    price: 52.0,
    image: '/product-placeholder.png',
    note: '每一件，店主都用纸包好了。',
  },
];

export const QUOTES = [
  { text: '人的心声是绝对不能无视的。', source: '第一章' },
  { text: '无论现在多么不开心，你要相信，明天会比今天更好。', source: '第二章' },
  { text: '你的地图是一张白纸，一切全在你自己。', source: '第五章' },
];

export const FEATURED_STORIES: Story[] = [
  {
    id: 'moon-rabbit',
    penName: '月兔',
    category: 'love',
    excerpt: '奥运会和恋人之间，我到底该选哪一个？我知道这样问很自私……',
    date: '1979.11',
  },
  {
    id: 'musician',
    penName: '鱼店音乐人',
    category: 'dream',
    excerpt: '家里的鱼店和放不下的音乐，我是不是该认命了？',
    date: '1980.07',
  },
  {
    id: 'green-river',
    penName: '绿河',
    category: 'life',
    excerpt: '我怀了孩子，但他有家庭。这个孩子，该不该来到世上？',
    date: '1981.02',
  },
];

export const MECHANISMS = [
  { icon: 'slot', text: '晚上，把信投进卷帘门的投递口' },
  { icon: 'clock', text: '店主清晨五点半起身写回信' },
  { icon: 'box', text: '次日早上 8:30 前，回信放进牛奶箱' },
] as const;
