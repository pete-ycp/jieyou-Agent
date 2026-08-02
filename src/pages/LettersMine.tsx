import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import PageLoading from '@/components/shop/PageLoading';
import MilkBoxOpen from '@/components/shop/MilkBoxOpen';
import LampGlow from '@/components/shop/LampGlow';
import CategorySeal from '@/components/shop/CategorySeal';
import CountdownTag from '@/components/shop/CountdownTag';
import EmptyState from '@/components/shop/EmptyState';
import Postmark from '@/components/shop/Postmark';
import DropText from '@/components/shop/DropText';
import { LETTER_STATUS_LABELS, THANKS_AFTER_DAYS } from '@contracts/labels';
import { excerpt, fmtPostmarkDate, replyDeadline } from '@/components/shop/letter-utils';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type MineLetter = {
  id: number;
  penName: string;
  category: 'love' | 'dream' | 'family' | 'career' | 'life';
  content: string;
  status: 'pending' | 'replied' | 'egg';
  replyContent: string | null;
  repliedAt: Date | null;
  readAt: Date | null;
  thanksContent: string | null;
  createdAt: Date;
};

function isUnread(l: MineLetter) {
  return (l.status === 'replied' || l.status === 'egg') && !!l.replyContent && !l.readAt;
}

function thanksOpen(l: MineLetter) {
  return (
    l.status === 'replied' &&
    !!l.repliedAt &&
    !l.thanksContent &&
    Date.now() >= new Date(l.repliedAt).getTime() + THANKS_AFTER_DAYS * 24 * 3600 * 1000
  );
}

/* ---------------- 状态区 ---------------- */
function StatusBlock({ letter }: { letter: MineLetter }) {
  if (letter.status === 'pending') {
    return (
      <div className="flex flex-col items-start gap-2 md:items-end">
        <span className="inline-flex items-center gap-2 text-xs text-lamp">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lamp opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lamp" />
          </span>
          店主在读 · 明早 8:30 前回信
        </span>
        <CountdownTag target={replyDeadline(letter.createdAt)} />
      </div>
    );
  }
  if (letter.status === 'egg') {
    return (
      <span className="inline-flex items-center rounded-full border border-moss px-3 py-1 text-xs text-moss">
        {LETTER_STATUS_LABELS.egg}
        {!letter.readAt && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-moss" />}
      </span>
    );
  }
  // replied
  if (isUnread(letter)) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-stamp/10 px-3 py-1.5 text-xs text-stamp">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-moss" />
        </span>
        牛奶箱里有你的回信
      </span>
    );
  }
  return <span className="text-xs text-slate">已读回信</span>;
}

/* ---------------- 信件卡 ---------------- */
function LetterCard({ letter, index }: { letter: MineLetter; index: number }) {
  const navigate = useNavigate();
  const tilt = index % 2 === 0 ? '-0.6deg' : '0.6deg';
  const unread = isUnread(letter);

  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1 + index * 0.1, ease: EASE }}
      style={{ rotate: tilt }}
      className="group"
    >
      <div
        role="link"
        tabIndex={0}
        onClick={() => navigate(`/letters/${letter.id}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/letters/${letter.id}`)}
        className={cn(
          'card-postcard cursor-pointer p-6 transition-all duration-500 ease-shop group-hover:-translate-y-1 group-hover:shadow-paper-deep',
          unread && 'ring-1 ring-moss/50',
        )}
      >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <CategorySeal category={letter.category} size={34} />
              <div>
                <p className="font-hand text-lg leading-6 text-wood">{letter.penName}</p>
                <p className="mt-0.5 font-garamond text-[11px] tracking-[0.12em] text-slate">
                  {fmtPostmarkDate(letter.createdAt)} 投出
                </p>
              </div>
            </div>
            <div className="opacity-80">
              <Postmark date={fmtPostmarkDate(letter.createdAt)} size={56} />
            </div>
          </div>

          <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate">
            {letter.content.trim() ? excerpt(letter.content, 80) : '（一张白纸，什么也没写。）'}
          </p>

          <div className="divider-sew mt-5 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBlock letter={letter} />
              <span className="text-xs text-slate transition-colors duration-300 group-hover:text-stamp">
                展开这封信 →
              </span>
            </div>
            {thanksOpen(letter) && (
              <p className="mt-3 text-right">
                <Link
                  to={`/letters/${letter.id}/thanks`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-hand text-base text-moss underline decoration-moss/50 underline-offset-4 transition-colors duration-300 hover:text-stamp"
                >
                  后来怎么样了？写封感谢信 →
                </Link>
              </p>
            )}
          </div>
        </div>
    </motion.div>
  );
}

