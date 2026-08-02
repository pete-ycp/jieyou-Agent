import { AnimatePresence, motion } from 'framer-motion';
import { Sun } from 'lucide-react';
import { useDayNight } from '@/hooks/useDayNight';
import NightLamp from '@/components/shop/NightLamp';

/**
 * 昼夜状态条（导航下方通栏 32px）。
 * 日间：牛皮纸底「营业中 08:30–20:00 · 货架开放，欢迎咨询」；
 * 夜间：深夜蓝底「打烊后，信箱投递口开放 · 明早 8:30 牛奶箱取回信」。
 * 右侧永远是灯笼切换钮（手动选择写入 localStorage 覆盖自动）。
 */
export default function DayNightBar() {
  const { isNight, toggle } = useDayNight();

  return (
    <div
      className={
        isNight
          ? 'bg-night text-night-text transition-colors duration-1200'
          : 'bg-kraft text-wood transition-colors duration-1200'
      }
    >
      <div className="mx-auto flex h-8 max-w-shop items-center justify-between gap-3 px-4 text-xs tracking-wider md:px-6">
        <div className="relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {isNight ? <NightLamp on size={16} /> : <Sun size={14} className="shrink-0 text-lamp" />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isNight ? 'night' : 'day'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="truncate"
            >
              {isNight
                ? '打烊后，信箱投递口开放 · 明早 8:30 牛奶箱取回信'
                : '营业中 08:30–20:00 · 货架开放，欢迎咨询'}
            </motion.span>
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={isNight ? '切换到日间' : '切换到夜间'}
          className="shrink-0 rounded-full p-0.5 transition-transform duration-500 hover:scale-110"
        >
          <NightLamp on={isNight} size={20} />
        </button>
      </div>
    </div>
  );
}
