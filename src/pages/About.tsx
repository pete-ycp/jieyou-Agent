import { useMemo } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Clock3, Mail, PenLine, ShoppingBasket } from 'lucide-react';
import LampGlow from '@/components/shop/LampGlow';
import MilkBox from '@/components/shop/MilkBox';
import Reveal from '@/components/shop/Reveal';
import { useDayNight } from '@/hooks/useDayNight';
import { trpc } from '@/providers/trpc';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** 静态兜底正文（接口加载中/失败时展示，不白屏）。按空行分段。 */
const FALLBACK_BODY = `在一条上坡小街的尽头，有一家老旧的杂货店。招牌上的字已经黯淡发黑，店里卖些文具、厨房用品和日杂，生意清淡，却一直开着。

很多年前，因为店名「浪矢」与「烦恼」读音相近，附近的孩子们开始把烦恼写在纸上，半开玩笑地投进店里。店主是一位认真的老人，他决定：每一封信都要认真回答。

后来，规矩慢慢定了下来——晚上把信投进卷帘门的投递口，第二天早上，回信就会放在店后的牛奶箱里。为了这个约定，老人每天五点半就起床。

有人问老人，你的回答真的有用吗？老人说：「来咨询的人，心里其实已经有了答案。我的回答之所以发挥作用，是因为他们自己很努力。」

如今这家店开到了网上。货架上依然是寥寥的商品，但每一件都用纸包好了；信箱也依然开着——无论你挣扎犹豫，还是绝望痛苦，都欢迎来信。

人的心声，是绝对不能无视的。`;

const RULES = [
  '营业时间 08:30–20:00，货架开放，欢迎咨询',
  '烦恼通信 20:00–次日 08:30，投信口整夜开放',
  '每一封信，店主都在 24 小时内认真回信',
  '写信只需一个笔名，不必留下真名',
  '来信若要公开展示，必先脱敏并征得同意',
];

/** 投信三步（简化版） */
const STEPS = [
  { icon: 'slot', text: '晚上，把信投进卷帘门的投递口' },
  { icon: 'clock', text: '店主清晨五点半起身写回信' },
  { icon: 'box', text: '次日早上 8:30 前，回信放进牛奶箱' },
] as const;

function StepIcon({ kind }: { kind: (typeof STEPS)[number]['icon'] }) {
  if (kind === 'clock') return <Clock3 size={26} strokeWidth={1.6} />;
  if (kind === 'box') return <MilkBox size={30} hasLetter />;
  return (
    <svg viewBox="0 0 48 24" width="34" height="18" aria-hidden>
      <rect x="2" y="3" width="44" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="9" width="28" height="6" rx="2" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function WaveDivider() {
  return <img src="/divider-wave.svg" alt="" aria-hidden className="h-10 w-full object-cover" />;
}

/* ---------------- Section 1 · 页头 ---------------- */
function Hero() {
  const { isNight } = useDayNight();
  const title = '浪矢杂货店的故事';

  return (
    <section className="relative flex min-h-[70dvh] items-center justify-center overflow-hidden bg-night">
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
        className="absolute inset-0 will-change-transform"
      >
        <img
          src="/about-shop.png"
          alt="店内矮桌上摊着信纸与台灯"
          className="h-full w-full object-cover"
        />
      </motion.div>
      {/* 60% 深夜蓝蒙版 */}
      <div aria-hidden className="absolute inset-0 bg-night/60" />
      <LampGlow className="absolute bottom-[12%] right-[16%]" size={200} bright={isNight} />

      <div className="relative z-10 flex items-start gap-6 px-6 py-20">
        <h1
          className="vertical-rl font-hand text-4xl leading-[1.3] text-cream text-glow-lamp md:text-5xl"
          style={{ maxHeight: '56vh' }}
        >
          {title.split('').map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: EASE }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8, ease: EASE }}
          className="vertical-rl pt-2 font-mincho text-base text-cream/80"
        >
          ナミヤ雑貨店
        </motion.p>
      </div>
    </section>
  );
}

