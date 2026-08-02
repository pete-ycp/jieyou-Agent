import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * 签名动效 ①：暖光呼吸。
 * 台灯/灯笼光晕 opacity 0.55↔0.85、scale 1↔1.04，3.2s 循环（夜间更亮一档）。
 * 纯 CSS 动画，memo 隔离，不被父级重渲染打断。
 */
const LampGlow = memo(function LampGlow({
  className,
  size = 180,
  bright = false,
}: {
  className?: string;
  size?: number;
  bright?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none animate-lamp-breathe', className)}
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        background: `radial-gradient(circle, rgba(242,185,92,${bright ? 0.65 : 0.5}) 0%, rgba(232,163,61,${bright ? 0.28 : 0.18}) 42%, transparent 70%)`,
        filter: 'blur(2px)',
      }}
    />
  );
});

export default LampGlow;
