import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ChevronLeft, ChevronRight, Clock3, Mail } from 'lucide-react';
import { useDayNight } from '@/hooks/useDayNight';
import LampGlow from '@/components/shop/LampGlow';
import MilkBox from '@/components/shop/MilkBox';
import Reveal from '@/components/shop/Reveal';
import ProductCard from '@/components/shop/ProductCard';
import PostcardCard from '@/components/shop/PostcardCard';
import CategorySeal from '@/components/shop/CategorySeal';
import { FEATURED_PRODUCTS, FEATURED_STORIES, MECHANISMS, QUOTES } from '@/data/home';
import { trpc } from '@/providers/trpc';

gsap.registerPlugin(ScrollTrigger);

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const HERO_TITLE = '写下烦恼，明天来牛奶箱取回答。';

/* ---------------- Section 1 · Hero：黄昏店头 ---------------- */
function Hero() {
  const { isNight } = useDayNight();
  const root = useRef<HTMLElement>(null);
  const imgWrap = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 载入：头图 scale 1.06→1（1600ms ease-out）
      gsap.fromTo(imgWrap.current, { scale: 1.06 }, { scale: 1, duration: 1.6, ease: 'power2.out' });
      // 视差：头图 0.4 倍速上移，标题 0.15 倍速淡出
      gsap.to(imgWrap.current, {
        yPercent: -14,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to(titleRef.current, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: '40% top', scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative flex min-h-[calc(100dvh-96px)] items-center overflow-hidden bg-night">
      {/* 头图：昼夜交叉淡入 1200ms */}
      <div ref={imgWrap} className="absolute inset-0 will-change-transform">
        <img
          src="/hero-storefront.png"
          alt="黄昏时分的浪矢杂货店"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1200 ease-shop"
          style={{ opacity: isNight ? 0 : 1 }}
        />
        <img
          src="/hero-storefront-night.png"
          alt="深夜的浪矢杂货店"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1200 ease-shop"
          style={{ opacity: isNight ? 1 : 0 }}
        />
      </div>
      {/* 暖黄→透明径向光（左下提灯位置）+ 底部压暗 */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(46% 42% at 20% 78%, rgba(242,185,92,.34), transparent 72%), linear-gradient(to top, rgba(20,26,32,.55), transparent 45%)',
        }}
      />
      <LampGlow className="absolute bottom-[16%] left-[12%]" size={220} bright={isNight} />

      <div ref={titleRef} className="relative z-10 mx-auto w-full max-w-shop px-6 md:px-10">
        <div className="flex items-start gap-5 md:gap-14">
          {/* 竖排大字：逐字自上而下落字（小屏降一档字号，给右侧 CTA 留足宽度） */}
          <h1
            className="vertical-rl font-hand text-[36px] leading-[1.25] text-cream text-glow-lamp sm:text-[44px] md:text-[56px]"
            style={{ maxHeight: '62vh' }}
          >
            {HERO_TITLE.split('').map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08, duration: 0.6, ease: EASE }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>
          <div className="flex flex-col gap-6 pt-2">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.7, ease: EASE }}
              className="text-base text-cream/90"
            >
              浪矢杂货店 · 提供商品订购服务，欢迎咨询
            </motion.p>
            {/* 双 CTA：延迟 900ms 浮入 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.65, duration: 0.6, ease: EASE }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                to="/products"
                className="rounded-lg bg-stamp px-7 py-3 text-cream shadow-paper-deep transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95 active:translate-y-[2px]"
              >
                去货架看看
              </Link>
              {/* AUTH-SLOT: 未登录时 Phase 5 改为 /login?from=/letters/new */}
              <Link
                to="/letters/new"
                className="inline-flex items-center gap-2 rounded-lg border border-cream/70 px-7 py-3 text-cream shadow-[inset_0_0_0_3px_rgba(46,58,70,.35),inset_0_0_0_4px_rgba(247,240,225,.5)] transition-all duration-500 ease-shop hover:bg-cream/10"
              >
                <Mail size={17} />
                写一封信
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 右下竖挂小木牌：牛奶箱已就位 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.1, duration: 0.8 }}
        className="group absolute bottom-8 right-6 z-10 md:right-10"
      >
        <div className="wood-grain flex flex-col items-center gap-2 rounded-md bg-wood px-3 py-4 text-cream shadow-paper-deep">
          <span className="vertical-rl font-hand text-lg">牛奶箱已就位</span>
          <MilkBox size={22} />
          <Link
            to="/letters/mine"
            className="max-h-0 overflow-hidden text-xs text-lamp-glow opacity-0 transition-all duration-500 ease-shop group-hover:max-h-16 group-hover:opacity-100"
          >
            我的信件 →
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------------- Section 2 · 昼夜说明带 ---------------- */
function MechanismIcon({ kind }: { kind: (typeof MECHANISMS)[number]['icon'] }) {
  if (kind === 'clock') return <Clock3 size={30} strokeWidth={1.6} />;
  if (kind === 'box') return <MilkBox size={34} hasLetter />;
  // 投递口
  return (
    <svg viewBox="0 0 48 24" width="38" height="20" aria-hidden>
      <rect x="2" y="3" width="44" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="9" width="28" height="6" rx="2" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function MechanismBand() {
  return (
    <section className="divider-sew border-b bg-kraft" style={{ borderBottom: '2px dashed #B9A67F' }}>
      <Reveal className="mx-auto grid max-w-shop gap-8 px-6 py-10 md:grid-cols-3 md:gap-6" stagger={0.15}>
        {MECHANISMS.map((m) => (
          <div key={m.icon} className="group flex items-center gap-4 text-wood">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream/70 transition-shadow duration-400 group-hover:shadow-glow">
              <MechanismIcon kind={m.icon} />
            </span>
            <p className="text-[15px] leading-7">{m.text}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/* ---------------- Section 3 · 经典语录轮播（竖排） ---------------- */
function QuoteCarousel() {
  const [index, setIndex] = useState(0);
  // 接口语录；加载中/失败时回退到静态种子文案，不白屏
  const { data } = trpc.content.quotes.useQuery(undefined, { retry: false });
  const quotes =
    data && data.length > 0
      ? data.map((q) => ({ text: q.body, source: q.sourceNote ?? '' }))
      : QUOTES;

  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % quotes.length), 6000);
    return () => window.clearInterval(t);
  }, [quotes.length]);

  const quote = quotes[index % quotes.length];
  const prev = () => setIndex((i) => (i - 1 + quotes.length) % quotes.length);
  const next = () => setIndex((i) => (i + 1) % quotes.length);

  return (
    <section className="bg-cream">
      <Reveal className="mx-auto max-w-shop px-6 py-20 md:py-24" y={24}>
        <div className="flex items-center justify-between gap-6">
          {/* 左侧竖排小标题 + 墨点 */}
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            <span className="vertical-rl font-hand text-2xl text-wood">店里的话</span>
            <img src="/quote-brush.svg" alt="" className="w-24 opacity-80" aria-hidden />
          </div>

          <button
            type="button"
            onClick={prev}
            aria-label="上一条语录"
            className="wood-grain hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wood text-cream transition-transform duration-300 hover:scale-105 md:flex"
          >
            <ChevronLeft size={20} />
          </button>

          {/* 中央竖排语录 */}
          <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden md:min-h-[340px]">
            <AnimatePresence mode="wait">
              <motion.figure
                key={index}
                initial="enter"
                animate="show"
                exit="exit"
                className="flex max-w-full flex-wrap items-start justify-center gap-3 md:gap-6"
              >
                {quote.text.split('').map((ch, i) => (
                  <motion.span
                    key={i}
                    className="vertical-rl inline-block font-hand text-2xl leading-snug text-ink md:text-4xl"
                    variants={{
                      enter: { opacity: 0, x: 14 },
                      show: { opacity: 1, x: 0, transition: { delay: i * 0.05, duration: 0.7, ease: EASE } },
                      exit: { opacity: 0, y: -20, transition: { delay: i * 0.015, duration: 0.5, ease: EASE } },
                    }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </motion.figure>
            </AnimatePresence>
            <p className="absolute bottom-0 right-0 text-xs tracking-[0.12em] text-slate">
              ——《解忧杂货店》· {quote.source}
            </p>
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="下一条语录"
            className="wood-grain hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wood text-cream transition-transform duration-300 hover:scale-105 md:flex"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        {/* 移动端箭头 */}
        <div className="mt-8 flex justify-center gap-4 md:hidden">
          <button type="button" onClick={prev} aria-label="上一条语录" className="wood-grain flex h-10 w-10 items-center justify-center rounded-full bg-wood text-cream">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={next} aria-label="下一条语录" className="wood-grain flex h-10 w-10 items-center justify-center rounded-full bg-wood text-cream">
            <ChevronRight size={18} />
          </button>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------- Section 4 · 商城精选货架 ---------------- */
function FeaturedShelf() {
  // 精选货架：真实接口；加载中/失败时回退到静态种子数据，不白屏
  const { data } = trpc.shop.featured.useQuery(undefined, { retry: false });
  const products =
    data && data.length > 0
      ? data.map((p) => ({
          id: String(p.id),
          name: p.name,
          price: p.price,
          image: p.imageUrl || '/product-placeholder.png',
          note: p.keeperNote ?? '',
          soldOut: p.stock <= 0,
        }))
      : FEATURED_PRODUCTS;

  return (
    <section className="bg-page">
      <img src="/divider-wave.svg" alt="" aria-hidden className="h-10 w-full object-cover" />
      <div className="mx-auto max-w-shop px-6 py-16 md:py-20">
        <Reveal y={24}>
          <div>
            <h2 className="font-hand text-3xl text-page-fg md:text-4xl">货架上寥寥的商品</h2>
            <p className="mt-2 text-sm text-slate">但每一件，店主都用纸包好了。</p>
          </div>
        </Reveal>
        <Reveal className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4" stagger={0.1} duration={0.75} start="top 80%">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </Reveal>
        <Reveal y={16} className="mt-10 text-center">
          <Link to="/products" className="link-underline-hand inline-block text-[15px] text-stamp">
            去货架看看全部 →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Section 5 · 解忧信箱入口 ---------------- */
function LetterEntry() {
  const imgRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // 左图滚动视差（0.85 倍速）
      gsap.fromTo(
        imgRef.current,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: secRef.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    },
    { scope: secRef },
  );

  return (
    <section ref={secRef} className="overflow-hidden bg-page">
      <div className="mx-auto grid max-w-shop items-center gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="relative overflow-hidden rounded-xl shadow-paper-deep md:col-span-5">
          <div ref={imgRef} className="will-change-transform">
            <img src="/mail-slot.png" alt="卷帘门上的信件投递口" className="aspect-[10/7] w-full scale-110 object-cover" />
          </div>
          <LampGlow className="absolute -bottom-8 -left-8" size={180} />
        </div>
        <Reveal className="md:col-span-7" x={60} y={0} duration={0.9} stagger={0.08}>
          <div className="card-postcard p-8 md:p-10">
            <h2 className="font-hand text-3xl text-wood md:text-4xl">卷帘门上有一个投递口</h2>
            <p className="mt-5 leading-8 text-ink/90">
              把烦恼写在信里，投进来。不必署名——给自己取个笔名就好。店主会在明早
              8:30 前，把回信放进店后的牛奶箱。你的信，只有店主会读。
            </p>
            <div className="mt-6 flex items-center gap-5">
              <CategorySeal category="love" size={52} />
              <CategorySeal category="dream" size={52} />
              <CategorySeal category="life" size={52} />
              <span className="text-sm text-slate">五类烦恼，都可以</span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              {/* AUTH-SLOT: 未登录时 Phase 5 改为 /login?from=/letters/new */}
              <Link
                to="/letters/new"
                className="rounded-lg bg-stamp px-7 py-3 text-cream shadow-paper-deep transition-transform duration-500 ease-shop hover:translate-y-[1px]"
                style={{ animation: 'cta-breathe 3.2s ease-in-out infinite' }}
              >
                现在写一封
              </Link>
              <Link to="/stories" className="link-underline-hand text-[15px] text-wood">
                先看看别人怎么写 →
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Section 6 · 示例信件摘要 ---------------- */
function StoryStrip() {
  return (
    <section className="overflow-hidden bg-page pb-20">
      <div className="mx-auto max-w-shop px-6">
        <Reveal y={24}>
          <h2 className="font-hand text-3xl text-page-fg md:text-4xl">他们曾这样写信</h2>
        </Reveal>
        <Reveal
          className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible"
          x={60}
          y={0}
          stagger={0.12}
          duration={0.8}
        >
          {FEATURED_STORIES.map((s) => (
            <PostcardCard key={s.id} story={s} to="/stories" className="w-72 shrink-0 snap-start md:w-auto" />
          ))}
          <Link
            to="/stories"
            className="card-postcard flex w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 p-5 text-wood transition-all duration-500 ease-shop hover:-translate-y-1 hover:shadow-paper-deep md:w-auto"
          >
            <span className="font-hand text-2xl">更多</span>
            <span className="text-sm text-slate">五封信都在 →</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Section 7 · 收尾带 ---------------- */
const CLOSING = '无论现在多么不开心，你要相信，明天会比今天更好。';

function ClosingBand() {
  return (
    <section className="bg-night">
      <div className="mx-auto flex max-w-shop flex-col items-center gap-6 px-6 py-14 md:flex-row md:justify-center md:gap-12">
        <img src="/anpan-milk.svg" alt="红豆面包与牛奶" className="w-36 shrink-0" loading="lazy" />
        <Reveal stagger={0.06} y={12} duration={0.6}>
          {CLOSING.split('').map((ch, i) => (
            <span key={i} className="inline-block font-hand text-2xl text-cream md:text-3xl">
              {ch}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- 首页 ---------------- */
export default function Home() {
  return (
    <>
      <Hero />
      <MechanismBand />
      <QuoteCarousel />
      <FeaturedShelf />
      <LetterEntry />
      <StoryStrip />
      <ClosingBand />
    </>
  );
}