/* ---------------- Section 2 · 幕标题（竖排，自右滑入由 Reveal 承担） ---------------- */
function ActTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-5">
      <span className="vertical-rl font-hand text-3xl text-wood">{children}</span>
      <span aria-hidden className="h-24 w-px bg-vermilion/60" />
    </div>
  );
}

/* ---------------- Section 2 · 四幕滚动叙事 ---------------- */
function Acts({ paragraphs }: { paragraphs: string[] }) {
  const [p1, p2, p3, ...rest] = paragraphs;
  const p4 = rest.join('\n\n');

  return (
    <section className="overflow-hidden bg-page">
      {/* 第一幕 · 上坡小街的尽头 */}
      <div className="mx-auto grid max-w-shop items-center gap-10 px-6 py-16 md:grid-cols-12 md:py-20">
        <Reveal className="md:col-span-6" x={40} y={0} stagger={0.15}>
          <ActTitle>上坡小街的尽头</ActTitle>
          <p className="mt-6 max-w-md leading-8 text-ink/90">{p1}</p>
        </Reveal>
        <Reveal className="md:col-span-6" y={24}>
          <div className="card-postcard overflow-hidden p-3">
            <img
              src="/hero-storefront.png"
              alt="上坡小街尽头的老杂货店"
              loading="lazy"
              className="aspect-[16/10] w-full rounded-lg object-cover object-[center_30%] sepia-[0.15]"
            />
          </div>
        </Reveal>
      </div>

      <WaveDivider />

      {/* 第二幕 · 浪矢与烦恼 */}
      <div className="mx-auto grid max-w-shop items-center gap-10 px-6 py-16 md:grid-cols-12 md:py-20">
        <Reveal className="md:col-span-5" y={24}>
          <div className="card-postcard flex flex-col items-center gap-4 p-10 text-center">
            <p className="font-mincho text-5xl text-wood">ナミヤ</p>
            <p className="text-sm tracking-[0.3em] text-slate">浪 矢</p>
            <span aria-hidden className="h-px w-16 bg-vermilion/60" />
            <p className="font-mincho text-5xl text-stamp">ナヤミ</p>
            <p className="text-sm tracking-[0.3em] text-slate">烦 恼</p>
          </div>
        </Reveal>
        <Reveal className="md:col-span-7" x={40} y={0} stagger={0.15}>
          <ActTitle>浪矢与烦恼</ActTitle>
          <p className="mt-6 max-w-md leading-8 text-ink/90">{p2}</p>
        </Reveal>
      </div>

      <WaveDivider />

      {/* 第三幕 · 投信口与牛奶箱 */}
      <div className="mx-auto max-w-shop px-6 py-16 md:py-20">
        <Reveal x={40} y={0} stagger={0.15} className="flex flex-col items-start gap-6">
          <ActTitle>投信口与牛奶箱</ActTitle>
          <p className="max-w-2xl leading-8 text-ink/90">{p3}</p>
        </Reveal>
        <Reveal className="mt-10 grid gap-6 md:grid-cols-2" y={24} stagger={0.12}>
          <div className="card-postcard overflow-hidden p-3">
            <img
              src="/mail-slot.png"
              alt="卷帘门上的信件投递口"
              loading="lazy"
              className="aspect-[10/6] w-full rounded-lg object-cover sepia-[0.15]"
            />
          </div>
          <div className="card-postcard overflow-hidden p-3">
            <img
              src="/milkbox-letter.png"
              alt="牛奶箱里露出一封回信"
              loading="lazy"
              className="aspect-[10/6] w-full rounded-lg object-cover sepia-[0.15]"
            />
          </div>
        </Reveal>
        <Reveal className="mt-8 grid gap-6 text-wood md:grid-cols-3" stagger={0.12} y={24}>
          {STEPS.map((s) => (
            <div key={s.icon} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kraft">
                <StepIcon kind={s.icon} />
              </span>
              <p className="text-[15px] leading-7">{s.text}</p>
            </div>
          ))}
        </Reveal>
        <Reveal y={16} className="mt-8">
          <p className="border-l-2 border-stamp pl-4 font-hand text-xl leading-8 text-stamp">
            本店规矩：晚上投信，清晨回信进牛奶箱；店主绝不窥视写信人的脸。
          </p>
        </Reveal>
      </div>

      <WaveDivider />

      {/* 第四幕 · 五点半的店主 */}
      <div className="mx-auto grid max-w-shop items-center gap-10 px-6 py-16 md:grid-cols-12 md:py-20">
        <Reveal className="relative md:col-span-5" y={24}>
          <div className="card-postcard relative overflow-hidden p-3">
            <img
              src="/admin-lamp.png"
              alt="清晨五点半亮着的台灯与信纸"
              loading="lazy"
              className="aspect-square w-full rounded-lg object-cover sepia-[0.12]"
            />
            <LampGlow className="absolute -right-6 -top-6" size={160} bright />
          </div>
        </Reveal>
        <Reveal className="md:col-span-7" x={40} y={0} stagger={0.15}>
          <ActTitle>五点半的店主</ActTitle>
          {p4.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className="mt-6 max-w-md leading-8 text-ink/90">
              {para}
            </p>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Section 3 · 本店规矩 ---------------- */
function Rules() {
  return (
    <section className="overflow-hidden bg-page pb-16 md:pb-20">
      <div className="mx-auto max-w-letter px-6">
        <Reveal y={24}>
          <div className="card-postcard p-8 md:p-12">
            <h2 className="text-center font-hand text-3xl text-wood">本店规矩</h2>
            <Reveal as="div" className="mt-8 flex flex-col gap-5" stagger={0.1} y={24}>
              {RULES.map((rule, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-stamp/80 font-garamond text-sm text-stamp">
                    {i + 1}
                  </span>
                  <p className="leading-7 text-ink/90">{rule}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Section 4 · 收尾：招牌致敬 ---------------- */
function Finale() {
  return (
    <section className="bg-night">
      <div className="mx-auto flex max-w-shop flex-col items-center gap-8 px-6 py-16 text-center md:py-20">
        {/* 大招牌：入场轻微摆动一次，像被晚风吹过 */}
        <motion.img
          src="/logo-sign.svg"
          alt="解忧杂货店招牌"
          className="w-72 max-w-full md:w-96"
          initial={{ rotate: -1, opacity: 0 }}
          whileInView={{ rotate: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            opacity: { duration: 0.6, ease: EASE },
            rotate: { duration: 1.2, ease: EASE },
          }}
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
          className="font-hand text-2xl text-cream md:text-3xl"
        >
          提供商品订购服务，欢迎咨询
        </motion.p>
        <motion.img
          src="/anpan-milk.svg"
          alt="红豆面包与牛奶"
          className="w-36"
          loading="lazy"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.7, ease: EASE }}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-lg bg-stamp px-7 py-3 text-cream shadow-paper-deep transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
          >
            <ShoppingBasket size={17} />
            去货架看看
          </Link>
          <Link
            to="/letters/new"
            className="inline-flex items-center gap-2 rounded-lg border border-cream/70 px-7 py-3 text-cream transition-colors duration-500 ease-shop hover:bg-cream/10"
          >
            <PenLine size={17} />
            写一封信
          </Link>
        </motion.div>
        <p className="flex items-center gap-2 text-xs tracking-[0.12em] text-cream/60">
          <Mail size={13} />
          本店信件绝不窥视 · 浪矢杂货店
        </p>
      </div>
    </section>
  );
}

/* ---------------- 关于浪矢杂货店 ---------------- */
export default function About() {
  const { data } = trpc.content.about.useQuery(undefined, { retry: false });

  const paragraphs = useMemo(() => {
    const body = data && data.length > 0 ? data[0].body : FALLBACK_BODY;
    const paras = (body || FALLBACK_BODY).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return paras.length >= 4 ? paras : FALLBACK_BODY.split(/\n\s*\n/);
  }, [data]);

  return (
    <>
      <Hero />
      <Acts paragraphs={paragraphs} />
      <Rules />
      <Finale />
    </>
  );
}
