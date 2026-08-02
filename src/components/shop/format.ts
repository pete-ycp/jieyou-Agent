import { format } from 'date-fns';

/** 金额：保留两位小数（EB Garamond 排版时由调用方加 ¥ 前缀） */
export const fmtMoney = (n: number) => n.toFixed(2);

/** 邮戳式日期：2024.06.13 */
export const fmtDate = (d: Date | string | number) => format(new Date(d), 'yyyy.MM.dd');

/** 存根式日期时间：2024.06.13 17:30 */
export const fmtDateTime = (d: Date | string | number) => format(new Date(d), 'yyyy.MM.dd HH:mm');
