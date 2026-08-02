import { cn } from '@/lib/utils';

/**
 * 牛奶箱（本店第一核心符号）。
 * 牛奶蓝白箱体 + 褪朱红箱盖，可带未读回信角标（苔绿圆点）。
 */
export default function MilkBox({
  unread = 0,
  size = 26,
  hasLetter = false,
  className,
}: {
  unread?: number;
  size?: number;
  /** 箱口露出一封信 */
  hasLetter?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        {hasLetter && (
          <g transform="rotate(-8 32 20)">
            <rect x="23" y="9" width="20" height="14" rx="1.5" fill="#EBDCC3" stroke="#B9A67F" strokeWidth="1.4" />
            <path d="M23 10 L33 17.5 L43 10" fill="none" stroke="#B9A67F" strokeWidth="1.4" />
          </g>
        )}
        <rect x="12" y="24" width="40" height="30" rx="4" fill="#DCE8E4" stroke="currentColor" strokeWidth="2.4" />
        <rect x="16" y="27" width="32" height="8" rx="2" fill="#3A2E24" opacity="0.7" />
        <rect x="12" y="37" width="40" height="17" rx="4" fill="#DCE8E4" />
        <line x1="16" y1="44" x2="48" y2="44" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <path d="M9 24 L32 14 L55 24 Z" fill="#B85C38" stroke="#8A3F28" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-moss px-1 text-[10px] font-medium leading-none text-cream">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </span>
  );
}
