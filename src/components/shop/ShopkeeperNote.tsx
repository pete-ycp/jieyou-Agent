import { cn } from '@/lib/utils';

/** 店主手记：手写体 + 左侧 2px 朱红竖线 + 微倾 -0.5° */
export default function ShopkeeperNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <blockquote
      className={cn('border-l-2 border-vermilion pl-3 font-hand text-wood', className)}
      style={{ transform: 'rotate(-0.5deg)' }}
    >
      {children}
    </blockquote>
  );
}
