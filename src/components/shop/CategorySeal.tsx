import { cn } from '@/lib/utils';

export const CATEGORIES = {
  love: { label: '爱情', src: '/cat-love.svg' },
  dream: { label: '梦想', src: '/cat-dream.svg' },
  family: { label: '家庭', src: '/cat-family.svg' },
  career: { label: '事业', src: '/cat-career.svg' },
  life: { label: '人生方向', src: '/cat-life.svg' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

/** 五分类印章：朱红圆章风 icon（爱情/梦想/家庭/事业/人生方向） */
export default function CategorySeal({
  category,
  size = 48,
  withLabel = false,
  className,
}: {
  category: CategoryKey;
  size?: number;
  withLabel?: boolean;
  className?: string;
}) {
  const cat = CATEGORIES[category];
  return (
    <span className={cn('inline-flex flex-col items-center gap-1', className)}>
      <img src={cat.src} alt={cat.label} width={size} height={size} loading="lazy" />
      {withLabel && <span className="text-xs tracking-[0.12em] text-stamp">{cat.label}</span>}
    </span>
  );
}
