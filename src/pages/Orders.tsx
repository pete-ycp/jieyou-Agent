import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ORDER_STATUS_LABELS } from '@contracts/labels';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import OrderCard from '@/components/shop/OrderCard';
import PageSkeleton from '@/components/shop/PageSkeleton';
import ShopToaster from '@/components/shop/ShopToaster';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface StatusTab {
  key: string;
  label: string;
  match: (status: string) => boolean;
}

const TABS: StatusTab[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'pending_pay', label: ORDER_STATUS_LABELS.pending_pay, match: (s) => s === 'pending_pay' },
  { key: 'paid', label: ORDER_STATUS_LABELS.paid, match: (s) => s === 'paid' },
  { key: 'done', label: ORDER_STATUS_LABELS.done, match: (s) => s === 'done' || s === 'shipped' },
  { key: 'cancelled', label: ORDER_STATUS_LABELS.cancelled, match: (s) => s === 'cancelled' },
];

export default function Orders() {
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [sp, setSp] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 状态筛选走 URL query（可分享）
  const rawTab = sp.get('status') ?? 'all';
  const tabKey = (TABS.map((t) => t.key) as readonly string[]).includes(rawTab) ? rawTab : 'all';
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];

  // 一次取全部，前端分桶——Tab 计数需要全量
  const { data: orders, isLoading } = trpc.order.mine.useQuery(
    {},
    { enabled: isAuthenticated },
  );

  // 其他页面（支付/详情）重定向带来的 Toast
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast;
    if (msg) {
      toast(msg);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    const all = orders ?? [];
    for (const t of TABS) m.set(t.key, all.filter((o) => t.match(o.status)).length);
    return m;
  }, [orders]);

  const setTab = (key: string) => {
    setSp(key === 'all' ? {} : { status: key }, { replace: true });
  };

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <ShopToaster />
        <PageSkeleton rows={2} />
      </>
    );
  }

  const filtered = (orders ?? []).filter((o) => tab.match(o.status));
  const totallyEmpty = !isLoading && (orders ?? []).length === 0;

  return (
    <div className="mx-auto max-w-shop px-4 py-10 md:px-6 md:py-14">
      <ShopToaster />

      {/* Section 1 · 页头 */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <h1 className="font-hand text-4xl text-wood">我的订单</h1>
        <p className="mt-1 text-sm text-slate">每一笔，柜台都记着。</p>
      </motion.header>

      {/* 状态 Tab（木牌 Tab，选中=暖黄底 + 朱红手划下划线滑动） */}
      <div className="mt-6 flex flex-wrap gap-x-1 gap-y-1 border-b-2 border-dashed border-[#B9A67F]/60">
        {TABS.map((t) => {
          const active = t.key === tabKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'relative rounded-t-md px-3 py-2 text-sm transition-colors duration-300 md:px-4',
                active ? 'bg-lamp/20 text-wood' : 'text-slate hover:text-wood',
              )}
            >
              {t.label}
              <span className="ml-1.5 font-garamond text-xs text-slate">
                {counts.get(t.key) ?? 0}
              </span>
              {active && (
                <motion.span
                  layoutId="orders-tab-underline"
                  transition={{ duration: 0.3, ease: EASE }}
                  className="absolute inset-x-2 bottom-[-2px] h-[2px] bg-stamp"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Section 2 · 订单卡片列 */}
      {isLoading ? (
        <div className="mt-6 space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-kraft/80" />
          ))}
        </div>
      ) : totallyEmpty ? (
        /* Section 3 · 空状态 */
        <div className="flex flex-col items-center py-14 text-center">
          <motion.img
            src="/product-placeholder.png"
            alt=""
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
            <h2 className="mt-6 font-hand text-3xl text-wood">柜台上还没有你的订单。</h2>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Link
                to="/products"
                className="inline-flex items-center rounded-lg bg-stamp px-7 py-2.5 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
              >
                去货架看看
              </Link>
              <Link to="/letters/new" className="link-underline-hand text-sm text-stamp">
                写一封信 →
              </Link>
            </div>
          </motion.div>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-14 text-center font-hand text-2xl text-slate/70">这个格子里还空着。</p>
      ) : (
        <div className="mt-6 space-y-5 pb-4">
          {filtered.map((o, i) => (
            <OrderCard key={o.orderNo} order={o} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
