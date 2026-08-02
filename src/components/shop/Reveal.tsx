import { useRef } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

/**
 * 常规 section 入场统一规范（GSAP ScrollTrigger 专用容器）：
 * y: 40→0, opacity: 0→1, duration 0.8s, stagger 0.12s, trigger at 85% viewport。
 * 内部元素请只用 CSS 过渡做微交互，不要在本容器内叠加 Framer Motion。
 */
export default function Reveal({
  children,
  className,
  stagger = 0.12,
  y = 40,
  x = 0,
  duration = 0.8,
  start = 'top 85%',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  x?: number;
  duration?: number;
  start?: string;
  as?: 'div' | 'section';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = el.children.length > 1 ? Array.from(el.children) : el;
      gsap.fromTo(
        targets,
        { y, x, opacity: 0 },
        {
          y: 0,
          x: 0,
          opacity: 1,
          duration,
          stagger,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref as never} className={cn(className)}>
      {children}
    </Tag>
  );
}
