import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/const';
import { PRODUCT_CATEGORIES } from '@contracts/labels';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ShelfCard from '@/components/shop/ShelfCard';
import type { ShelfProduct } from '@/components/shop/ShelfCard';
import PaperToast from '@/components/shop/PaperToast';
import EmptyState from '@/components/shop/EmptyState';
import Reveal from '@/components/shop/Reveal';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const PAGE_SIZE = 12;

type SortKey = 'newest' | 'price_asc' | 'price_desc';
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: '默认上架时间' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
];

/** 页头氛围：头图与文案按分类切换 */
const HERO: Record<string, { image: string; quote: string }> = {
  all: { image: '/prod-stationery.png', quote: '货架上的商品寥寥，但都是店主认真选的。' },
  stationery: { image: '/prod-stationery.png', quote: '写信的纸，要用好一点的。' },
  kitchen: { image: '/prod-kitchen.png', quote: '日子是一餐一饭过出来的。' },
  healing: { image: '/prod-healing.png', quote: '小东西不解决问题，但能陪你一会儿。' },
};

function isCategory(v: string | null): v is 'stationery' | 'kitchen' | 'healing' {
  return v === 'stationery' || v === 'kitchen' || v === 'healing';
}
function isSort(v: string | null): v is SortKey {
  return v === 'newest' || v === 'price_asc' || v === 'price_desc';
}

/** 文案逐字浮现（40ms stagger） */
function CharStagger({ text, className, step = 0.04 }: { text: string; className?: string; step?: number }) {
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={`${text}-${i}`}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * step, duration: 0.5, ease: EASE }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  );
}

/* ---------------- Section 1 · 页头（分类氛围头图带） ---------------- */
function PageHero({ category }: { category: string }) {
  const hero = HERO[category] ?? HERO.all;
  return (
    <section className="relative h-[240px] overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.img
          key={category}
          src={hero.image}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="absolute inset-0 h-full w-full object-cover sepia-[0.2]"
        />
      </AnimatePresence>
      {/* 60% 奶油蒙版 */}
      <div className="absolute inset-0 bg-cream/60" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative mx-auto flex h-full max-w-shop items-end justify-between gap-6 px-4 pb-8 md:px-6"
      >
        <div>
          <h1 className="font-hand text-5xl leading-none text-ink">货架</h1>
          <p className="mt-3 text-sm tracking-wide text-slate">提供商品订购服务，欢迎咨询</p>
        </div>
        <CharStagger
          key={category}
          text={hero.quote}
          className="hidden max-w-xs text-right font-hand text-xl leading-relaxed text-wood sm:block"
        />
      </motion.div>
    </section>
  );
}

