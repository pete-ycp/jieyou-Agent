import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AnimMoney from '@/components/shop/AnimMoney';
import PageSkeleton from '@/components/shop/PageSkeleton';
import ShopToaster from '@/components/shop/ShopToaster';
import { fmtDateTime, fmtMoney } from '@/components/shop/format';
import type { OrderDetailData } from '@/components/shop/shop-types';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export default function Pay() {
  const { orderNo = '' } = useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const {
    data: order,
    isLoading,
    error,
  } = trpc.order.detail.useQuery({ orderNo }, {
    enabled: isAuthenticated && !!orderNo,
    retry: false,
  });

  const [phase, setPhase] = useState<'counter' | 'processing' | 'success'>('counter');
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');

  // 非本人/不存在订单：回订单列表 + Toast
  useEffect(() => {
    if (error) {
      navigate('/orders', { replace: true, state: { toast: '这张订单不在你的柜台上' } });
    }
  }, [error, navigate]);

  // 已取消订单不能支付
  useEffect(() => {
    if (order?.status === 'cancelled') {
      navigate('/orders', { replace: true, state: { toast: '这张订单已作废，不能再付了' } });
    }
  }, [order?.status, navigate]);

  const payMut = trpc.order.pay.useMutation();

  const onPay = () => {
    if (payMut.isPending || phase === 'processing') return;
    setPhase('processing');
    payMut.mutate(
      { orderNo },
      {
        onSuccess: async () => {
          await utils.order.invalidate();
          // 1.2s 模拟处理后进入成功态
          window.setTimeout(() => setPhase('success'), 1200);
        },
        onError: (e) => {
          setPhase('counter');
          toast.error(e.message || '收银台忙不过来，再试一次');
        },
      },
    );
  };

  const onLeave = () => {
    navigate('/orders', { state: { toast: '订单先放在柜台上，随时回来付' } });
  };

  if (authLoading || !isAuthenticated || isLoading) {
    return (
      <>
        <ShopToaster />
        <PageSkeleton rows={1} narrow />
      </>
    );
  }
  if (!order) {
    // 重定向中（error effect 已触发）
    return (
      <>
        <ShopToaster />
        <PageSkeleton rows={1} narrow />
      </>
    );
  }

  // 已支付订单再访问本页：直接显示成功态
  const alreadyPaid = order.status !== 'pending_pay' && order.status !== 'cancelled';
  const showSuccess = phase === 'success' || alreadyPaid;

  return (
    <div className="mx-auto max-w-[560px] px-4 py-12 md:py-16">
      <ShopToaster />
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <SuccessCard key="success" order={order} justPaid={phase === 'success'} />
        ) : (
          /* 状态 A · 收银台 */
          <motion.div
            key="counter"
            initial={{ opacity: 0, scaleY: 0.7 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.8, ease: EASE }}
            style={{ transformOrigin: 'top center' }}
            className="card-postcard relative overflow-hidden p-6 md:p-8"
          >
            <h1 className="text-center font-hand text-4xl text-wood">柜台结账</h1>
            <p className="mt-1.5 text-center text-xs tracking-[0.12em] text-moss">
              演示柜台 · 不会真的收你的钱
            </p>

            {/* 订单摘要 */}
            <div className="mt-6 text-center">
              <p className="font-garamond text-lg tracking-wider text-ink">{order.orderNo}</p>
              <p className="mt-0.5 text-xs text-slate">写于 {fmtDateTime(order.createdAt)}</p>
            </div>
            <ul className="mt-5 space-y-2">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink">
                    {it.productName}
                    <span className="ml-1.5 font-garamond text-slate">×{it.quantity}</span>
                  </span>
                  <span className="shrink-0 font-garamond text-ink">
                    ¥{fmtMoney(it.unitPrice * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="divider-sew mt-5 pt-5 text-center">
              <p className="text-xs tracking-[0.2em] text-slate">应付</p>
              <p className="mt-1 font-garamond text-4xl leading-none text-stamp">
                <span className="mr-1 align-top text-lg">¥</span>
                <AnimMoney value={order.totalAmount} from={0} duration={0.5} />
              </p>
            </div>

            {/* 支付方式（均为模拟） */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(
                [
                  { key: 'cash', label: '柜台现金（模拟）', Icon: Coins },
                  { key: 'bank', label: '街口银行转账（模拟）', Icon: Landmark },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  aria-pressed={method === key}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-[13px] leading-5 transition-all duration-300',
                    method === key
                      ? 'border-stamp bg-stamp/5 text-ink shadow-[inset_0_0_0_1px_#A63A2E]'
                      : 'border-[#C9B48C] text-slate hover:text-ink',
                  )}
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </div>

            {/* 按钮组 */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onPay}
                disabled={phase === 'processing'}
                className="w-3/5 rounded-lg bg-stamp py-3 text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95 disabled:opacity-60"
              >
                付款
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="link-underline-hand text-sm text-slate transition-colors hover:text-wood"
              >
                先不付了
              </button>
            </div>

            {/* 模拟处理中：墨点晕开转圈 */}
            <AnimatePresence>
              {phase === 'processing' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-kraft/90"
                >
                  <motion.span
                    animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0.35, 0.75] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-10 w-10 rounded-full bg-ink/80 blur-[6px]"
                  />
                  <p className="font-hand text-lg text-wood">店主正在点钱…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 状态 B · 支付成功（包裹寄出 + 解忧卡片联动） */
function SuccessCard({ order, justPaid }: { order: OrderDetailData; justPaid: boolean }) {
  // 刚付完款时查询缓存可能尚未刷新，按 paid 处理
  const status = justPaid && order.status === 'pending_pay' ? 'paid' : order.status;
  const shipped = status === 'shipped' || status === 'done';
  const steps = [
    { label: '已收款', state: 'done' as const },
    { label: '店主备货中', state: (shipped ? 'done' : 'current') as 'done' | 'current' },
    { label: '寄出', state: (shipped ? 'done' : 'todo') as 'done' | 'todo' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="card-postcard relative mt-8 p-6 pt-12 text-center md:p-8 md:pt-14"
    >
      {/* 「已收款」朱红大章：盖下 + 墨晕扩散，常驻微斜 -8° */}
      <motion.div
        initial={{ opacity: 0, scale: 1.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: -8 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="absolute -top-9 left-1/2 -translate-x-1/2"
      >
        <span className="relative inline-flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-stamp bg-kraft font-hand text-xl leading-none text-stamp">
          已收款
          <motion.span
            aria-hidden
            initial={{ opacity: 0.55, scale: 0.85 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
            className="absolute inset-0 rounded-full border-2 border-stamp"
          />
        </span>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } } }}
      >
        <motion.h1 variants={fadeUp} className="font-hand text-4xl text-wood">
          付好了。
        </motion.h1>
        <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-md text-[15px] leading-8 text-ink/90">
          包裹会用牛皮纸包好，从浪矢杂货店寄出。店主还会随包裹附上一张解忧卡片——如果你刚好有心事。
        </motion.p>

        {/* 状态时间线（横排） */}
        <motion.div variants={fadeUp} className="mt-8 flex items-start justify-center">
          {steps.map((s, i) => (
            <Fragment key={s.label}>
              <div className="flex w-16 flex-col items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    'h-3.5 w-3.5 rounded-full border-2',
                    s.state === 'done' && 'border-stamp bg-stamp',
                    s.state === 'current' && 'animate-lamp-breathe border-lamp bg-lamp/70 shadow-glow',
                    s.state === 'todo' && 'border-slate/40',
                  )}
                />
                <span className={cn('text-xs', s.state === 'todo' ? 'text-slate/50' : 'text-ink')}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span aria-hidden className="mx-1 mt-1.5 w-8 border-t-2 border-dashed border-[#B9A67F] md:w-12" />
              )}
            </Fragment>
          ))}
        </motion.div>

        {/* 双 CTA：查看订单 + 信箱联动 */}
        <motion.div
          variants={fadeUp}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            to="/orders"
            className="inline-flex items-center rounded-lg bg-stamp px-6 py-2.5 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
          >
            查看我的订单
          </Link>
          <Link
            to="/letters/new"
            className="inline-flex items-center rounded-lg border border-stamp px-6 py-2.5 text-sm text-stamp transition-all duration-500 ease-shop hover:bg-stamp/5"
          >
            写一封信给店主
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
