import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { Mail, Minus, Plus, ShoppingBasket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/const';
import { PRODUCT_CATEGORIES } from '@contracts/labels';
import ShelfCard from '@/components/shop/ShelfCard';
import PaperToast from '@/components/shop/PaperToast';
import ShopkeeperNote from '@/components/shop/ShopkeeperNote';
import EmptyState from '@/components/shop/EmptyState';
import Postmark from '@/components/shop/Postmark';
import Reveal from '@/components/shop/Reveal';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.value, c.label]),
);

function todayStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);
  const validId = Number.isInteger(productId) && productId > 0;

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const {
    data: product,
    isLoading,
    isError,
  } = trpc.shop.detail.useQuery({ id: productId }, { enabled: validId, retry: false });

  /* 同架商品（同分类，排除自己） */
  const { data: relatedData } = trpc.shop.list.useQuery(
    {
      category: product?.category as 'stationery' | 'kitchen' | 'healing' | undefined,
      page: 1,
      pageSize: 5,
    },
    { enabled: !!product },
  );
  const related = useMemo(
    () => (relatedData?.items ?? []).filter((p) => p.id !== product?.id).slice(0, 4),
    [relatedData, product?.id],
  );

  /* 小纸笺提示 */
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

  const [quantity, setQuantity] = useState(1);
  const [stamped, setStamped] = useState(false);
  useEffect(() => {
    setQuantity(1);
    setStamped(false);
  }, [productId]);

  const stock = product?.stock ?? 0;
  const soldOut = !product || stock <= 0;

  const changeQuantity = (delta: number) => {
    if (!product) return;
    const next = quantity + delta;
    if (next > stock) {
      showNote('架上只有这么多了。');
      return;
    }
    setQuantity(Math.max(1, next));
  };

  const addMutation = trpc.cart.add.useMutation({
    onSuccess: () => {
      void utils.cart.count.invalidate();
      setStamped(true);
      showNote('已放进购物篮。');
      setTimeout(() => setStamped(false), 900);
    },
    onError: (e) => showNote(e.message || '没放进去，请再试一次。'),
  });

  const requireLogin = () => {
    navigate(`${LOGIN_PATH}?from=${encodeURIComponent(location.pathname + location.search)}`);
  };

  const handleAddToCart = () => {
    if (!product || soldOut) return;
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    addMutation.mutate({ productId: product.id, quantity });
  };

  const handleBuyNow = () => {
    if (!product || soldOut) return;
    if (!isAuthenticated) {
      requireLogin();
      return;
    }
    navigate(`/checkout?productId=${product.id}&quantity=${quantity}`);
  };

  /* ---------- 载入骨架 ---------- */
  if (isLoading) {
    return (
      <div className="mx-auto max-w-shop px-4 py-10 md:px-6">
        <div className="h-4 w-48 animate-pulse rounded bg-wood/10" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[55fr_45fr]">
          <div className="card-postcard animate-pulse p-3">
            <div className="rounded-lg bg-wood/10" style={{ aspectRatio: '4/3' }} />
          </div>
          <div className="flex animate-pulse flex-col gap-4 pt-2">
            <div className="h-5 w-20 rounded bg-wood/10" />
            <div className="h-9 w-3/4 rounded bg-wood/10" />
            <div className="h-7 w-1/3 rounded bg-wood/10" />
            <div className="h-11 w-full rounded bg-wood/10" />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- 不存在 / 已下架（后端抛 NOT_FOUND） ---------- */
  if (!validId || isError || !product) {
    return (
      <div className="mx-auto max-w-shop px-4 md:px-6">
        <EmptyState
          title="这件商品不在货架上了。"
          description="也许卖完了，也许被收进了仓库——去货架上看看别的，或者写信问问店主。"
          ctaTo="/products"
          ctaLabel="回货架看看"
        >
          <Link
            to="/letters/new"
            className="inline-flex items-center rounded-lg border-2 border-wood/50 px-6 py-2.5 text-sm text-wood transition-all duration-500 ease-shop hover:translate-y-[1px] hover:bg-kraft"
          >
            写信问问店主
          </Link>
        </EmptyState>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[product.category] ?? '杂货';
  const keeperParagraphs = (product.keeperNote ?? '').split(/\n+/).filter(Boolean);
  const descParagraphs = (product.description ?? '').split(/\n+/).filter(Boolean);

  return (
    <div className="pb-16">
      <PaperToast note={note} />

      <div className="mx-auto max-w-shop px-4 pt-8 md:px-6">
        {/* Section 1 · 面包屑 */}
        <motion.nav
          aria-label="面包屑"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-wrap items-center gap-1.5 text-[12px] tracking-[0.08em] text-slate"
        >
          <Link to="/products" className="link-underline-hand hover:text-wood">
            货架
          </Link>
          <span aria-hidden>/</span>
          <Link to={`/products?category=${product.category}`} className="link-underline-hand hover:text-wood">
            {categoryLabel}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink">{product.name}</span>
        </motion.nav>

        {/* Section 2 · 主区：左图右信息 */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[55fr_45fr]">
          {/* 左 · 图廊（hover 缓慢推近，仿"拿近了看"） */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="card-postcard p-3"
          >
            <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: '4/3' }}>
              <img
                src={product.imageUrl || '/product-placeholder.png'}
                alt={product.name}
                className={cn(
                  'h-full w-full object-cover sepia-[0.18] transition-transform duration-[1500ms] ease-shop hover:scale-[1.08]',
                  soldOut && 'grayscale-[0.5] opacity-80',
                )}
              />
              {soldOut && (
                <span
                  className="absolute right-4 top-4 rounded-sm border-2 border-stamp bg-cream/70 px-2.5 py-1 font-hand text-xl leading-none text-stamp"
                  style={{ transform: 'rotate(-12deg)' }}
                >
                  售罄
                </span>
              )}
            </div>
          </motion.div>

          {/* 右 · 信息栈（stagger 自右滑入） */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="flex flex-col"
          >
            <motion.div variants={{ hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}>
              <span className="inline-block rounded-sm bg-moss px-1.5 py-0.5 text-[12px] leading-none tracking-[0.12em] text-cream">
                {categoryLabel}
              </span>
              <h1 className="mt-3 text-4xl font-bold leading-[44px] text-ink">{product.name}</h1>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
              className="mt-4 flex items-center gap-4"
            >
              <p className="font-garamond text-[28px] leading-none text-wood">
                <span className="mr-0.5 align-top text-lg">¥</span>
                {product.price.toFixed(2)}
              </p>
              {soldOut ? (
                <span
                  className="rounded-sm border-2 border-slate/60 px-2 py-0.5 text-[12px] tracking-[0.12em] text-slate"
                  style={{ transform: 'rotate(-6deg)' }}
                >
                  售罄
                </span>
              ) : (
                <span
                  className="rounded-sm border-2 border-stamp px-2 py-0.5 text-[12px] tracking-[0.12em] text-stamp"
                  style={{ transform: 'rotate(-6deg)' }}
                >
                  现货
                </span>
              )}
            </motion.div>

            <motion.p
              variants={{ hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
              className="mt-3 text-sm"
            >
              {soldOut ? (
                <span className="text-slate">这件卖完了。</span>
              ) : stock < 10 ? (
                <span className="text-moss">架上只剩 {stock} 件。</span>
              ) : (
                <span className="text-slate">架上还有存货。</span>
              )}
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
              className="divider-sew mt-6 pt-6"
            >
              {/* 数量选择器（木牌按钮，上限=库存） */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate">数量</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="减少数量"
                    disabled={soldOut || quantity <= 1}
                    onClick={() => changeQuantity(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-wood/30 bg-kraft text-wood shadow-paper transition-all duration-400 ease-shop enabled:hover:bg-lamp/25 disabled:opacity-40"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-12 text-center font-garamond text-xl text-ink">{quantity}</span>
                  <button
                    type="button"
                    aria-label="增加数量"
                    disabled={soldOut || quantity >= stock}
                    onClick={() => changeQuantity(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-wood/30 bg-kraft text-wood shadow-paper transition-all duration-400 ease-shop enabled:hover:bg-lamp/25 disabled:opacity-40"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* 按钮组 */}
              <div className="relative mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={soldOut || addMutation.isPending}
                  className={cn(
                    'relative inline-flex items-center gap-2 overflow-hidden rounded-lg px-7 py-3 text-[15px] shadow-paper transition-all duration-400 ease-shop',
                    soldOut
                      ? 'cursor-not-allowed bg-slate/40 text-cream/80'
                      : 'bg-stamp text-cream hover:translate-y-[1px] hover:brightness-95',
                  )}
                >
                  <ShoppingBasket size={17} />
                  {soldOut ? '卖完了' : addMutation.isPending ? '放进篮子里…' : '加入购物篮'}
                  {/* 加购成功：盖"已入篮"半透明章 */}
                  {stamped && (
                    <motion.span
                      initial={{ scale: 1.6, opacity: 0, rotate: -16 }}
                      animate={{ scale: 1, opacity: 1, rotate: -8 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="absolute inset-0 flex items-center justify-center bg-cream/85 font-hand text-xl text-stamp"
                    >
                      已入篮
                    </motion.span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={soldOut}
                  className={cn(
                    'rounded-lg px-7 py-3 text-[15px] transition-all duration-400 ease-shop',
                    soldOut
                      ? 'cursor-not-allowed border-2 border-slate/30 text-slate/60'
                      : 'border-2 border-wood text-wood shadow-[inset_0_0_0_3px_rgba(247,240,225,.9),inset_0_0_0_4px_rgba(107,74,50,.35)] hover:translate-y-[1px] hover:bg-kraft',
                  )}
                >
                  直接买下
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Section 3 · 店主手记（本页灵魂） */}
      {keeperParagraphs.length > 0 && (
        <section className="mx-auto mt-16 max-w-letter px-4 md:px-6">
          <Reveal stagger={0.15} y={20} duration={0.8} start="top 80%">
            <ShopkeeperNote className="text-xl leading-[34px]">
              {keeperParagraphs.map((p, i) => (
                <p key={i} className={i > 0 ? 'mt-4' : undefined}>
                  {p}
                </p>
              ))}
            </ShopkeeperNote>
            <div className="mt-5 flex items-center justify-end gap-4">
              <span className="font-hand text-lg text-wood">店主 记</span>
              <Postmark date={todayStamp()} size={72} />
            </div>
          </Reveal>
        </section>
      )}

      {/* Section 4 · 商品详情 */}
      {descParagraphs.length > 0 && (
        <section className="mx-auto mt-14 max-w-letter px-4 md:px-6">
          <Reveal stagger={0.1} y={30} duration={0.8}>
            <div className="card-postcard p-6 md:p-8">
              <h2 className="font-hand text-2xl text-wood">商品详情</h2>
              <div className="divider-sew mt-4 pt-4">
                {descParagraphs.map((p, i) => (
                  <p key={i} className={cn('leading-8 text-ink', i > 0 && 'divider-sew mt-4 pt-4')}>
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* Section 5 · 联动带（商城→信箱双轨） */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-16 bg-milk"
      >
        <div className="mx-auto flex max-w-letter flex-col items-center gap-6 px-4 py-10 text-center sm:flex-row sm:text-left md:px-6">
          <motion.img
            src="/milkbox-letter.png"
            alt="牛奶箱里露出回信的一角"
            whileHover={{ rotate: [-0, -2, 0], scale: [1, 1.03, 1] }}
            transition={{ duration: 0.6, ease: EASE }}
            className="h-[120px] w-[120px] shrink-0 rounded-xl object-cover shadow-paper"
            loading="lazy"
          />
          <div>
            <p className="leading-8 text-ink">
              买不买都好，若心里有事——写信给店主，明早牛奶箱取回信。
            </p>
            <Link
              to="/letters/new"
              className="link-underline-hand mt-2 inline-flex items-center gap-1.5 text-stamp"
            >
              <Mail size={15} />
              去写信 →
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Section 6 · 同架商品 */}
      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-shop px-4 md:px-6">
          <h2 className="font-hand text-3xl text-wood">同一个货架上</h2>
          <Reveal stagger={0.08} y={40} duration={0.75} className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
            {related.map((p) => (
              <ShelfCard key={p.id} product={p} />
            ))}
          </Reveal>
        </section>
      )}
    </div>
  );
}
