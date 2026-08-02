import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * 逐字落字标题（手写体大字用）：每字 y 24→0 + opacity，stagger 可配。
 * Framer Motion UI 组件，勿与 GSAP 容器混用。
 */
export default function DropText({
  text,
  stagger = 0.06,
  delay = 0,
  className,
}: {
  text: string;
  stagger?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex', className)} aria-label={text} role="text">
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          aria-hidden
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: delay + i * stagger, ease: EASE }}
          className="inline-block will-change-transform"
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  );
}
