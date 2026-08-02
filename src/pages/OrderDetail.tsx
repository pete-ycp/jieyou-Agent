import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import AnimMoney from '@/components/shop/AnimMoney';
import OrderActionButtons from '@/components/shop/OrderActionButtons';
import OrderStatusStamp from '@/components/shop/OrderStatusStamp';
import OrderTimeline from '@/components/shop/OrderTimeline';
import type { OrderTimelineNode } from '@/components/shop/OrderTimeline';
import PageSkeleton from '@/components/shop/PageSkeleton';
import Postmark from '@/components/shop/Postmark';
import ShopToaster from '@/components/shop/ShopToaster';
import { fmtDate, fmtMoney } from '@/components/shop/format';
import type { OrderDetailData } from '@/components/shop/shop-types';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** 状态流转时间线：写订单 → 柜台结账 → 店主备货 → 寄出（已取消单走作废支线） */
function buildNodes(order: OrderDetailData): OrderTimelineNode[] {
  if (order.status === 'cancelled') {
    return [
      { label: '写订单', time: order.createdAt, state: 'done' },
      { label: '订单作废', time: null, state: 'current' },
    ];
  }
  const paid = !!order.paidAt;
  const shipped = !!order.shippedAt;
  return [
    { label: '写订单', time: order.createdAt, state: 'done' },
    { label: '柜台结账', time: order.paidAt, state: paid ? 'done' : 'current' },
    {
      label: '店主备货',
      time: null,
      state: shipped ? 'done' : paid ? 'current' : 'todo',
    },
    { label: '寄出', time: order.shippedAt, state: shipped ? 'done' : 'todo' },
  ];
}

export default function OrderDetail() {
  // 路由为 /orders/:id，路径段即订单号
  const { id: orderNo = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const {
    data: order,
    isLoading,
    error,
  } = trpc.order.detail.useQuery({ orderNo }, {
    enabled: isAuthenticated && !!orderNo,
    retry: false,
  });

  // 越权访问他人订单（后端 403/NOT_FOUND）：回订单列表 + Toast
  useEffect(() => {
    if (error) {
      navigate('/orders', { replace: true, state: { toast: '这张存根不在你的柜台上' } });
    }
  }, [error, navigate]);

  if (authLoading || !isAuthenticated || isLoading || !order) {
    return (
      <>
        <ShopToaster />
        <PageSkeleton rows={2} narrow />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-letter px-4 py-10 md:py-14">
      <ShopToaster />

      <Link
        to="/orders"
        className="link-underline-hand inline-flex items-center gap-1 text-sm text-slate transition-colors hover:text-wood"
      >
        <ArrowLeft size={15} /> 回订单列表
      </Link>

      {/* 订单存根大卡：纸面展开入场 */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0.7 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        style={{ transformOrigin: 'top center' }}
        className="card-postcard mt-4 p-6 md:p-8"
      >
        {/* 顶部：状态大字章 + 订单号 + 日期邮戳 */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <OrderStatusStamp status={order.status} size="lg" />
            <p className="mt-3 font-garamond text-xl tracking-wider text-ink">{order.orderNo}</p>
          </div>
          <Postmark date={fmtDate(order.createdAt)} size={84} className="opacity-80" />
        </div>

        {/* 状态时间线（竖排步骤条） */}
        <div className="mt-7">
          <OrderTimeline nodes={buildNodes(order)} />
        </div>

        {/* 商品快照清单 */}
        <div className="divider-sew mt-2 pt-6">
          <h3 className="font-hand text-xl text-wood">篮子里这些</h3>
          <ul className="mt-3 space-y-3">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3">
                <img
                  src="/product-placeholder.png"
                  alt=""
                  loading="lazy"
                  className="h-[72px] w-[72px] shrink-0 rounded-md object-cover sepia-[0.15]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{it.productName}</p>
                  <p className="mt-0.5 font-garamond text-sm text-slate">
                    ¥{fmtMoney(it.unitPrice)} × {it.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-garamond text-lg text-wood">
                  ¥{fmtMoney(it.unitPrice * it.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* 收货信息（信纸风排版） */}
        <div className="divider-sew mt-6 pt-6">
          <h3 className="font-hand text-xl text-wood">寄往</h3>
          <div className="kraft-lines mt-3 rounded-lg bg-cream/50 px-4 py-3 text-[15px] leading-8 text-ink" style={{ backgroundPosition: '0 12px' }}>
            <p>
              {order.receiver}
              <span className="ml-3 font-garamond text-slate">{order.phone}</span>
            </p>
            <p className="text-ink/85">{order.address}</p>
          </div>
        </div>

        {/* 金额块 */}
        <div className="divider-sew mt-6 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate">商品合计</span>
            <span className="font-garamond text-ink">¥{fmtMoney(order.totalAmount)}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-slate">运费</span>
            <span className="text-moss">店主骑车送 · 包邮</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-sm text-slate">
              {order.status === 'pending_pay' ? '应付' : '实付'}
            </span>
            <p className="font-garamond text-[28px] leading-none text-stamp">
              <span className="mr-0.5 align-top text-base">¥</span>
              <AnimMoney value={order.totalAmount} from={0} duration={0.4} />
            </p>
          </div>
        </div>

        {/* 底部操作 + 氛围行 */}
        <div className="divider-sew mt-6 pt-6">
          <OrderActionButtons
            orderNo={order.orderNo}
            status={order.status}
            items={order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))}
            showDetailLink={false}
          />
          <p className="mt-5 text-center text-xs tracking-[0.12em] text-slate">
            包裹从浪矢杂货店寄出 · 随附一张解忧卡片
          </p>
        </div>
      </motion.div>
    </div>
  );
}
