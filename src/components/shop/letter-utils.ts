import { PEN_NAME_PREFIX, PEN_NAME_SUFFIX, REPLY_SLA_HOURS, LETTER_CATEGORIES } from '@contracts/labels';
import type { LetterCategory } from '@contracts/labels';

/** 随机笔名 = PREFIX[随机] + SUFFIX[随机]（「雨夜的猫」「迷路的鲸」式日系意象） */
export function randomPenName(except?: string): string {
  let name = '';
  do {
    const p = PEN_NAME_PREFIX[Math.floor(Math.random() * PEN_NAME_PREFIX.length)];
    const s = PEN_NAME_SUFFIX[Math.floor(Math.random() * PEN_NAME_SUFFIX.length)];
    name = `${p}${s}`;
  } while (except && name === except);
  return name;
}

/** 邮戳上的日期格式：2024.05.17 */
export function fmtPostmarkDate(d: Date | string | number | null | undefined): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** 预计回信时间 = 投信时间 + 24h（SLA） */
export function replyDeadline(createdAt: Date | string | number): Date {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(base.getTime() + REPLY_SLA_HOURS * 60 * 60 * 1000);
}

/** 预计回信时刻的口语化描述（明早 8:30 前） */
export function deadlineText(createdAt: Date | string | number): string {
  const d = replyDeadline(createdAt);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 分类引导语（/letters §3 与写信页共用） */
export const CATEGORY_GUIDES: Record<LetterCategory, string> = {
  love: '心里有人，进退两难',
  dream: '想走的路，和该走的路',
  family: '最亲的人，最难开口',
  career: '眼前的活计，和远处的灯',
  life: '站在岔路口，地图是一张白纸',
};

export const CATEGORY_LABELS: Record<LetterCategory, string> = Object.fromEntries(
  LETTER_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<LetterCategory, string>;

/** 摘录：去掉多余空白后截断 */
export function excerpt(text: string | null | undefined, max = 64): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export type { LetterCategory };
