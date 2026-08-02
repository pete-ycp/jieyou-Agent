import { useRef } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

/**
 * 签名动效 ④：纸面展开（信件阅读页）。
 * 信纸 scaleY 0.6→1 + 顶部向下"摊平"位移；可选邮戳盖章
 * （scale 1.6→1, rotate -12°→-8°, opacity 0→1 + 墨晕 blur 扩散）。
 * 默认挂载即播一次；onScroll 时进入视口 85% 再播（缩版 700ms）。
 * GSAP 专用容器：内部请只用 CSS 过渡做微交互。
 */
export default function PaperUnfold({
  children,
  className,
  onScroll = false,
  stamp,
}: {
  children: ReactNode;
  className?: string;
  /** 进入视口再播（回信卡缩版） */
  onScroll?: boolean;
  /** 盖章元素（通常是 <Postmark/>），会在展开后盖下 */
  stamp?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const duration = onScroll ? 0.7 : 0.9;
      const trigger = onScroll
        ? { scrollTrigger: { trigger: root.current, start: 'top 85%', once: true } }
        : {};

      const tl = gsap.timeline({ ...trigger });
      tl.fromTo(
        root.current,
        { scaleY: 0.6, y: -18, transformOrigin: 'center top' },
        { scaleY: 1, y: 0, duration, ease: 'power3.out' },
      ).fromTo(
        root.current,
        { opacity: 0.35 },
        { opacity: 1, duration: duration * 0.6, ease: 'power2.out' },
        0,
      );

      if (stamp) {
        tl.fromTo(
          stampRef.current,
          { scale: 1.6, rotate: -12, opacity: 0, filter: 'blur(2px)' },
          { scale: 1, rotate: -8, opacity: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power2.in' },
          duration * 0.75,
        ).fromTo(
          stampRef.current,
          { filter: 'blur(0px)' },
          { filter: 'blur(0.4px)', duration: 0.2 },
        );
      }
    },
    { scope: root },
  );

  return (
    <div ref={root} className={cn('relative will-change-transform', className)}>
      {children}
      {stamp && (
        <div ref={stampRef} className="pointer-events-none absolute right-5 top-5 z-10 opacity-0">
          {stamp}
        </div>
      )}
    </div>
  );
}
