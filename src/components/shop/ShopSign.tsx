import { Link } from 'react-router';
import { cn } from '@/lib/utils';

/** 褪色老招牌（Navbar / 页脚 logo），点击回首页 */
export default function ShopSign({ className, height = 44 }: { className?: string; height?: number }) {
  return (
    <Link to="/" aria-label="解忧杂货店 · 回首页" className={cn('inline-flex shrink-0', className)}>
      <img src="/logo-sign.svg" alt="解忧杂货店" style={{ height }} className="w-auto drop-shadow" />
    </Link>
  );
}
