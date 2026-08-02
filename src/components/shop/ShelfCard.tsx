import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { ShoppingBasket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRODUCT_CATEGORIES } from '@contracts/labels';

/** 货架商品（trpc shop.list / shop.detail 返回行的最小消费面） */
export interface ShelfProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  keeperNote: string | null;
  status?: string;
}

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.value, c.label]),
);

/** 命中关键词以暖黄底色高亮（搜索页用） */
export function highlightName(name: string, keyword?: string): ReactNode {
  const kw = keyword?.trim();
  if (!kw) return name;
  const idx = name.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="rounded-sm bg-lamp/40 px-0.5 text-inherit">
        {name.slice(idx, idx + kw.length)}
      </mark>
      {name.slice(idx + kw.length)}
    </>
  );
}

/**
 * 货架商品卡（/products 与 /search 共用完整规格）：
 * 仿旧明信片卡 + 4:3 图区 + 分类小签 + 售罄朱红斜章；
 * hover 卡片上浮、背后暖光晕、商品图缓慢推近，卡底滑上「加入购物篮」快捷条（售罄不显示）。
 */
export default function ShelfCard({
  product,
  highlight,
  onQuickAdd,
  className,
}: {
  product: ShelfProduct;
  highlight?: string;
  onQuickAdd?: (product: ShelfProduct) => void;
  className?: string;
}) {
  const soldOut = product.stock <= 0 || (product.status !== undefined && product.status !== 'on_sale');

  const handleQuickAdd = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickAdd?.(product);
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className={cn(
        'group card-postcard relative block overflow-hidden p-3 transition-all duration-600 ease-shop',
        'hover:-translate-y-1.5 hover:shadow-paper-deep active:translate-y-[1px]',
        className,
      )}
    >
      {/* 背后暖光晕 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-600 ease-shop group-hover:opacity-100"
        style={{ background: 'radial-gradient(70% 55% at 50% 38%, rgba(242,185,92,.22), transparent 75%)' }}
      />

      <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: '4/3' }}>
        <img
          src={product.imageUrl || '/product-placeholder.png'}
          alt={product.name}
          loading="lazy"
          className={cn(
            'h-full w-full object-cover sepia-[0.18] transition-transform duration-600 ease-shop group-hover:scale-[1.03]',
            soldOut && 'grayscale-[0.5] opacity-80',
          )}
        />
        {/* 分类小签（苔绿底奶油字） */}
        <span className="absolute left-2.5 top-2.5 rounded-sm bg-moss px-1.5 py-0.5 text-[12px] leading-none tracking-[0.12em] text-cream shadow-paper">
          {CATEGORY_LABELS[product.category] ?? '杂货'}
        </span>
        {/* 售罄朱红斜章 */}
        {soldOut && (
          <span
            className="absolute right-3 top-3 rounded-sm border-2 border-stamp bg-cream/70 px-2 py-0.5 font-hand text-lg leading-none text-stamp"
            style={{ transform: 'rotate(-12deg)' }}
          >
            售罄
          </span>
        )}
        {/* 卡底快捷条：hover 自卡底滑上（售罄不显示） */}
        {!soldOut && onQuickAdd && (
          <div className="absolute inset-x-0 bottom-0 flex translate-y-full justify-end bg-gradient-to-t from-ink/45 to-transparent p-2.5 pt-6 transition-transform duration-[350ms] ease-shop group-hover:translate-y-0">
            <button
              type="button"
              aria-label={`把「${product.name}」加入购物篮`}
              onClick={handleQuickAdd}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stamp text-cream shadow-paper transition-all duration-400 ease-shop hover:translate-y-[1px] hover:brightness-95"
            >
              <ShoppingBasket size={17} />
            </button>
          </div>
        )}
      </div>

      <div className="relative px-1 pb-1 pt-3">
        <h4 className="line-clamp-2 text-lg font-semibold leading-[26px] text-ink">
          {highlightName(product.name, highlight)}
        </h4>
        <p className="mt-1 font-garamond text-xl text-wood transition-all duration-500 group-hover:italic">
          <span className="mr-0.5 align-top text-sm">¥</span>
          {product.price.toFixed(2)}
        </p>
        {product.keeperNote && (
          <p className="mt-1 truncate font-hand text-sm text-wood/85">「{product.keeperNote}」</p>
        )}
      </div>
    </Link>
  );
}
