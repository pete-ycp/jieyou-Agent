import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  note: string;
  soldOut?: boolean;
}

/**
 * 商品卡：仿旧明信片风（牛皮纸底、双线框、圆角 12）。
 * hover：上浮 6px + 背后暖光晕 + 商品图 1.03 倍缓慢推近（600ms）。
 */
export default function ProductCard({ product, className }: { product: Product; className?: string }) {
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
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={cn(
            'h-full w-full object-cover sepia-[0.18] transition-transform duration-600 ease-shop group-hover:scale-[1.03]',
            product.soldOut && 'grayscale',
          )}
        />
        {product.soldOut && (
          <span
            className="absolute right-3 top-3 rounded-sm border-2 border-stamp px-2 py-0.5 font-hand text-lg text-stamp"
            style={{ transform: 'rotate(-12deg)' }}
          >
            售罄
          </span>
        )}
      </div>
      <div className="relative px-1 pb-1 pt-3">
        <h4 className="truncate text-lg font-semibold text-ink">{product.name}</h4>
        <p className="mt-1 font-garamond text-xl text-wood transition-all duration-500 group-hover:italic">
          <span className="mr-0.5 align-top text-sm">¥</span>
          {product.price.toFixed(2)}
        </p>
        <p className="mt-1 truncate font-hand text-sm text-wood/85">「{product.note}」</p>
      </div>
    </Link>
  );
}
