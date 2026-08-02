import { cn } from '@/lib/utils';

/** 页面加载骨架：牛皮纸色脉冲块（登录态/数据加载期间占位） */
export default function PageSkeleton({
  rows = 3,
  narrow = false,
  className,
}: {
  rows?: number;
  /** 窄栏（720px，订单详情/收银台用） */
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto px-4 py-10 md:px-6', narrow ? 'max-w-letter' : 'max-w-shop', className)}>
      <div className="h-10 w-44 animate-pulse rounded-md bg-kraft" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded bg-kraft/70" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-kraft/80" />
        ))}
      </div>
    </div>
  );
}
