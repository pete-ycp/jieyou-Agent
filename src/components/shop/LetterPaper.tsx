import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Postmark from '@/components/shop/Postmark';

/**
 * 信纸容器：横线纹理 + 右上角邮戳 + 落款「浪矢杂货店」手写体。
 */
export default function LetterPaper({
  children,
  date,
  signature = '浪矢杂货店',
  lines = true,
  className,
}: {
  children: ReactNode;
  date?: string;
  signature?: string;
  /** 是否铺信纸淡横线 */
  lines?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative rounded-md bg-cream p-8 shadow-paper md:px-10',
        lines && 'kraft-lines',
        className,
      )}
      style={{ border: '1px solid #D9C9A8' }}
    >
      {date && (
        <div className="absolute right-5 top-5 opacity-80">
          <Postmark date={date} size={76} />
        </div>
      )}
      <div className="text-[17px] leading-8 text-ink">{children}</div>
      {signature && (
        <p className="mt-8 text-right font-hand text-2xl text-wood">{signature}</p>
      )}
    </div>
  );
}
