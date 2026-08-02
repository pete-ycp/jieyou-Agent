import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AnimMoney from '@/components/shop/AnimMoney';
import PageSkeleton from '@/components/shop/PageSkeleton';
import ShopToaster from '@/components/shop/ShopToaster';
import { fmtMoney } from '@/components/shop/format';
import type { CartListItem } from '@/components/shop/shop-types';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const isSellable = (i: CartListItem) => i.status === 'on_sale' && i.stock > 0;

export default function Cart() {
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const navigate = useNavigate();

  const { data: items, isLoading } = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // 勾选状态派生自「用户取消勾选的 id 集」：默认全选可售条目；
  // 售罄/下架条目自动脱离勾选（选择集 = 可售且未被取消勾选）
  const [unchecked, setUnchecked] = useState<ReadonlySet<number>>(new Set());

  const list = useMemo(() => items ?? [], [items]);
  const selected = useMemo(
    () => list.filter((i) => isSellable(i) && !unchecked.has(i.id)),
    [list, unchecked],
  );
  const selectedCount = selected.reduce((s, i) => s + i.quantity, 0);
  const total = selected.reduce((s, i) => s + i.price * i.quantity, 0);

  // 售罄/下架条目：自动从勾选剔除并提示一次
  const prevSelectedRef = useRef<Set<number> | null>(null);
  useEffect(() => {
    const cur = new Set(selected.map((i) => i.id));
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = cur;
    if (!prev) return;
    const becameUnsellable = list.some((i) => prev.has(i.id) && !cur.has(i.id) && !isSellable(i));
    if (becameUnsellable) {
      toast('有的商品售罄了，先帮你从结算里拿出来了');
    }
  }, [list, selected]);

  // 数量变更：乐观更新，失败回滚
  const updateMut = trpc.cart.update.useMutation({
    onMutate: async ({ itemId, quantity }) => {
      await utils.cart.list.cancel();
      const prev = utils.cart.list.getData(undefined);
      utils.cart.list.setData(undefined, (old) =>
        old?.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      );
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) utils.cart.list.setData(undefined, ctx.prev);
      toast.error(e.message || '没改成，再试一次');
    },
    onSettled: () => {
      void utils.cart.list.invalidate();
      void utils.cart.count.invalidate();
    },
  });

  // 移除：乐观更新，失败回滚
  const removeMut = trpc.cart.remove.useMutation({
    onMutate: async ({ itemId }) => {
      await utils.cart.list.cancel();
      const prev = utils.cart.list.getData(undefined);
      utils.cart.list.setData(undefined, (old) => old?.filter((i) => i.id !== itemId));
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) utils.cart.list.setData(undefined, ctx.prev);
      toast.error(e.message || '没拿走，再试一次');
    },
    onSettled: () => {
      void utils.cart.list.invalidate();
      void utils.cart.count.invalidate();
    },
  });

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <ShopToaster />
        <PageSkeleton rows={3} />
      </>
    );
  }

  const toggle = (id: number) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeQty = (item: CartListItem, delta: 1 | -1) => {
    const next = item.quantity + delta;
    if (next < 1) return;
    if (next > item.stock) {
      toast('架上只有这么多了');
      return;
    }
    updateMut.mutate({ itemId: item.id, quantity: next });
  };

  const goCheckout = () => {
    if (!selected.length) return;
    navigate(`/checkout?cart=${selected.map((i) => i.id).join(',')}`);
  };

  return (
    <div className="mx-auto max-w-shop px-4 pb-28 pt-10 md:px-6 md:pt-14 lg:pb-14">
      <ShopToaster />

      {/* Section 1 · 页头 */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <h1 className="font-hand text-4xl text-wood">购物篮</h1>
        <p className="mt-1 text-sm text-slate">篮子里的东西，离店前要再点一遍。</p>
      </motion.header>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-kraft/80" />
          ))}
        </div>
      ) : list.length === 0 ? (
        /* Section 4 · 空篮状态 */
        <div className="flex flex-col items-center py-14 text-center">
          <motion.img
            src="/product-placeholder.png"
            alt="空篮子"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="h-[200px] w-[200px] rounded-xl object-cover shadow-paper"
          />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          >
            <h2 className="mt-6 font-hand text-3xl text-wood">篮子还空着。</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate">
              货架上有信纸、日杂和一些小东西，去看看？
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Link
                to="/products"
                className="inline-flex items-center rounded-lg bg-stamp px-7 py-2.5 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
              >
                去货架
              </Link>
              <Link to="/letters/new" className="link-underline-hand text-sm text-stamp">
                或者，写一封信 →
              </Link>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          {/* Section 2 · 条目列表 */}
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {list.map((item, idx) => {
                const sellable = isSellable(item);
                const isChecked = sellable && !unchecked.has(item.id);
                return (
                  <motion.li
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -64, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ duration: 0.65, delay: idx * 0.08, ease: EASE }}
                    className={cn('card-postcard overflow-hidden p-4', !sellable && 'opacity-70 saturate-50')}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 md:flex-nowrap md:gap-4">
                      {/* 勾选圆章（选中=朱红圆章「点」，盖下动效） */}
                      <button
                        type="button"
                        disabled={!sellable}
                        onClick={() => toggle(item.id)}
                        aria-label={isChecked ? `取消勾选 ${item.name}` : `勾选 ${item.name}`}
                        className="shrink-0"
                      >
                        <motion.span
                          key={isChecked ? 'on' : 'off'}
                          initial={isChecked ? { scale: 1.4 } : false}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full border font-hand text-sm leading-none',
                            isChecked
                              ? 'border-stamp bg-stamp text-cream shadow-paper'
                              : 'border-dashed border-[#B9A67F] text-transparent',
                          )}
                        >
                          点
                        </motion.span>
                      </button>

                      {/* 商品图 */}
                      <Link to={`/products/${item.productId}`} className="shrink-0">
                        <img
                          src={item.imageUrl ?? '/product-placeholder.png'}
                          alt={item.name}
                          loading="lazy"
                          className={cn(
                            'h-20 w-20 rounded-md object-cover sepia-[0.15] md:h-24 md:w-24',
                            !sellable && 'grayscale',
                          )}
                        />
                      </Link>

                      {/* 商品名 + 状态小签 */}
                      <div className="min-w-0 flex-1 basis-32 md:basis-auto">
                        <Link
                          to={`/products/${item.productId}`}
                          className="link-underline-hand block truncate text-base font-semibold text-ink md:text-lg"
                        >
                          {item.name}
                        </Link>
                        {sellable ? (
                          <p className="mt-0.5 text-xs text-slate">架上还有 {item.stock} 件</p>
                        ) : (
                          <span
                            className="mt-1 inline-block rounded-sm border-2 border-stamp/70 px-1.5 py-0.5 font-hand text-sm leading-none text-stamp/80"
                            style={{ transform: 'rotate(-8deg)' }}
                          >
                            已售罄
                          </span>
                        )}
                      </div>

                      {/* 操作区：移动换行整行，桌面归位列 */}
                      <div className="order-5 flex w-full items-center justify-between gap-4 pl-12 md:order-none md:w-auto md:justify-end md:gap-6 md:pl-0">
                        <p className="font-garamond text-base text-ink/75 md:w-20 md:text-right md:text-lg">
                          <span className="mr-0.5 align-top text-xs">¥</span>
                          {fmtMoney(item.price)}
                        </p>

                        {/* 数量器（上限库存，超限 Toast） */}
                        <div className="flex items-center rounded-full border border-[#C9B48C] bg-cream/60">
                          <button
                            type="button"
                            aria-label="减少数量"
                            disabled={!sellable || item.quantity <= 1}
                            onClick={() => changeQty(item, -1)}
                            className="p-1.5 text-wood transition-opacity disabled:opacity-30"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-7 text-center font-garamond text-base text-ink">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="增加数量"
                            disabled={!sellable}
                            onClick={() => changeQty(item, 1)}
                            className="p-1.5 text-wood transition-opacity disabled:opacity-30"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* 小计（数字滚动） */}
                        <p className="w-24 text-right font-garamond text-lg font-semibold text-wood md:w-24 md:text-xl">
                          <span className="mr-0.5 align-top text-xs">¥</span>
                          <AnimMoney value={item.price * item.quantity} duration={0.3} />
                        </p>
                      </div>

                      {/* 移除 */}
                      <button
                        type="button"
                        aria-label={`移除 ${item.name}`}
                        onClick={() => removeMut.mutate({ itemId: item.id })}
                        className="order-4 shrink-0 text-slate/70 transition-colors duration-300 hover:text-vermilion md:order-none"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          {/* Section 3 · 合计区（桌面 sticky 右栏） */}
          <aside className="hidden lg:block">
            <div className="card-postcard sticky top-24 p-5">
              <p className="font-hand text-xl text-wood">柜台上点点数</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate">已点 {selectedCount} 件</span>
                  <span className="font-garamond text-ink">¥{fmtMoney(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate">运费</span>
                  <span className="text-moss">小店包邮，店主骑车送</span>
                </div>
              </div>
              <div className="divider-sew mt-4 flex items-end justify-between pt-4">
                <span className="text-sm text-slate">合计</span>
                <p className="font-garamond text-[28px] leading-none text-stamp">
                  <span className="mr-0.5 align-top text-base">¥</span>
                  <AnimMoney value={total} duration={0.4} />
                </p>
              </div>
              <button
                type="button"
                disabled={!selected.length}
                onClick={goCheckout}
                className="mt-4 w-full rounded-lg bg-stamp py-3 text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                去柜台结账
              </button>
              {!selected.length && (
                <p className="mt-2 text-center text-xs text-moss">先点几件东西</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Section 3 · 合计区（移动底部 sticky 条） */}
      {!isLoading && list.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#C9B48C] bg-kraft/95 px-4 py-3 shadow-paper backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-shop items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate">
                已点 {selectedCount} 件 · <span className="text-moss">包邮</span>
              </p>
              <p className="font-garamond text-2xl leading-none text-stamp">
                <span className="mr-0.5 align-top text-sm">¥</span>
                <AnimMoney value={total} duration={0.4} />
              </p>
            </div>
            <button
              type="button"
              disabled={!selected.length}
              onClick={goCheckout}
              className="rounded-lg bg-stamp px-6 py-2.5 text-sm text-cream shadow-paper transition-all duration-500 ease-shop active:translate-y-[1px] disabled:opacity-40"
            >
              去柜台结账
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
