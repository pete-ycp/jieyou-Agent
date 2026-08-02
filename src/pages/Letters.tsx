import { useRef } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { motion } from 'framer-motion';
import { Eye, HeartHandshake, KeyRound, PenLine, ShieldCheck } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/const';
import LampGlow from '@/components/shop/LampGlow';
import Reveal from '@/components/shop/Reveal';
import CategorySeal from '@/components/shop/CategorySeal';
import Postmark from '@/components/shop/Postmark';
import DropText from '@/components/shop/DropText';
import { LETTER_CATEGORIES } from '@contracts/labels';
import { CATEGORY_GUIDES, excerpt, fmtPostmarkDate } from '@/components/shop/letter-utils';

gsap.registerPlugin(ScrollTrigger);

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ---------------- Section 1 · 页头（竖排引言） ---------------- */
function Hero() {
  const root = useRef<HTMLElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 提灯先亮（光晕 0→0.8, 1000ms）
      gsap.fromTo(glowRef.current, { opacity: 0 }, { opacity: 0.8, duration: 1, ease: 'power2.out' });
      // 滚动视差 0.3 倍速淡出
      gsap.to(quoteRef.current, {
        opacity: 0,
        yPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: '70% top', scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden bg-night py-24 md:py-32">
      {/* 左侧提灯 */}
      <div ref={glowRef} className="absolute left-[8%] top-1/2 -translate-y-1/2 opacity-0 md:left-[16%]">
        <LampGlow size={260} bright />
        <img src="/night-lamp.svg" alt="提灯" className="absolute left-1/2 top-1/2 w-20 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* 中央竖排引言 */}
      <div ref={quoteRef} className="relative mx-auto flex max-w-letter flex-col items-center px-4">
        <div className="flex items-start gap-6">
          <div className="vertical-rl border-r border-vermilion/60 pr-5">
            <h1 className="font-hand text-4xl leading-[1.4] tracking-[0.35em] text-cream md:text-5xl">
              <DropText text="人的心声，是绝对不能无视的。" stagger={0.08} delay={0.6} />
            </h1>
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.2, ease: EASE }}
          className="mt-10 self-end font-garamond text-xs tracking-[0.12em] text-night-text/60"
        >
          ——浪矢杂货店的规矩
        </motion.p>
      </div>
    </section>
  );
}

/* ---------------- Section 2 · 机制三步 + 承诺条 ---------------- */
const STEPS = [
  {
    img: '/mail-slot.png',
    title: '晚上 · 投进投递口',
    desc: '写在信里，投进来。只需一个笔名，本店绝不打听你是谁。',
    round: false,
  },
  {
    img: '/admin-lamp.png',
    title: '清晨五点半 · 店主写回信',
    desc: '店主每天五点半起床，戴起老花镜，一封一封认真回。',
    round: true,
  },
  {
    img: '/milkbox-letter.png',
    title: '次日 8:30 前 · 牛奶箱取信',
    desc: '回信放进店后的牛奶箱，只有你的钥匙（账号）能打开。',
    round: false,
  },
];

function Mechanism() {
  const stampRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // 承诺条触发时朱红章盖下（scale 1.5→1, 400ms）
    gsap.fromTo(
      stampRef.current,
      { scale: 1.5, opacity: 0, rotate: -14 },
      {
        scale: 1,
        opacity: 1,
        rotate: -8,
        duration: 0.4,
        ease: 'power2.in',
        scrollTrigger: { trigger: stampRef.current, start: 'top 85%', once: true },
      },
    );
  });

  return (
    <section className="mx-auto max-w-shop px-4 py-20 md:px-6">
      <Reveal className="grid gap-10 md:grid-cols-3 md:gap-6" stagger={0.15}>
        {STEPS.map((s, i) => (
          <div key={s.title} className="relative">
            <div className="card-postcard p-5">
              <img
                src={s.img}
                alt={s.title}
                loading="lazy"
                className={
                  s.round
                    ? 'mx-auto h-36 w-36 rounded-full object-cover shadow-paper'
                    : 'h-36 w-full rounded-lg object-cover shadow-paper'
                }
              />
              <h3 className="mt-5 text-lg font-semibold text-wood">{s.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate">{s.desc}</p>
            </div>
            {/* 手绘虚线箭头（桌面端，卡间） */}
            {i < 2 && (
              <svg
                aria-hidden
                viewBox="0 0 60 20"
                className="absolute -right-8 top-1/2 hidden w-8 -translate-y-1/2 text-vermilion/70 md:block"
              >
                <path d="M2 10 H48 M42 4 L52 10 L42 16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
              </svg>
            )}
          </div>
        ))}
      </Reveal>

      {/* 承诺条 */}
      <PromiseBar stampRef={stampRef} />
    </section>
  );
}

