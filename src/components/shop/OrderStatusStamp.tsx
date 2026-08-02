import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending_pay: { label: '待结账', className: 'border-lamp bg-lamp/10 text-lamp' },
  paid: { label: '店主备货中', className: 'border-moss bg-moss/10 text-moss' },
  shipped: { label: '已寄出', className: 'border-slate bg-slate/10 text-slate' },
  done: { label: '已寄达', className: 'border-slate bg-slate/10 text-slate' },
  cancelled: { label: '已作废', className: 'border-slate/50 bg-transparent text-slate/60' },
};

/**
 * 订单状态章：微斜的手盖章（-6°），颜色按状态区分——
 * 待支付=暖黄 / 待发货=苔绿 / 已完成=青灰 / 已取消=灰。
 */
export default function OrderStatusStamp({
  status,
  size = 'sm',
  className,
}: {
  status: string;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const s = STATUS_STYLE[status] ?? { label: status, className: 'border-slate text-slate' };
  return (
    <span
      className={cn(
        'inline-block select-none rounded-sm border-2 font-hand leading-none',
        size === 'sm' ? 'px-2 py-1 text-base' : 'px-3.5 py-2 text-2xl',
        s.className,
        className,
      )}
      style={{ transform: 'rotate(-6deg)' }}
    >
      {s.label}
    </span>
  );
}
