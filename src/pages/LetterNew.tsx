import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import PageLoading from '@/components/shop/PageLoading';
import LampGlow from '@/components/shop/LampGlow';
import CategorySeal from '@/components/shop/CategorySeal';
import DropText from '@/components/shop/DropText';
import EnvelopeDrop from '@/components/shop/EnvelopeDrop';
import CountdownTag from '@/components/shop/CountdownTag';
import Postmark from '@/components/shop/Postmark';
import { LETTER_CATEGORIES, REPLY_PROMISE } from '@contracts/labels';
import type { LetterCategory } from '@contracts/labels';
import { CATEGORY_GUIDES, fmtPostmarkDate, randomPenName } from '@/components/shop/letter-utils';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const MAX_LEN = 2000;
const DRAFT_KEY = 'namiya-letter-draft';

type Draft = { penName: string; category: LetterCategory | null; content: string };
type Phase = 'writing' | 'dropping' | 'sent';

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d && (d.content || d.penName) ? d : null;
  } catch {
    return null;
  }
}

export default function LetterNew() {
  const { isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const restored = useMemo(loadDraft, []);
  const [penName, setPenName] = useState(restored?.penName ?? '');
  const [category, setCategory] = useState<LetterCategory | null>(restored?.category ?? null);
  const [content, setContent] = useState(restored?.content ?? '');
  const [restoredNote, setRestoredNote] = useState(!!restored?.content);
  const [phase, setPhase] = useState<Phase>('writing');
  const [notice, setNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [penStampKey, setPenStampKey] = useState(0);

  const submitPromise = useRef<Promise<{ id: number; egg: boolean }> | null>(null);

  // 预填用户历史最近笔名（草稿优先）
  const { data: mine } = trpc.letter.mine.useQuery(undefined, { enabled: isAuthenticated });
  useEffect(() => {
    if (!restored?.penName && !penName && mine && mine.length > 0) {
      setPenName(mine[0].penName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine]);

  // 草稿：每 2s 自动存 localStorage
  useEffect(() => {
    const t = setInterval(() => {
      if (content || penName) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ penName, category, content }));
      }
    }, 2000);
    return () => clearInterval(t);
  }, [penName, category, content]);

  const createLetter = trpc.letter.create.useMutation();

  const len = content.length;
  const overLimit = len > MAX_LEN;
  const canSubmit = penName.trim().length > 0 && category !== null && !overLimit && phase === 'writing';

  const rollPenName = () => {
    setPenName(randomPenName(penName));
    setPenStampKey((k) => k + 1); // 触发盖章落入动效
  };

  const handleSubmit = () => {
    if (!canSubmit || !category) return;
    setNotice(null);
    setPhase('dropping');
    submitPromise.current = createLetter.mutateAsync({
      penName: penName.trim(),
      category,
      content,
    });
  };

  // 投递动效播完 → 按后端结果分支
  const handleDropDone = () => {
    const p = submitPromise.current;
    if (!p) {
      setPhase('writing');
      return;
    }
    p.then(async (res) => {
      localStorage.removeItem(DRAFT_KEY);
      await utils.letter.invalidate();
      if (res.egg) {
        // 白纸彩蛋：直接跳到该信的阅读页，带惊喜提示
        navigate(`/letters/${res.id}?egg=1`);
      } else {
        setSentAt(new Date());
        setPhase('sent');
      }
    }).catch((err: unknown) => {
      setPhase('writing');
      setNotice(err instanceof Error ? err.message : '投信失败，请稍后再试。');
    });
  };

  if (isLoading || !isAuthenticated) return <PageLoading note="信纸已经铺好，钢笔正在灌墨。" />;

  /* ---------- 投递成功确认态（同页替换） ---------- */
  if (phase === 'sent') {
    const deadline = new Date((sentAt ?? new Date()).getTime() + 24 * 3600 * 1000);
    return (
      <div className="relative overflow-hidden bg-night py-24">
        <LampGlow size={340} bright className="absolute left-1/2 top-24 -translate-x-1/2" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative mx-auto flex max-w-letter flex-col items-center px-4 text-center"
        >
          <motion.div
            initial={{ scale: 1.5, opacity: 0, rotate: -14 }}
            animate={{ scale: 1, opacity: 1, rotate: -8 }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          >
            <Postmark date={fmtPostmarkDate(sentAt ?? new Date())} text="已投寄" size={110} />
          </motion.div>
          <h1 className="mt-8 font-hand text-4xl text-cream">信已投进投递口。</h1>
          <p className="mt-4 max-w-md text-sm leading-8 text-night-text/80">
            店主明早 8:30 前把回信放进牛奶箱。{REPLY_PROMISE}
          </p>
          <div className="mt-6 rounded-lg bg-night-2 px-5 py-3">
            <CountdownTag target={deadline} prefix="预计回信" className="text-night-text" />
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/letters/mine"
              className="rounded-lg bg-stamp px-8 py-3 text-sm text-cream shadow-paper-deep transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-110"
            >
              去牛奶箱看看
            </Link>
            <Link to="/" className="link-underline-hand text-sm text-night-text/70 hover:text-lamp-glow">
              回店里逛逛 →
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---------- 写信主界面 ---------- */
  return (
    <div className="relative overflow-hidden py-14">
      {/* 台灯氛围：聚焦信纸时亮度 +20% */}
      <LampGlow
        size={360}
        bright={focused}
        className="absolute -top-10 right-[6%] transition-opacity duration-600"
      />

      {phase === 'dropping' && <EnvelopeDrop onDone={handleDropDone} />}

      <div className="relative mx-auto max-w-letter px-4">
        {/* 页头 */}
        <header className="mb-12">
          <h1 className="font-hand text-4xl text-wood">
            <DropText text="写一封信" stagger={0.06} />
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="mt-3 text-sm text-slate"
          >
            投进卷帘门的投递口，明早 8:30 前去牛奶箱取回信。
          </motion.p>
          <AnimatePresence>
            {restoredNote && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="mt-3 inline-block rounded-md bg-milk px-3 py-1.5 text-xs text-slate"
              >
                上次的信还摊在桌上，替你留着呢。
                <button className="ml-2 underline" onClick={() => setRestoredNote(false)}>
                  知道了
                </button>
              </motion.p>
            )}
          </AnimatePresence>
        </header>

        {/* Step 1 · 笔名行 */}
        <motion.section
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="card-postcard p-6"
        >
          <label htmlFor="penName" className="text-sm font-semibold text-wood">
            落款的名字
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <motion.input
              key={penStampKey}
              id="penName"
              initial={penStampKey > 0 ? { scale: 1.4, opacity: 0, rotate: -6 } : false}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              value={penName}
              onChange={(e) => setPenName(e.target.value.slice(0, 64))}
              placeholder="月兔、迷途的小狗……"
              className="min-w-52 flex-1 rounded-md border border-[#C9B48C] bg-cream px-4 py-2.5 font-hand text-xl text-ink outline-none transition-shadow duration-400 placeholder:text-slate/50 focus:shadow-glow"
            />
            <button
              type="button"
              onClick={rollPenName}
              className="wood-grain inline-flex items-center gap-1.5 rounded-md bg-wood px-4 py-2.5 text-sm text-cream shadow-paper transition-all duration-400 ease-shop hover:translate-y-[1px] hover:brightness-110"
            >
              <Sparkles size={15} />
              让店主替你取个名字
            </button>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate">
            不必是真名。月兔、迷途的小狗……来本店咨询的人，都有个笔名。
          </p>
        </motion.section>

        {/* Step 2 · 烦恼分类 */}
        <motion.section
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28, ease: EASE }}
          className="mt-8"
        >
          <p className="text-sm font-semibold text-wood">这件事，关乎——</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {LETTER_CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <motion.button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border px-3 py-4 transition-all duration-400 ease-shop',
                    active
                      ? 'border-stamp bg-stamp/10 shadow-paper'
                      : 'border-[#C9B48C]/60 bg-kraft/40 grayscale hover:grayscale-0',
                  )}
                >
                  <motion.span
                    animate={active ? { scale: [1.5, 1], rotate: [-6, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="inline-block"
                  >
                    <CategorySeal category={c.value} size={56} />
                  </motion.span>
                  <span className={cn('text-xs tracking-[0.12em]', active ? 'text-stamp' : 'text-slate')}>
                    {c.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            {category && (
              <motion.p
                key={category}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-4 border-l-2 border-vermilion pl-3 font-hand text-lg text-wood"
              >
                {CATEGORY_GUIDES[category]}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Step 3 · 信纸编辑器 */}
        <motion.section
          initial={{ scaleY: 0.85, opacity: 0, transformOrigin: 'center top' }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          className="relative mt-8"
        >
          <div
            className="kraft-lines relative rounded-md bg-cream p-8 shadow-paper md:px-10"
            style={{ border: '1px solid #D9C9A8' }}
          >
            <p className="font-hand text-xl leading-8 text-wood">致浪矢杂货店：</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="慢慢写，店主不着急。写不出来的时候，先写一句『我最近……』"
              rows={11}
              className="w-full resize-none bg-transparent text-[17px] leading-8 text-ink outline-none placeholder:text-slate/45"
            />
            <p
              className={cn(
                'text-right font-garamond text-sm tabular-nums',
                overLimit ? 'text-vermilion' : 'text-slate',
              )}
            >
              {len} / {MAX_LEN}
            </p>
          </div>
          <p className="mt-3 text-xs text-moss">听说，投进一张白纸，也会收到回信。</p>
        </motion.section>

        {/* 提交 */}
        <motion.section
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
          className="mt-8 pb-10"
        >
          <AnimatePresence>
            {notice && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="mb-4 rounded-lg bg-moss/15 px-4 py-3 text-center text-sm text-moss"
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full rounded-lg py-4 text-base text-cream shadow-paper-deep transition-all duration-500 ease-shop',
              canSubmit
                ? 'animate-[cta-breathe_3.2s_ease-in-out_infinite] bg-stamp hover:translate-y-[1px] hover:brightness-110'
                : 'cursor-not-allowed bg-slate/50',
            )}
          >
            封好，投进投递口
          </button>
          {!penName.trim() && (
            <p className="mt-2 text-center text-xs text-slate">先落个笔名，就能投信了。</p>
          )}
          {penName.trim() && !category && (
            <p className="mt-2 text-center text-xs text-slate">再选一枚印章，告诉店主这件事关乎什么。</p>
          )}
        </motion.section>
      </div>
    </div>
  );
}
