import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { PenLine, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/const';
import ShelfCard from '@/components/shop/ShelfCard';
import type { ShelfProduct } from '@/components/shop/ShelfCard';
import PaperToast from '@/components/shop/PaperToast';
import Reveal from '@/components/shop/Reveal';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const PAGE_SIZE = 24;

/** 关键词逐字浮现（50ms stagger） */
function KeywordReveal({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={`${text}-${i}`}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: EASE }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  );
}

/** 空结果：牛奶箱空状态 + 导流写信 */
function EmptyResult({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <motion.img
        src="/milkbox-empty.png"
        alt="空着的牛奶箱"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="h-60 w-60 rounded-xl object-cover shadow-paper"
      />
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } } }}
        className="flex flex-col items-center gap-5"
      >
        <motion.h2
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
          className="font-hand text-3xl text-wood"
        >
          {hasQuery ? '货架上没找到这件东西。' : '想找什么？在木牌上写下来。'}
        </motion.h2>
        {hasQuery && (
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            className="max-w-md text-[15px] leading-8 text-slate"
          >
            店主进货慢，但回信快。如果心里装着别的事——写下来，投进投递口，明早牛奶箱里会有回信。
          </motion.p>
        )}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
          className="mt-1 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/letters/new"
            className="inline-flex items-center gap-2 rounded-lg bg-stamp px-7 py-3 text-[15px] text-cream shadow-paper transition-all duration-400 ease-shop hover:translate-y-[1px]"
            style={{ animation: 'cta-breathe 3.2s ease-in-out infinite' }}
          >
            <PenLine size={16} />
            写一封信
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center rounded-lg border-2 border-wood/50 px-7 py-3 text-[15px] text-wood transition-all duration-400 ease-shop hover:translate-y-[1px] hover:bg-kraft"
          >
            回货架看看
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100);
  const hasQuery = q.length > 0;

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.shop.list.useQuery(
    { keyword: q, page: 1, pageSize: PAGE_SIZE },
    { enabled: hasQuery },
  );
  const items = data?.items ?? [];

  /* 搜索框（预填当前词；无词时自动聚焦） */
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(q);
  useEffect(() => {
    setDraft(q);
    if (!q) inputRef.current?.focus();
  }, [q]);
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    navigate(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
  };

  /* 小纸笺提示 + 快捷加购 */
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNote = (msg: string) => {
    setNote(msg);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2200);
  };
  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  const addMutation = trpc.cart.add.useMutation({
    onSuccess: (_r, vars) => {
      void utils.cart.count.invalidate();
      const name = items.find((i) => i.id === vars.productId)?.name;
      showNote(name ? `「${name}」已放进购物篮。` : '已放进购物篮。');
    },
    onError: (e) => showNote(e.message || '没放进去，请再试一次。'),
  });
  const handleQuickAdd = (p: ShelfProduct) => {
    if (!isAuthenticated) {
      navigate(`${LOGIN_PATH}?from=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    addMutation.mutate({ productId: p.id, quantity: 1 });
  };

  return (
    <div className="pb-16">
      <PaperToast note={note} />

      {/* Section 1 · 搜索回显头 */}
      <section className="bg-kraft" style={{ borderTop: '2px dashed #B9A67F', borderBottom: '2px dashed #B9A67F' }}>
        <div className="mx-auto flex max-w-letter flex-col items-center px-4 py-12 text-center md:px-6">
          <p className="text-[12px] tracking-[0.12em] text-slate">你在货架上找</p>
          <h1 className="mt-2 break-all font-serif text-4xl font-bold leading-[44px] text-ink">
            {hasQuery ? (
              <>
                「<KeywordReveal key={q} text={q} />」
              </>
            ) : (
              <span className="font-hand text-3xl text-wood">还没写下要找的东西</span>
            )}
          </h1>
          {hasQuery && (
            <p className="mt-3 font-garamond text-sm text-slate">
              {isLoading ? '正在翻货架…' : `找到 ${data?.total ?? 0} 件`}
            </p>
          )}
          {/* 挂一条居中的小搜索框（可改词再搜） */}
          <motion.form
            onSubmit={submitSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
            className="mt-6 flex w-full max-w-md items-center gap-2 rounded-lg border border-wood/30 bg-cream px-4 py-2.5 shadow-paper focus-within:ring-1 focus-within:ring-lamp"
          >
            <SearchIcon size={17} className="shrink-0 text-wood/60" />
            <input
              ref={inputRef}
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="想在货架上找什么？"
              maxLength={100}
              aria-label="搜索商品"
              className="w-full bg-transparent text-[15px] text-ink placeholder:text-slate/70 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-wood px-3.5 py-1.5 text-sm text-cream transition-all duration-400 ease-shop hover:translate-y-[1px] hover:brightness-110"
            >
              找找看
            </button>
          </motion.form>
        </div>
      </section>

      {/* Section 2 · 结果网格 / Section 3 · 空结果 */}
      <div className="mx-auto max-w-shop px-4 pt-10 md:px-6">
        {!hasQuery ? (
          <EmptyResult hasQuery={false} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-postcard animate-pulse p-3">
                <div className="rounded-lg bg-wood/10" style={{ aspectRatio: '4/3' }} />
                <div className="mx-1 mb-1 mt-4 h-4 w-3/4 rounded bg-wood/10" />
                <div className="mx-1 mt-2 h-4 w-1/3 rounded bg-wood/10" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div
            className={cn(
              'transition-opacity duration-300 ease-shop',
              addMutation.isPending ? 'opacity-40' : 'opacity-100',
            )}
          >
            <Reveal as="div" stagger={0.08} y={40} duration={0.75} className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ShelfCard key={p.id} product={p} highlight={q} onQuickAdd={handleQuickAdd} />
              ))}
            </Reveal>
          </div>
        ) : (
          <EmptyResult hasQuery />
        )}
      </div>
    </div>
  );
}
