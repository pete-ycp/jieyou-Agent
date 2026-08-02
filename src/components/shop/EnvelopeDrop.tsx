import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * 签名动效 ②：信封投递（写信/感谢信提交时的全屏遮罩动效）。
 * 深夜蓝 80% 遮罩 + 聚光；信纸沿中线折起（scaleY 1→0.35）→ 滑向投递口（translateX + rotate -4°）
 * → 没入细长投信口（scaleX→0.6, opacity 渐隐）→ 投信口下沿灯一闪。
 * 完整版约 1.8s；compact（感谢信缩版）约 1.2s。结束触发 onDone（由父级跳确认态）。
 *
 * GSAP 专用组件：内部不要再叠 Framer Motion。
 */
export default function EnvelopeDrop({
  onDone,
  compact = false,
}: {
  onDone: () => void;
  /** 缩版 1.2s（感谢信用） */
  compact?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const flap = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const slotFlash = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const k = compact ? 0.66 : 1; // 时长系数：完整 1.8s / 缩版 1.2s
    const ctx = gsap.context(() => {
      // 信纸中心 → 投递口中心 的实际距离（自适应宽度）
      const paperRect = paper.current?.getBoundingClientRect();
      const slotRect = slot.current?.getBoundingClientRect();
      const dx =
        paperRect && slotRect
          ? slotRect.left + slotRect.width / 2 - (paperRect.left + paperRect.width / 2)
          : 230;

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
          if (!doneRef.current) {
            doneRef.current = true;
            onDoneRef.current();
          }
        },
      });
      tl
        // 信纸浮现
        .fromTo(paper.current, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.3 * k, ease: 'power2.out' })
        // 沿中线折起变信封（scaleY 1→0.35）
        .to(paper.current, { scaleY: 0.35, duration: 0.5 * k, transformOrigin: 'center top' })
        // 封口三角落下
        .to(flap.current, { opacity: 1, duration: 0.18 * k }, '<+=0.2')
        // 滑向投递口（translateX + rotate -4°）
        .to(paper.current, { x: dx, rotate: -4, duration: 0.55 * k, ease: 'power2.in' }, '+=0.05')
        // 没入投信口（scaleX→0.6 + 渐隐）
        .to(paper.current, { scaleX: 0.6, opacity: 0, duration: 0.28 * k, ease: 'power1.in' }, '-=0.08')
        // 投信口下沿灯一闪
        .fromTo(slotFlash.current, { opacity: 0 }, { opacity: 1, duration: 0.1 * k, ease: 'power1.out' })
        .to(slotFlash.current, { opacity: 0.3, duration: 0.24 * k, ease: 'power1.in' });
    }, root);
    return () => ctx.revert();
  }, [compact]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-night/80 backdrop-blur-[2px]"
      role="presentation"
    >
      {/* 聚光 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(46% 42% at 50% 52%, rgba(242,185,92,0.16), transparent 72%)',
        }}
      />
      <div className="relative h-[300px] w-[min(92vw,640px)]">
        {/* 卷帘门投递口（右侧） */}
        <div className="absolute right-2 top-1/2 w-[210px] -translate-y-1/2">
          <div
            ref={slot}
            className="wood-grain relative rounded-md bg-slate/90 px-3 py-4 shadow-paper-deep"
            style={{ border: '1px solid rgba(201,180,140,0.35)' }}
          >
            {/* 黄铜细长投信口 8:1 */}
            <div className="relative mx-auto h-[14px] w-[168px] rounded-full bg-[#2A2018] shadow-inner">
              <div className="absolute inset-x-1 top-[2px] h-[3px] rounded-full bg-lamp/70" />
            </div>
            {/* 投信口下沿灯一闪 */}
            <div
              ref={slotFlash}
              className="pointer-events-none absolute -bottom-3 left-1/2 h-10 w-44 -translate-x-1/2 rounded-full opacity-0"
              style={{
                background:
                  'radial-gradient(50% 60% at 50% 0%, rgba(242,185,92,0.75), transparent 75%)',
                filter: 'blur(3px)',
              }}
            />
            <p className="mt-3 text-center font-hand text-sm text-cream/70">投递口</p>
          </div>
        </div>

        {/* 信纸/信封（左侧出发） */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ perspective: '600px' }}>
          <div
            ref={paper}
            className="kraft-lines relative h-56 w-40 rounded-sm bg-cream shadow-paper-deep will-change-transform"
            style={{ border: '1px solid #D9C9A8', backgroundPosition: '0 16px' }}
          >
            <p className="px-4 pt-4 font-hand text-base leading-8 text-wood">致浪矢杂货店：</p>
            {/* 折起后出现的信封封口三角 + 邮戳 */}
            <div
              ref={flap}
              className="pointer-events-none absolute inset-0 opacity-0"
              aria-hidden
            >
              <div
                className="absolute inset-x-0 top-0 h-0 w-0"
                style={{
                  borderLeft: '80px solid transparent',
                  borderRight: '80px solid transparent',
                  borderTop: '34px solid #E3D2B2',
                }}
              />
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-2 border-stamp/70" />
            </div>
          </div>
        </div>
      </div>
      <p className="absolute bottom-10 left-1/2 -translate-x-1/2 font-garamond text-sm tracking-[0.2em] text-cream/70">
        信，正在投进卷帘门的投递口……
      </p>
    </div>
  );
}
