import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import CategorySeal from '@/components/shop/CategorySeal';
import type { CategoryKey } from '@/components/shop/CategorySeal';
import Postmark from '@/components/shop/Postmark';

export interface Story {
  id: string;
  penName: string;
  category: CategoryKey;
  excerpt: string;
  date: string;
}

/**
 * 明信片卡（双线框）：示例信件摘要。
 * hover：上浮 4px + 邮戳图案淡入右上角（300ms）。
 */
export default function PostcardCard({
  story,
  to,
  className,
}: {
  story: Story;
  to?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <CategorySeal category={story.category} size={44} />
        <Postmark date={story.date} size={64} className="opacity-0 transition-opacity duration-300 group-hover:opacity-80" />
      </div>
      <h4 className="mt-3 font-hand text-xl text-wood">{story.penName}</h4>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/85">{story.excerpt}</p>
      <p className="mt-3 text-sm text-stamp">读这封回信 →</p>
    </>
  );
  const cls = cn(
    'group card-postcard block p-5 transition-all duration-500 ease-shop hover:-translate-y-1 hover:shadow-paper-deep',
    className,
  );
  return to ? (
    <Link to={to} className={cls}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
