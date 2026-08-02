import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import PageLoading from '@/components/shop/PageLoading';
import LampGlow from '@/components/shop/LampGlow';
import EnvelopeDrop from '@/components/shop/EnvelopeDrop';
import DropText from '@/components/shop/DropText';
import { fmtPostmarkDate } from '@/components/shop/letter-utils';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const MAX_LEN = 2000;

type Phase = 'writing' | 'dropping' | 'sent';

export default function LetterThanks() {
  const { isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { id } = useParams();
  const letterId = Number(id);
  const utils = trpc.useUtils();

  const { data: letter, isLoading: loading } = trpc.letter.detail.useQuery(
    { id: letterId },
    { enabled: isAuthenticated && Number.isFinite(letterId), retry: false },
  );

  const [content, setContent] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [notice, setNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const submitPromise = useRef<Promise<{ ok: boolean }> | null>(null);

  const thanks = trpc.letter.thanks.useMutation();

  const len = content.length;
  const overLimit = len > MAX_LEN;
  const canSubmit = content.trim().length > 0 && !overLimit && phase === 'writing';

  const handleSubmit = () => {
    if (!canSubmit) return;
    setNotice(null);
    setPhase('dropping');
    submitPromise.current = thanks.mutateAsync({ id: letterId, content: content.trim() });
  };

  const handleDropDone = () => {
    const p = submitPromise.current;
    if (!p) {
      setPhase('writing');
      return;
    }
    p.then(async () => {
      await utils.letter.invalidate();
      setPhase('sent');
    }).catch((err: unknown) => {
      setPhase('writing');
      setNotice(err instanceof Error ? err.message : '投信失败，请稍后再试。');
    });
  };

  if (isLoading || !isAuthenticated) return <PageLoading note="正在铺一张小信纸……" />;
  if (loading) return <PageLoading note="正在铺一张小信纸……" />;
  if (!letter) {
    return (
      <div className="mx-auto max-w-letter px-4 py-24 text-center">
        <p className="font-hand text-3xl text-wood">这封信不在你的牛奶箱里。</p>
        <Link to="/letters/mine" className="link-underline-hand mt-6 inline-block text-sm text-slate hover:text-stamp">
          回到我的牛奶箱 →
        </Link>
      </div>
    );
  }

  /* ---------- 成功态 ---------- */
  if (phase === 'sent') {
    return (
      <div className="relative overflow-hidden bg-night py-24">
        <LampGlow size={320} bright className="absolute left-1/2 top-24 -translate-x-1/2" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative mx-auto flex max-w-letter flex-col items-center px-4 text-center"
        >
          <h1 className="font-hand text-4xl text-cream">感谢信已送到店主桌上。</h1>
          <p className="mt-4 max-w-md text-sm leading-8 text-night-text/80">
            店主会在明早五点半，就着台灯读完它。谢谢你回来报一声平安。
          </p>
          <Link
            to="/letters/mine"
            className="mt-10 rounded-lg bg-stamp px-8 py-3 text-sm text-cream shadow-paper-deep transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-110"
          >
            回到我的牛奶箱
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ---------- 已写过 ---------- */
  if (letter.thanksContent) {
    return (
      <div className="mx-auto max-w-letter px-4 py-24 text-center">
        <p className="font-hand text-3xl text-wood">这封感谢信，你已经写过了。</p>
        <p className="mt-3 text-sm text-slate">{fmtPostmarkDate(letter.thanksAt)} 投进投递口，店主已读。</p>
        <Link
          to={`/letters/${letter.id}`}
          className="link-underline-hand mt-6 inline-block text-sm text-slate hover:text-stamp"
        >
          回去看看这封信 →
        </Link>
      </div>
    );
  }

  /* ---------- 撰写 ---------- */
  return (
    <div className="relative overflow-hidden py-14">
      <LampGlow
        size={340}
        bright={focused}
        className="absolute -top-10 right-[6%] transition-opacity duration-600"
      />

      {phase === 'dropping' && <EnvelopeDrop compact onDone={handleDropDone} />}

      <div className="relative mx-auto max-w-letter px-4">
        <header className="mb-10">
          <h1 className="font-hand text-4xl text-wood">
            <DropText text="给店主写封感谢信" stagger={0.06} />
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="mt-3 text-sm text-slate"
          >
            笔名沿用原信「{letter.penName}」。不必长，报一声后来的事就好。
          </motion.p>
        </header>

        {/* 窄信纸编辑器 */}
        <motion.section
          initial={{ scaleY: 0.85, opacity: 0, transformOrigin: 'center top' }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
        >
          <div
            className="kraft-lines relative rounded-md bg-cream p-8 shadow-paper md:px-10"
            style={{ border: '1px solid #D9C9A8' }}
          >
            <p className="font-hand text-xl leading-8 text-wood">致浪矢杂货店的店主：</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="告诉店主，后来怎么样了……"
              rows={8}
              className="w-full resize-none bg-transparent text-[17px] leading-8 text-ink outline-none placeholder:text-slate/45"
            />
            <p
              className={cn(
                'text-right font-garamond text-sm leading-8 tabular-nums',
                overLimit ? 'text-vermilion' : 'text-slate',
              )}
            >
              {len} / {MAX_LEN}
            </p>
            <p className="mt-8 text-right font-hand text-xl leading-8 text-wood">——{letter.penName}</p>
          </div>
        </motion.section>

        {/* 提示条 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
          className="mt-4 rounded-lg bg-milk px-4 py-3 text-xs leading-6 text-slate"
        >
          感谢信若被店主精选，会先脱敏、经你允许后才可能出现在示例信件墙。
        </motion.p>

        {/* 提交 */}
        <motion.section
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
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
          <p className="mt-4 text-center">
            <Link to={`/letters/${letter.id}`} className="link-underline-hand text-xs text-slate hover:text-stamp">
              ← 先回去再读一遍回信
            </Link>
          </p>
        </motion.section>
      </div>
    </div>
  );
}
