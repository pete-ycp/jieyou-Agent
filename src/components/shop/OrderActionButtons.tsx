import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { cn } from '@/lib/utils';

const CTA_PRIMARY =
  'inline-flex items-center rounded-lg bg-stamp px-4 py-2 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95';
const CTA_OUTLINE =
  'inline-flex items-center rounded-lg border border-stamp px-4 py-2 text-sm text-stamp transition-all duration-500 ease-shop hover:bg-stamp/5 disabled:opacity-50';
const TEXT_LINK =
  'link-underline-hand text-sm text-slate transition-colors duration-300 hover:text-vermilion';

/**
 * 订单操作钮组（订单列表卡与订单详情页共用）：
 * 待支付 → 去柜台结账 + 取消订单（纸感确认弹层）；待发货 → 查看详情；
 * 已完成 → 查看详情 + 再买一单；已取消 → 仅查看详情。
 */
export default function OrderActionButtons({
  orderNo,
  status,
  items,
  showDetailLink = true,
  className,
}: {
  orderNo: string;
  status: string;
  /** 「再买一单」用：订单商品快照（无则隐藏该钮） */
  items?: { productId: number; quantity: number }[];
  showDetailLink?: boolean;
  className?: string;
}) {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rebuying, setRebuying] = useState(false);

  const cancelMut = trpc.order.cancel.useMutation({
    onSuccess: async () => {
      setConfirmOpen(false);
      await utils.order.invalidate();
      toast('这单已作废，商品放回货架了。');
    },
    onError: (e) => {
      setConfirmOpen(false);
      toast.error(e.message || '没取消成，再试一次');
    },
  });

  const addMut = trpc.cart.add.useMutation();

  const rebuy = async () => {
    if (!items?.length || rebuying) return;
    setRebuying(true);
    try {
      for (const it of items) {
        await addMut.mutateAsync({ productId: it.productId, quantity: it.quantity });
      }
      await utils.cart.invalidate();
      toast('已放回篮子，去结账吧。');
      navigate('/cart');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '有商品放不回去了');
    } finally {
      setRebuying(false);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {status === 'pending_pay' && (
        <>
          <Link to={`/pay/${orderNo}`} className={CTA_PRIMARY}>
            去柜台结账
          </Link>
          <button type="button" onClick={() => setConfirmOpen(true)} className={TEXT_LINK}>
            取消订单
          </button>
        </>
      )}
      {(status === 'done' || status === 'shipped') && items && items.length > 0 && (
        <button type="button" onClick={rebuy} disabled={rebuying} className={CTA_OUTLINE}>
          {rebuying ? '正在放回篮子…' : '再买一单'}
        </button>
      )}
      {showDetailLink && (
        <Link to={`/orders/${orderNo}`} className={TEXT_LINK}>
          查看详情
        </Link>
      )}

      {/* 取消确认：纸感弹层「这单就不要了？」 */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setConfirmOpen(false)}
              className="absolute inset-0 cursor-default bg-night/45"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: 1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="card-postcard relative w-full max-w-sm p-6"
            >
              <p className="font-hand text-2xl text-wood">这单就不要了？</p>
              <p className="mt-2 text-sm leading-6 text-slate">
                柜台会把这张单子作废，商品会放回货架。
              </p>
              <div className="mt-5 flex items-center justify-end gap-4">
                <button type="button" onClick={() => setConfirmOpen(false)} className={TEXT_LINK}>
                  先留着
                </button>
                <button
                  type="button"
                  disabled={cancelMut.isPending}
                  onClick={() => cancelMut.mutate({ orderNo })}
                  className={CTA_PRIMARY}
                >
                  {cancelMut.isPending ? '正在作废…' : '不要了'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
