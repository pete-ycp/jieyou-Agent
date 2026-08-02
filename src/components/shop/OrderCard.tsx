import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { trpc } from '@/providers/trpc';
import { cn } from '@/lib/utils';
import Postmark from '@/components/shop/Postmark';
import OrderStatusStamp from '@/components/shop/OrderStatusStamp';
import OrderActionButtons from '@/components/shop/OrderActionButtons';
import { fmtDate, fmtMoney } from '@/components/shop/format';
import type { OrderSummary } from '@/components/shop/shop-types';

/**
 * 订单明信片大卡（列表页用）：
 * 卡头=订单号 + 日期邮戳 + 状态章；卡体=商品快照行（超 3 条折叠「等 N 件」）；
 * 卡脚=合计 + 按状态的操作钮。已取消订单整卡置灰（不移除）。
 * 快照数据由卡片自取 order.detail（react-query 缓存，进详情页秒开）。
 */
export default function OrderCard({
  order,
  index,
}: {
  order: OrderSummary;
  index: number;
}) {
  const { data: detail } = trpc.order.detail.useQuery(
    { orderNo: order.orderNo },
    { staleTime: 60_000 },
  );
  const items = detail?.items ?? [];
  const shown = items.slice(0, 3);
  const cancelled = order.status === 'cancelled';

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: Math.min(index, 6) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={cn('card-postcard p-5 md:p-6', cancelled && 'opacity-70 saturate-50')}
    >
      {/* 卡头 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/orders/${order.orderNo}`}
            className="link-underline-hand truncate font-garamond text-lg tracking-wider text-wood"
          >
            {order.orderNo}
          </Link>
          <Postmark date={fmtDate(order.createdAt)} size={54} className="shrink-0 opacity-70" />
        </div>
        <OrderStatusStamp status={order.status} />
      </div>

      {/* 卡体：商品快照 */}
      <div className="mt-4 space-y-2.5">
        {items.length === 0 && (
          <>
            <div className="h-10 animate-pulse rounded-md bg-cream/70" />
            <div className="h-10 w-2/3 animate-pulse rounded-md bg-cream/60" />
          </>
        )}
        {shown.map((it) => (
          <div key={it.id} className="flex items-center gap-3">
            <img
              src="/product-placeholder.png"
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-md object-cover sepia-[0.15]"
            />
            <p className="min-w-0 flex-1 truncate text-[15px] text-ink">{it.productName}</p>
            <p className="shrink-0 font-garamond text-sm text-slate">×{it.quantity}</p>
          </div>
        ))}
        {items.length > shown.length && (
          <p className="pl-1 text-sm text-slate">…等 {items.length} 件</p>
        )}
      </div>

      {/* 卡脚 */}
      <div className="divider-sew mt-4 flex flex-wrap items-center justify-between gap-3 pt-4">
        <p className="font-garamond text-[22px] leading-none text-stamp">
          <span className="mr-0.5 align-top text-sm">¥</span>
          {fmtMoney(order.totalAmount)}
        </p>
        <OrderActionButtons
          orderNo={order.orderNo}
          status={order.status}
          items={items.map((i) => ({ productId: i.productId, quantity: i.quantity }))}
        />
      </div>
    </motion.article>
  );
}
