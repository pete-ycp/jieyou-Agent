import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fmtDateTime } from '@/components/shop/format';

export interface OrderTimelineNode {
  label: string;
  time?: Date | string | null;
  state: 'done' | 'current' | 'todo';
}

/**
 * 订单状态时间线（竖排步骤条）：
 * 已完成节点=朱红实心点 + 时间；当前节点=暖黄呼吸点；未至=灰。
 * 节点自上而下逐个"盖章"入场（stagger 0.2s）。
 */
export default function OrderTimeline({
  nodes,
  className,
}: {
  nodes: OrderTimelineNode[];
  className?: string;
}) {
  return (
    <ol className={cn('relative', className)}>
      {nodes.map((n, i) => (
        <motion.li
          key={n.label}
          initial={{ opacity: 0, scale: 1.25 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-start gap-3 pb-6 pl-1 last:pb-0"
        >
          {i < nodes.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[10px] top-5 h-[calc(100%-14px)] w-px bg-[#C9B48C]"
            />
          )}
          <span
            aria-hidden
            className={cn(
              'relative z-10 mt-1 h-[14px] w-[14px] shrink-0 rounded-full border-2',
              n.state === 'done' && 'border-stamp bg-stamp',
              n.state === 'current' && 'animate-lamp-breathe border-lamp bg-lamp/70 shadow-glow',
              n.state === 'todo' && 'border-slate/40 bg-transparent',
            )}
          />
          <div>
            <p className={cn('text-[15px] leading-6', n.state === 'todo' ? 'text-slate/60' : 'text-ink')}>
              {n.label}
            </p>
            {n.time && (
              <p className="font-garamond text-xs tracking-wide text-slate">{fmtDateTime(n.time)}</p>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
