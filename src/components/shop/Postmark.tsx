import { cn } from '@/lib/utils';

/**
 * 邮戳/日期章：圆环双线 + 弧形字 + 斜杠纹。
 * 用于信件日期、订单日期、盖章动效。
 */
export default function Postmark({
  date,
  text = '浪矢杂货店',
  size = 92,
  className,
}: {
  date: string;
  text?: string;
  size?: number;
  className?: string;
}) {
  const id = `pm-${text.length}-${size}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('text-stamp', className)}
      style={{ transform: 'rotate(-8deg)' }}
      aria-hidden
    >
      <g fill="none" stroke="currentColor" opacity="0.85">
        <circle cx="50" cy="50" r="46" strokeWidth="2.4" />
        <circle cx="50" cy="50" r="38" strokeWidth="1.2" />
        <path d="M12 44 q38 -14 76 0 M12 56 q38 14 76 0" strokeWidth="1.4" opacity="0.7" />
      </g>
      <defs>
        <path id={id} d="M 50 12 A 38 38 0 0 1 88 50" />
        <path id={`${id}-b`} d="M 88 50 A 38 38 0 0 1 50 88" />
      </defs>
      <text fontSize="10.5" fill="currentColor" letterSpacing="2" opacity="0.9">
        <textPath href={`#${id}`}>{text}</textPath>
      </text>
      <text fontSize="9" fill="currentColor" letterSpacing="1.5" opacity="0.9">
        <textPath href={`#${id}-b`}>{date}</textPath>
      </text>
      <line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
    </svg>
  );
}
