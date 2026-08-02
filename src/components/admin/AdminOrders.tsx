import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ADMIN_TABLE,
  ADMIN_TD,
  ADMIN_TH,
  ADMIN_THEAD_ROW,
  ADMIN_TR,
  AdminSectionTitle,
  StatusSeal,
  fmtDateTime,
  orderStatusLabel,
  type AdminOrder,
} from './helpers';

const STATUS_TONE: Record<string, 'moss' | 'slate' | 'stamp' | 'lamp'> = {
  pending_pay: 'lamp',
  paid: 'stamp',
  shipped: 'moss',
  done: 'moss',
  cancelled: 'slate',
};

const TABS = [
  { value: 'all', label: '全部' },
  { value: 'pending_pay', label: '待支付' },
  { value: 'paid', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'done', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

/** 订单柜台：状态筛选 + 展开收货详情 + 待发货「寄出」 */
export default function AdminOrders() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.orders.useQuery({});
  const orders = (data ?? []) as AdminOrder[];

  const [tab, setTab] = useState('all');
  const [expandedNo, setExpandedNo] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(
    () => (tab === 'all' ? orders : orders.filter((o) => o.status === tab)),
    [orders, tab],
  );

  const shipMutation = trpc.admin.shipOrder.useMutation({
    onSuccess: (_d, vars) => {
      toast.success(`包裹 ${vars.orderNo} 已从浪矢杂货店寄出。`);
      utils.admin.invalidate();
    },
    onError: (e) => toast.error(e.message || '寄出失败，请再试一次'),
  });

  const ship = (o: AdminOrder) => {
    if (!window.confirm(`确认寄出订单 ${o.orderNo} 吗？收件人：${o.receiver}`)) return;
    shipMutation.mutate({ orderNo: o.orderNo });
  };

  return (
    <section>
      <AdminSectionTitle title="订单柜台" note="每一笔订单，都像一封要寄出的信。" />

      {/* 状态 Tab（带计数） */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              tab === t.value
                ? 'border-wood bg-wood text-cream'
                : 'border-[#C9B48C] bg-cream/60 text-wood hover:bg-lamp/15',
            )}
          >
            {t.label}
            <span className="ml-1.5 font-garamond text-xs opacity-80">
              {counts[t.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="card-postcard overflow-x-auto p-4">
        <table className={ADMIN_TABLE}>
          <thead>
            <tr className={ADMIN_THEAD_ROW}>
              <th className={ADMIN_TH}>订单号</th>
              <th className={ADMIN_TH}>收件人</th>
              <th className={ADMIN_TH}>金额</th>
              <th className={ADMIN_TH}>下单时间</th>
              <th className={ADMIN_TH}>状态</th>
              <th className={`${ADMIN_TH} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate">
                  正在翻柜台账本…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate">
                  这一页账本还空着。
                </td>
              </tr>
            )}
            {filtered.map((o, i) => {
              const expanded = expandedNo === o.orderNo;
              return (
                <OrderRows
                  key={o.orderNo}
                  order={o}
                  index={i}
                  expanded={expanded}
                  onToggle={() => setExpandedNo(expanded ? null : o.orderNo)}
                  onShip={() => ship(o)}
                  shipping={shipMutation.isPending}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderRows({
  order: o,
  index,
  expanded,
  onToggle,
  onShip,
  shipping,
}: {
  order: AdminOrder;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onShip: () => void;
  shipping: boolean;
}) {
  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(ADMIN_TR, 'cursor-pointer')}
        onClick={onToggle}
      >
        <td className={`${ADMIN_TD} font-garamond text-base`}>{o.orderNo}</td>
        <td className={ADMIN_TD}>{o.receiver}</td>
        <td className={`${ADMIN_TD} font-garamond text-lg`}>
          <span className="text-xs">¥</span>
          {o.totalAmount.toFixed(2)}
        </td>
        <td className={`${ADMIN_TD} font-garamond text-slate`}>{fmtDateTime(o.createdAt)}</td>
        <td className={ADMIN_TD}>
          <StatusSeal tone={STATUS_TONE[o.status] ?? 'slate'}>
            {orderStatusLabel(o.status)}
          </StatusSeal>
        </td>
        <td className={`${ADMIN_TD} text-right`}>
          <div className="inline-flex items-center gap-2">
            {o.status === 'paid' && (
              <Button
                size="sm"
                disabled={shipping}
                onClick={(e) => {
                  e.stopPropagation();
                  onShip();
                }}
                className="bg-stamp text-cream hover:bg-stamp/90"
              >
                <PackageCheck size={14} /> 寄出
              </Button>
            )}
            <ChevronDown
              size={16}
              className={cn('text-slate transition-transform duration-300', expanded && 'rotate-180')}
            />
          </div>
        </td>
      </motion.tr>
      {expanded && (
        <tr className="border-b border-[#C9B48C]/60 bg-lamp/5">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs tracking-[0.12em] text-slate">收货信息</p>
                <p className="mt-1 text-ink">
                  {o.receiver} · {o.phone}
                </p>
                <p className="mt-0.5 text-ink">{o.address}</p>
              </div>
              <div>
                <p className="text-xs tracking-[0.12em] text-slate">柜台账本</p>
                <p className="mt-1 font-garamond text-slate">下单 {fmtDateTime(o.createdAt)}</p>
                {o.paidAt && (
                  <p className="font-garamond text-slate">支付 {fmtDateTime(o.paidAt)}</p>
                )}
                {o.shippedAt && (
                  <p className="font-garamond text-slate">寄出 {fmtDateTime(o.shippedAt)}</p>
                )}
              </div>
              <div>
                <p className="text-xs tracking-[0.12em] text-slate">备注</p>
                <p className="mt-1 text-slate">
                  {o.status === 'paid'
                    ? '货已包好，等快递员上门。'
                    : o.status === 'pending_pay'
                      ? '客人还没来柜台结账。'
                      : '这一单记完了。'}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