/* ---------------- Section 2 · 工具条 ---------------- */
function Toolbar({
  category,
  sort,
  total,
  onCategory,
  onSort,
}: {
  category: string;
  sort: SortKey;
  total: number;
  onCategory: (c: string) => void;
  onSort: (s: SortKey) => void;
}) {
  const tabs = [{ value: 'all', label: '全部' }, ...PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))];
  return (
    <div
      className="sticky top-16 z-40 bg-cream/95 backdrop-blur-sm md:top-[52px]"
      style={{ borderBottom: '2px dashed #B9A67F' }}
    >
      <div className="mx-auto flex max-w-shop flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-6">
        {/* 分类木牌 Tab */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((t) => {
            const active = category === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onCategory(t.value)}
                className={cn(
                  'relative rounded-md px-3.5 py-1.5 text-sm transition-colors duration-400 ease-shop',
                  active ? 'bg-lamp/25 font-medium text-ink' : 'text-wood/80 hover:bg-kraft hover:text-wood',
                )}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="category-underline"
                    transition={{ duration: 0.3, ease: EASE }}
                    className="absolute inset-x-2 -bottom-[1px] h-0.5 rounded-full bg-vermilion"
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* 排序 + 计数 */}
        <div className="flex items-center gap-4">
          <span className="font-garamond text-sm text-slate">共 {total} 件</span>
          {/* 排序下拉：必须用 shadcn Select（Radix 弹层），不能用原生 <select>——
              移动端浏览器会强制弹系统 picker，店铺样式全部失效 */}
          <Select value={sort} onValueChange={(v) => onSort(v as SortKey)}>
            <SelectTrigger
              aria-label="排序方式"
              size="sm"
              className="rounded-md border-wood/30 bg-kraft text-sm text-wood shadow-paper transition-colors duration-400 ease-shop focus-visible:ring-1 focus-visible:ring-lamp"
            >
              <SelectValue />
            </SelectTrigger>
            {/* popper 模式：选项从触发器下方展开（默认 item-aligned 会覆盖触发器，看起来像选项脱离了下拉框） */}
            <SelectContent position="popper">
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 分页（木牌页码，当前页=朱红印章圈） ---------------- */
function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav aria-label="分页" className="mt-10 flex items-center justify-center gap-2.5">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded-md border border-wood/30 bg-kraft px-3 py-1.5 text-sm text-wood transition-colors duration-400 ease-shop enabled:hover:bg-lamp/25 disabled:opacity-40"
      >
        上一页
      </button>
      {pages.map((p) =>
        p === page ? (
          <span
            key={p}
            aria-current="page"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-stamp font-garamond text-base text-stamp"
            style={{ transform: 'rotate(-6deg)' }}
          >
            {p}
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-wood/30 bg-kraft font-garamond text-base text-wood transition-colors duration-400 ease-shop hover:bg-lamp/25"
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded-md border border-wood/30 bg-kraft px-3 py-1.5 text-sm text-wood transition-colors duration-400 ease-shop enabled:hover:bg-lamp/25 disabled:opacity-40"
      >
        下一页
      </button>
    </nav>
  );
}

/* ---------------- 页面 ---------------- */
export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort');
  const category = isCategory(categoryParam) ? categoryParam : 'all';
  const sort: SortKey = isSort(sortParam) ? sortParam : 'newest';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const queryInput = useMemo(
    () => ({
      category: category === 'all' ? undefined : (category as 'stationery' | 'kitchen' | 'healing'),
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [category, sort, page],
  );
  const { data, isLoading, isPlaceholderData } = trpc.shop.list.useQuery(queryInput, {
    placeholderData: (prev) => prev,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateParams = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    }
    setSearchParams(params, { replace: false });
  };
  const setCategory = (c: string) => updateParams({ category: c === 'all' ? undefined : c, page: undefined });
  const setSort = (s: SortKey) => updateParams({ sort: s === 'newest' ? undefined : s, page: undefined });
  const setPage = (p: number) => updateParams({ page: p <= 1 ? undefined : String(p) });

  // 页码超出范围时回到最后一页（例如分享链接的过期页码）
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages]);

  /* 小纸笺提示 */
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNote = (msg: string) => {
    setNote(msg);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2200);
  };
  useEffect(() => () => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
  }, []);

  const addMutation = trpc.cart.add.useMutation({
    onSuccess: (_r, vars) => {
      void utils.cart.count.invalidate();
      const name = data?.items.find((i) => i.id === vars.productId)?.name;
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
      <PageHero category={category} />
      <Toolbar category={category} sort={sort} total={total} onCategory={setCategory} onSort={setSort} />

      <div className="mx-auto max-w-shop px-4 pt-10 md:px-6">
        {isLoading ? (
          /* 骨架：牛皮纸卡呼吸 */
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-postcard animate-pulse p-3">
                <div className="rounded-lg bg-wood/10" style={{ aspectRatio: '4/3' }} />
                <div className="mx-1 mb-1 mt-4 h-4 w-3/4 rounded bg-wood/10" />
                <div className="mx-1 mt-2 h-4 w-1/3 rounded bg-wood/10" />
              </div>
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            {/* 筛选/排序切换时列表 0.4→1 骨架过渡 */}
            <div
              className={cn(
                'transition-opacity duration-300 ease-shop',
                isPlaceholderData || addMutation.isPending ? 'opacity-40' : 'opacity-100',
              )}
            >
              <Reveal as="div" stagger={0.08} y={40} duration={0.75} className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {data.items.map((p) => (
                  <ShelfCard key={p.id} product={p} onQuickAdd={handleQuickAdd} />
                ))}
              </Reveal>
            </div>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            <p className="mt-10 text-center font-hand text-lg text-wood/70">
              货架就这些了，剩下的故事在信箱里。
            </p>
          </>
        ) : (
          /* 这一格货架空着：双轨互导 */
          <EmptyState
            title="这一格货架空着。"
            description="换个分类看看，或者——把心里的事写下来，投进信箱。"
            ctaTo="/products"
            ctaLabel="看看全部商品"
          >
            <Link
              to="/letters/new"
              className="inline-flex items-center rounded-lg border-2 border-wood/50 px-6 py-2.5 text-sm text-wood transition-all duration-500 ease-shop hover:translate-y-[1px] hover:bg-kraft"
            >
              把烦恼写下来投进信箱
            </Link>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
