import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

/**
 * 签名动效 ③：牛奶箱开启（我的信件有未读回信时自动播一次）。
 * 箱盖 rotateX 0→-70°（transform-origin 顶边，600ms）→ 信纸从箱口升起（y 24→-8）→ 微光溢出。
 * 只自动播一次，之后 hover 可重播。GSAP 专用组件。
 */
export default function MilkBoxOpen({
  size = 200,
  autoPlay = true,
  className,
}: {
  size?: number;
  autoPlay?: boolean;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const lid = useRef<HTMLDivElement>(null);
  const letter = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const playedRef = useRef(false);

  const { contextSafe } = useGSAP(
    () => {
      gsap.set(lid.current, { rotationX: 0, transformOrigin: '50% 0%' });
      gsap.set(letter.current, { y: 26, opacity: 0, xPercent: -50, rotation: -4 });
      gsap.set(glow.current, { opacity: 0 });

      tlRef.current = gsap
        .timeline({ paused: true })
        // 箱盖掀起
        .to(lid.current, { rotationX: -70, duration: 0.6, ease: 'power2.out' })
        // 信纸从箱口升起
        .to(letter.current, { y: -8, opacity: 1, duration: 0.55, ease: 'power2.out' }, '-=0.15')
        // 微光溢出
        .to(glow.current, { opacity: 0.85, duration: 0.5, ease: 'power1.inOut' }, '<')
        // 箱盖轻轻回落一点（静置）
        .to(lid.current, { rotationX: -58, duration: 0.4, ease: 'power1.inOut' }, '+=0.15');

      if (autoPlay && !playedRef.current) {
        playedRef.current = true;
        tlRef.current.play(0);
      }
    },
    { scope: root },
  );

  const replay = contextSafe(() => {
    tlRef.current?.restart();
  });

  return (
    <div
      ref={root}
      onMouseEnter={replay}
      className={cn('relative select-none', className)}
      style={{ width: size, height: size, perspective: size * 3 }}
      role="img"
      aria-label="牛奶箱里有一封回信"
    >
      {/* 微光 */}
      <div
        ref={glow}
        aria-hidden
        className="pointer-events-none absolute inset-[-18%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(242,185,92,0.5) 0%, transparent 68%)',
          filter: 'blur(6px)',
        }}
      />
      {/* 升起的信 */}
      <div
        ref={letter}
        className="absolute left-1/2 top-[16%] z-10 h-[26%] w-[42%] rounded-[3px] bg-kraft shadow-paper will-change-transform"
        style={{ border: '1px solid #B9A67F' }}
      >
        <div className="absolute right-1 top-1 h-3 w-3 rounded-full border border-stamp/70" />
        <div className="absolute bottom-1 left-1 right-1 border-t border-[#B9A67F]/60" />
      </div>
      {/* 箱体 */}
      <div
        className="absolute inset-x-[8%] bottom-[6%] top-[34%] rounded-lg bg-milk shadow-paper-deep"
        style={{ border: '2px solid #4E5D5A' }}
      >
        {/* 投信口横缝 */}
        <div className="absolute inset-x-[14%] top-[16%] h-[14%] rounded-sm bg-[#3A2E24]/70" />
        <div className="absolute inset-x-[14%] bottom-[26%] border-t-2 border-[#4E5D5A]/40" />
      </div>
      {/* 箱盖（顶边为轴掀起） */}
      <div
        ref={lid}
        className="absolute inset-x-[4%] top-[22%] z-20 h-[16%] will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="h-full w-full rounded-t-md bg-vermilion shadow-paper"
          style={{
            border: '2px solid #8A3F28',
            clipPath: 'polygon(6% 100%, 50% 0%, 94% 100%)',
          }}
        />
      </div>
    </div>
  );
}
