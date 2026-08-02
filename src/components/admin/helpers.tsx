import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  LETTER_CATEGORIES,
  ORDER_STATUS_LABELS,
  PRODUCT_CATEGORIES,
  REPLY_SLA_HOURS,
} from '@contracts/labels';

/** 后台商品行（admin.products 返回，price 已转 number） */
export interface AdminProduct {
  id: number;
  name: string;
  category: 'stationery' | 'kitchen' | 'healing';
  price: number;
  stock: number;
  imageUrl: string | null;
  description: string | null;
  keeperNote: string | null;
  status: 'on_sale' | 'off_shelf';
  createdAt: Date | string;
}

/** 后台信件行 */
export interface AdminLetter {
  id: number;
  userId: number;
  penName: string;
  category: 'love' | 'dream' | 'family' | 'career' | 'life';
  content: string;
  status: 'pending' | 'replied' | 'egg';
  replyContent: string | null;
  repliedAt: Date | string | null;
  readAt: Date | string | null;
  thanksContent: string | null;
  thanksAt: Date | string | null;
  isFeatured: boolean;
  createdAt: Date | string;
}

/** 后台订单行（admin.orders 返回，totalAmount 已转 number） */
export interface AdminOrder {
  id: number;
  orderNo: string;
  userId: number;
  totalAmount: number;
  status: 'pending_pay' | 'paid' | 'shipped' | 'done' | 'cancelled';
  receiver: string;
  phone: string;
  address: string;
  paidAt: Date | string | null;
  shippedAt: Date | string | null;
  createdAt: Date | string;
}

/** 后台内容行 */
export interface AdminContent {
  id: number;
  type: 'quote' | 'story' | 'about';
  title: string;
  body: string;
  sourceNote: string | null;
  sort: number;
  status: 'online' | 'offline';
  createdAt: Date | string;
}

export const PRODUCT_IMAGE_CHOICES = [
  { value: '/product-placeholder.png', label: '牛皮纸包裹（通用）' },
  { value: '/prod-stationery.png', label: '信纸文具分类图' },
  { value: '/prod-kitchen.png', label: '厨房日杂分类图' },
  { value: '/prod-healing.png', label: '治愈小物分类图' },
  { value: '/milkbox-letter.png', label: '牛奶箱与信' },
  { value: '/about-shop.png', label: '店内矮桌一景' },
];

export function productCategoryLabel(value: string) {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function letterCategoryLabel(value: string) {
  return LETTER_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function orderStatusLabel(value: string) {
  return ORDER_STATUS_LABELS[value] ?? value;
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fmtDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 回信时限信息：投信 + REPLY_SLA_HOURS 的截止时间与是否超时 */
export function replyDeadline(createdAt: Date | string) {
  const start = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const deadline = start.getTime() + REPLY_SLA_HOURS * 60 * 60 * 1000;
  const remainMs = deadline - Date.now();
  return { deadline, remainMs, overdue: remainMs < 0 };
}

export function fmtRemain(remainMs: number) {
  const abs = Math.abs(remainMs);
  const hours = Math.floor(abs / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const body = hours > 0 ? `${hours} 小时 ${minutes} 分` : `${minutes} 分`;
  return remainMs >= 0 ? `还剩 ${body}` : `已超时 ${body}`;
}

/** 状态小印章（苔绿=在线/在售，青灰=下线/下架，朱红=超时） */
export function StatusSeal({
  tone,
  children,
  className,
}: {
  tone: 'moss' | 'slate' | 'stamp' | 'lamp';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    moss: 'border-moss/70 text-moss',
    slate: 'border-slate/60 text-slate',
    stamp: 'border-stamp/70 text-stamp',
    lamp: 'border-lamp/70 text-[#B07E2B]',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex -rotate-2 items-center justify-center whitespace-nowrap rounded border bg-cream/60 px-1.5 py-0.5 text-[11px] leading-4 tracking-[0.08em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** 后台区块标题（手写体 + 缝纫虚线） */
export function AdminSectionTitle({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="font-hand text-3xl text-wood">{title}</h2>
      {note && <p className="mt-1 text-sm text-slate">{note}</p>}
      <div className="divider-sew mt-4" />
    </div>
  );
}

/** 简化双线表格样式（后台统一） */
export const ADMIN_TABLE = 'w-full text-sm text-ink';
export const ADMIN_THEAD_ROW =
  'border-b-2 border-[#C9B48C] text-left text-xs tracking-[0.12em] text-wood';
/** 表头单元格：whitespace-nowrap 防止窄屏下中文逐字折行（溢出由外层 overflow-x-auto 横滚承担） */
export const ADMIN_TH = 'whitespace-nowrap px-3 py-2.5 font-medium';
export const ADMIN_TR =
  'border-b border-[#C9B48C]/60 align-middle transition-colors hover:bg-lamp/5';
export const ADMIN_TD = 'px-3 py-2.5';
