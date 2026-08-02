import { Link } from 'react-router';
import type { ReactNode } from 'react';

/** 空状态：牛奶箱插画 + 文案 + CTA */
export default function EmptyState({
  title,
  description,
  ctaTo,
  ctaLabel,
  hasLetter = false,
  children,
}: {
  title: string;
  description?: string;
  ctaTo?: string;
  ctaLabel?: string;
  hasLetter?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <img
        src={hasLetter ? '/milkbox-letter.png' : '/milkbox-empty.png'}
        alt="牛奶箱"
        className="h-44 w-44 rounded-xl object-cover shadow-paper"
        loading="lazy"
      />
      <p className="font-hand text-2xl text-wood">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate">{description}</p>}
      {ctaTo && ctaLabel && (
        <Link
          to={ctaTo}
          className="mt-2 inline-flex items-center rounded-lg bg-stamp px-6 py-2.5 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
        >
          {ctaLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
