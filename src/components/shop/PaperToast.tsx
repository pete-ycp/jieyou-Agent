import { AnimatePresence, motion } from 'framer-motion';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * 小纸笺提示：从顶部飘下（y -16→0 + rotate 1°，500ms），木棕底奶油字。
 * 受控组件：note 为 null 时收起，自动消失由调用方用 setTimeout 控制。
 */
export default function PaperToast({ note }: { note: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-24 z-[70] flex justify-center px-4">
      <AnimatePresence>
        {note && (
          <motion.div
            key={note}
            initial={{ y: -16, opacity: 0, rotate: 0 }}
            animate={{ y: 0, opacity: 1, rotate: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="max-w-sm rounded-lg bg-wood px-5 py-2.5 text-center text-sm text-cream shadow-paper-deep"
          >
            {note}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
