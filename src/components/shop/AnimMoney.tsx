import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

/**
 * 金额数字滚动：value 变化时 300–500ms 内平滑过渡到新值（tween，无弹跳）。
 * 传 `from` 可在挂载时从指定值滚入（如收银台金额从 0 逐位滚入）。
 */
export default function AnimMoney({
  value,
  from,
  duration = 0.4,
  className,
}: {
  value: number;
  from?: number;
  duration?: number;
  className?: string;
}) {
  const mv = useMotionValue(from ?? value);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, duration, mv]);

  const text = useTransform(mv, (v) => v.toFixed(2));

  return <motion.span className={className}>{text}</motion.span>;
}