/* ---------------- 页头（牛奶箱主视觉） ---------------- */
function MineHeader({ letters }: { letters: MineLetter[] }) {
  const pendingCount = letters.filter((l) => l.status === 'pending').length;
  const unread = letters.filter(isUnread).length;
  const hasUnread = unread > 0;

  return (
    <section className="relative overflow-hidden bg-night py-16">
      <LampGlow size={300} bright={hasUnread} className="absolute right-[10%] top-1/2 -translate-y-1/2" />
      <div className="relative mx-auto flex max-w-shop flex-col items-center gap-8 px-4 md:flex-row md:px-6">
        {/* 牛奶箱：有未读 → 播放开启动效；无未读 → 空箱静置 */}
        <div className="shrink-0">
          {hasUnread ? (
            <MilkBoxOpen size={200} autoPlay />
          ) : (
            <img
              src="/milkbox-empty.png"
              alt="空牛奶箱"
              className="h-[200px] w-[200px] rounded-xl object-cover shadow-paper-deep"
            />
          )}
        </div>
        <div className="text-center md:text-left">
          <h1 className="font-hand text-4xl text-cream">
            <DropText text="你的牛奶箱" stagger={0.08} />
          </h1>
          <p className="mt-3 text-sm leading-7 text-night-text/75">
            店后木门旁，钉着一只旧牛奶箱。回信都在里面。
          </p>
          <p className="mt-5 font-garamond text-sm tracking-[0.08em]">
            <span className="text-lamp-glow">{pendingCount} 封信在路上</span>
            <span className="mx-3 text-night-text/40">·</span>
            <span className="text-moss">{unread} 封回信未读</span>
          </p>
          <Link
            to="/letters/new"
            className="mt-6 inline-flex items-center rounded-lg bg-stamp px-6 py-2.5 text-sm text-cream shadow-paper-deep transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-110"
          >
            再写一封
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LettersMine() {
  const { isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { data, isLoading: listLoading } = trpc.letter.mine.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000, // 轮询：回信送达时状态刷新
  });

  const letters = (data ?? []) as MineLetter[];
  const unreadNow = letters.filter(isUnread).length;

  // 状态变化：收到新回信 → 纸笺 Toast「牛奶箱里有你的回信」
  const prevUnread = useRef<number | null>(null);
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (prevUnread.current !== null && unreadNow > prevUnread.current) {
      setToast(true);
      const t = setTimeout(() => setToast(false), 4000);
      return () => clearTimeout(t);
    }
    prevUnread.current = unreadNow;
  }, [unreadNow]);

  if (isLoading || !isAuthenticated) return <PageLoading note="正在打开牛奶箱……" />;

  return (
    <div>
      {/* 纸笺 Toast（顶部飘下）：外层 div 专责定位居中（framer-motion 内联 transform 会覆盖 Tailwind 位移类），内层 motion 只做动画 */}
      <div className="fixed left-1/2 top-24 z-[80] -translate-x-1/2">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: -16, opacity: 0, rotate: 1 }}
              animate={{ y: 0, opacity: 1, rotate: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="whitespace-nowrap rounded-md bg-wood px-5 py-2.5 text-sm text-cream shadow-paper-deep"
            >
              牛奶箱里有你的回信
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MineHeader letters={letters} />

      {/* 信件列表 */}
      <section className="mx-auto max-w-letter px-4 py-16">
        {listLoading ? (
          <PageLoading note="正在清点信件……" />
        ) : letters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          >
            <EmptyState
              title="牛奶箱还空着。"
              description="投第一封信吧——烦恼、犹豫、说不出口的事，店主都接。"
              ctaTo="/letters/new"
              ctaLabel="写一封信"
            >
              <Link to="/stories" className="link-underline-hand text-sm text-slate hover:text-stamp">
                先看看示例信件 →
              </Link>
            </EmptyState>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8">
            {letters.map((l, i) => (
              <LetterCard key={l.id} letter={l} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* 底部承诺条 */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 0.6, ease: EASE }}
        className="bg-milk py-6 text-center text-sm text-slate"
      >
        24 小时回信承诺 · 你的信只有店主会读 · 本店绝不窥视
      </motion.section>
    </div>
  );
}
