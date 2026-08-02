import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 回信倒计时（EB Garamond 数字）：目标 = 投信时间 + 24h */
export default function CountdownTag({
  target,
  prefix = '回信倒计时',
  expiredText = '回信时间已到，去牛奶箱看看吧',
  className,
}: {
  target: Date | string | number;
  prefix?: string;
  expiredText?: string;
  className?: string;
}) {
  const targetMs = (target instanceof Date ? target : new Date(target)).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remain = targetMs - now;

  if (remain <= 0) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-moss', className)}>
        <Clock3 size={13} />
        {expiredText}
      </span>
    );
  }

  const h = Math.floor(remain / 3600000);
  const m = Math.floor((remain % 3600000) / 60000);
  const s = Math.floor((remain % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-wood', className)}>
      <Clock3 size={13} className="text-lamp" />
      {prefix}
      <span className="font-garamond text-sm tabular-nums tracking-wider text-stamp">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </span>
  );
}
