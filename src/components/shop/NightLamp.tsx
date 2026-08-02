import { cn } from '@/lib/utils';

/** 日式提灯 icon，两态：灭（木棕线稿）/ 亮（暖黄填充 + 光晕） */
export default function NightLamp({
  on = false,
  className,
  size = 26,
}: {
  on?: boolean;
  className?: string;
  size?: number;
}) {
  const line = on ? '#B85C38' : '#6B4A32';
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn('transition-all duration-500', className)}
      aria-hidden
    >
      {on && (
        <circle cx="100" cy="106" r="82" fill="#F2B95C" opacity="0.35">
          <animate attributeName="opacity" values="0.25;0.45;0.25" dur="3.2s" repeatCount="indefinite" />
        </circle>
      )}
      <line x1="100" y1="12" x2="100" y2="34" stroke="#3A2E24" strokeWidth="5" />
      <rect x="78" y="34" width="44" height="12" rx="4" fill={on ? '#8A4A30' : '#6B4A32'} />
      <ellipse cx="100" cy="106" rx="52" ry="62" fill={on ? '#F2B95C' : 'none'} stroke={line} strokeWidth="5" />
      {!on && <ellipse cx="100" cy="106" rx="44" ry="54" fill="#F7F0E1" opacity="0.28" />}
      <path d="M50 106 h100 M58 78 q42 16 84 0 M58 134 q42 -16 84 0" fill="none" stroke={line} strokeWidth="3.4" />
      <path d="M100 46 q-26 30 0 120 M100 46 q26 30 0 120" fill="none" stroke={line} strokeWidth="2.6" opacity="0.85" />
      <rect x="82" y="162" width="36" height="11" rx="4" fill={on ? '#8A4A30' : '#6B4A32'} />
      <line x1="100" y1="173" x2="100" y2="184" stroke={line} strokeWidth="3.4" />
      <circle cx="100" cy="188" r="4" fill={line} />
    </svg>
  );
}