function PromiseBar({ stampRef }: { stampRef: React.RefObject<HTMLDivElement | null> }) {
  const { data: promise } = trpc.letter.promise.useQuery();
  return (
    <div className="mt-14 flex flex-col items-center gap-4 rounded-xl bg-milk px-6 py-8 text-center md:flex-row md:justify-center md:gap-8">
      <div ref={stampRef} className="shrink-0 opacity-0">
        <Postmark date={`${promise?.slaHours ?? 24}H`} text="回信承诺" size={92} />
      </div>
      <div>
        <p className="font-hand text-2xl text-stamp">{promise?.slaHours ?? 24} 小时回信承诺</p>
        <p className="mt-1 text-sm leading-7 text-slate">
          {promise?.text ?? '每一封信都会被认真回复'}——包括玩笑信，甚至一张白纸。
        </p>
      </div>
    </div>
  );
}

/* ---------------- Section 3 · 五类烦恼（分类印章墙） ---------------- */
function CategoryWall() {
  const wallRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 印章入场逐个盖下（stagger 0.12s, scale 1.4→1）
      gsap.fromTo(
        '.cat-seal-item',
        { scale: 1.4, opacity: 0, rotate: -6 },
        {
          scale: 1,
          opacity: 1,
          rotate: 0,
          duration: 0.5,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: { trigger: wallRef.current, start: 'top 85%', once: true },
        },
      );
    },
    { scope: wallRef },
  );

  return (
    <section className="overflow-hidden bg-kraft/50 py-20">
      <div ref={wallRef} className="mx-auto max-w-shop px-4 md:px-6">
        <h2 className="text-center font-hand text-3xl text-wood">什么样的事，都可以写</h2>
        <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {LETTER_CATEGORIES.map((c) => (
            <Link key={c.value} to="/stories" className="cat-seal-item group relative flex flex-col items-center opacity-0">
              <span className="transition-transform duration-500 ease-shop group-hover:-translate-y-1">
                <CategorySeal category={c.value} size={88} withLabel />
              </span>
              {/* hover 浮现引导卡（→ 示例信件）；移动端无 hover 且会撑破视口，小屏隐藏 */}
              <span className="pointer-events-none mt-3 hidden translate-y-4 rounded-lg bg-cream px-4 py-2 text-center text-xs leading-6 text-slate opacity-0 shadow-paper transition-all duration-300 ease-shop group-hover:translate-y-0 group-hover:opacity-100 sm:block sm:max-w-[180px]">
                {CATEGORY_GUIDES[c.value]}
                <span className="block text-[10px] tracking-[0.12em] text-stamp">看看示例信件 →</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 4 · 隐私承诺 ---------------- */
const RULES = [
  { icon: PenLine, text: '只需笔名，不采集真实身份' },
  { icon: Eye, text: '你的信只有店主会读' },
  { icon: HeartHandshake, text: '不替你做的决定，答案在你心里' },
  { icon: ShieldCheck, text: '公开展示必须脱敏并经你允许（示例信件均为化名故事）' },
];

function Privacy() {
  return (
    <section className="mx-auto max-w-letter px-4 py-20">
      <div className="card-postcard px-8 py-10 md:px-12">
        <div className="flex items-start gap-6">
          <h2 className="vertical-rl shrink-0 border-r border-vermilion/60 pr-4 font-hand text-2xl text-wood">
            本店的规矩
          </h2>
          <Reveal className="flex flex-1 flex-col gap-5" stagger={0.1} y={20} start="top 80%">
            {RULES.map((r) => (
              <div key={r.text} className="flex items-start gap-3">
                <r.icon size={18} className="mt-1 shrink-0 text-moss" />
                <p className="text-sm leading-7 text-ink">{r.text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 4.5 · 精选回音墙（如有） ---------------- */
function FeaturedWall() {
  const { data: featured } = trpc.letter.featured.useQuery();
  if (!featured || featured.length === 0) return null;

  return (
    <section className="mx-auto max-w-shop px-4 pb-20 md:px-6">
      <h2 className="text-center font-hand text-3xl text-wood">从牛奶箱寄出的回音</h2>
      <p className="mt-2 text-center text-xs tracking-[0.12em] text-slate">
        经本人允许、脱敏后公开的感谢与回信
      </p>
      <Reveal className="mt-10 grid gap-6 md:grid-cols-2" stagger={0.12}>
        {featured.slice(0, 6).map((l) => (
          <div key={l.id} className="card-postcard p-6">
            <div className="flex items-center gap-3">
              <CategorySeal category={l.category} size={36} />
              <p className="font-hand text-lg text-wood">{l.penName}</p>
              <span className="ml-auto font-garamond text-[11px] tracking-[0.12em] text-slate">
                {fmtPostmarkDate(l.repliedAt ?? l.createdAt)}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink">
              {excerpt(l.thanksContent || l.replyContent || l.content, 90)}
            </p>
            {l.thanksContent && (
              <p className="mt-3 border-l-2 border-moss pl-3 text-xs leading-6 text-slate">
                来信人后来写道：{excerpt(l.thanksContent, 46)}
              </p>
            )}
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/* ---------------- Section 5 · 写信 CTA ---------------- */
function WriteCta() {
  const { isAuthenticated } = useAuth();
  const writeTo = isAuthenticated ? '/letters/new' : `${LOGIN_PATH}?from=/letters/new`;

  return (
    <section className="relative overflow-hidden bg-night py-24">
      <LampGlow size={360} bright className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="relative mx-auto flex max-w-letter flex-col items-center px-4 text-center">
        {/* 信封 hover：信纸探出 8px */}
        <Link to={writeTo} className="group relative block" aria-label="现在写一封">
          <span className="absolute left-1/2 top-3 h-24 w-36 -translate-x-1/2 rounded-sm bg-cream shadow-paper transition-transform duration-400 ease-shop group-hover:-translate-y-2" />
          <img src="/envelope.svg" alt="信封" className="relative w-56 transition-transform duration-400 ease-shop group-hover:translate-y-1" />
        </Link>
        <h2 className="mt-8 font-hand text-3xl text-cream">今晚，就把心事放下来。</h2>
        <p className="mt-3 text-sm leading-7 text-night-text/75">
          写在信里，投进投递口。明早 8:30 前，回信会在牛奶箱里等你。
        </p>
        <Link
          to={writeTo}
          className="mt-8 inline-flex animate-[cta-breathe_3.2s_ease-in-out_infinite] items-center rounded-lg bg-stamp px-10 py-3.5 text-base text-cream shadow-paper-deep transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-110"
        >
          现在写一封
        </Link>
        <Link to="/stories" className="link-underline-hand mt-5 text-sm text-night-text/70 hover:text-lamp-glow">
          看看示例信件 →
        </Link>
      </div>
    </section>
  );
}

export default function Letters() {
  return (
    <div>
      <Hero />
      <Mechanism />
      <CategoryWall />
      <Privacy />
      <FeaturedWall />
      <WriteCta />
    </div>
  );
}
