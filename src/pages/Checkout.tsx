import { Fragment, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { Check, PenLine, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AnimMoney from '@/components/shop/AnimMoney';
import PageSkeleton from '@/components/shop/PageSkeleton';
import ShopToaster from '@/components/shop/ShopToaster';
import { fmtMoney } from '@/components/shop/format';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const ADDR_KEY = 'namiya.address.v1';

interface SavedAddr {
  receiver: string;
  phone: string;
  region: string;
  detail: string;
}

interface BuyItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

type FieldKey = 'receiver' | 'phone' | 'address';

function readSavedAddr(): SavedAddr | null {
  try {
    const raw = localStorage.getItem(ADDR_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedAddr>;
    if (typeof v.receiver === 'string' && typeof v.phone === 'string') {
      return {
        receiver: v.receiver,
        phone: v.phone,
        region: typeof v.region === 'string' ? v.region : '',
        detail: typeof v.detail === 'string' ? v.detail : '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** 信纸风浮动标签输入：透明底 + 底部手划线，聚焦线变朱红、label 上浮 */
function FloatField({
  label,
  value,
  onChange,
  error,
  textarea = false,
  tel = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  textarea?: boolean;
  tel?: boolean;
}) {
  const id = useId();
  const cls =
    'peer w-full border-b border-[#B9A67F] bg-transparent px-1 py-2 text-[15px] text-ink placeholder-transparent transition-[border-color] duration-300 focus:border-b-2 focus:border-stamp focus:outline-none';
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      className="pt-3"
    >
      <div className="relative">
        {textarea ? (
          <textarea
            id={id}
            rows={2}
            placeholder=" "
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(cls, 'resize-none')}
          />
        ) : (
          <input
            id={id}
            placeholder=" "
            inputMode={tel ? 'tel' : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
          />
        )}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-1 top-2 text-[15px] text-slate/70 transition-all duration-300 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-stamp peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs"
        >
          {label}
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-moss">{error}</p>}
    </motion.div>
  );
}

export default function Checkout() {
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // 两种来源：?cart=<逗号分隔的 cartItemId>（购物车勾选）或 ?productId=&quantity=（立即购买）
  const cartIds = useMemo(() => {
    const raw = sp.get('cart');
    if (!raw) return null;
    const ids = raw
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0);
    return ids.length ? ids : null;
  }, [sp]);

  const directProductId = useMemo(() => {
    const n = Number(sp.get('productId'));
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [sp]);

  const directQty = useMemo(() => {
    const n = Number(sp.get('quantity'));
    return Number.isInteger(n) && n >= 1 ? Math.min(99, n) : 1;
  }, [sp]);

  const cartQuery = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated && !!cartIds,
  });
  const productQuery = trpc.shop.detail.useQuery(
    { id: directProductId ?? 0 },
    { enabled: isAuthenticated && !cartIds && !!directProductId, retry: false },
  );

  const sourceLoading = cartIds ? cartQuery.isLoading : directProductId ? productQuery.isLoading : false;

  const buyItems: BuyItem[] = useMemo(() => {
    if (cartIds) {
      return (cartQuery.data ?? [])
        .filter((i) => cartIds.includes(i.id))
        .map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        }));
    }
    const p = productQuery.data;
    if (!p) return [];
    return [
      { productId: p.id, name: p.name, price: p.price, quantity: directQty, imageUrl: p.imageUrl },
    ];
  }, [cartIds, cartQuery.data, productQuery.data, directQty]);

  // 收货信息表单
  const [saved] = useState<SavedAddr | null>(readSavedAddr);
  const [mode, setMode] = useState<'saved' | 'new'>(saved ? 'saved' : 'new');
  const [form, setForm] = useState<SavedAddr>({ receiver: '', phone: '', region: '', detail: '' });
  const [saveAddr, setSaveAddr] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const eff = mode === 'saved' && saved ? saved : form;
  const address = `${eff.region.trim()} ${eff.detail.trim()}`.trim();
  const phoneOk = /^[0-9+\-\s]{5,20}$/.test(eff.phone.trim());
  const formValid = eff.receiver.trim().length > 0 && phoneOk && address.length >= 5;

  const total = buyItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const createMut = trpc.order.create.useMutation();

  const setField = (k: keyof SavedAddr) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      if (!e.receiver && !e.phone && !e.address) return e;
      const next = { ...e };
      if (k === 'receiver') delete next.receiver;
      if (k === 'phone') delete next.phone;
      if (k === 'region' || k === 'detail') delete next.address;
      return next;
    });
  };

  const submit = () => {
    if (createMut.isPending) return;
    const next: Partial<Record<FieldKey, string>> = {};
    if (!eff.receiver.trim()) next.receiver = '收件人这一格还没写好';
    if (!phoneOk) next.phone = '手机号这一格还没写好';
    if (address.length < 5) next.address = '地址这一格还没写好，省市和门牌都要哦';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (!buyItems.length) {
      toast('这一单好像空了，回货架看看吧');
      return;
    }
    createMut.mutate(
      {
        items: buyItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        ...(cartIds ? { cartItemIds: cartIds } : {}),
        receiver: eff.receiver.trim(),
        phone: eff.phone.trim(),
        address,
      },
      {
        onSuccess: async (r) => {
          if (mode === 'saved' || saveAddr) {
            localStorage.setItem(
              ADDR_KEY,
              JSON.stringify({
                receiver: eff.receiver.trim(),
                phone: eff.phone.trim(),
                region: eff.region.trim(),
                detail: eff.detail.trim(),
              }),
            );
          }
          await utils.cart.invalidate();
          await utils.order.invalidate();
          navigate(`/pay/${r.orderNo}`);
        },
        onError: (e) => toast.error(e.message || '订单没写成，再试一次'),
      },
    );
  };

  if (authLoading || !isAuthenticated) {
    return (
      <>
        <ShopToaster />
        <PageSkeleton rows={2} />
      </>
    );
  }

  const steps = [
    { label: '① 点货', state: 'done' as const },
    { label: '② 写收货地址', state: 'current' as const },
    { label: '③ 柜台结账', state: 'todo' as const },
  ];

  return (
    <div className="mx-auto max-w-shop px-4 py-10 md:px-6 md:py-14">
      <ShopToaster />

      {/* Section 1 · 步骤指示（木牌三段，手绘虚线连接；窄屏允许换行防挤压） */}
      <div className="flex flex-wrap items-center justify-center gap-y-2">
        {steps.map((s, i) => (
          <Fragment key={s.label}>
            <motion.div
              initial={s.state === 'current' ? { opacity: 0.55 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm md:px-4',
                s.state === 'done' && 'border-vermilion/60 bg-vermilion/10 text-vermilion',
                s.state === 'current' && 'border-[#C9B48C] bg-lamp/25 text-wood shadow-paper',
                s.state === 'todo' && 'border-[#C9B48C]/70 text-slate/50',
              )}
            >
              {s.label}
            </motion.div>
            {i < steps.length - 1 && (
              <span aria-hidden className="mx-2 w-6 border-t-2 border-dashed border-[#B9A67F] md:w-12" />
            )}
          </Fragment>
        ))}
      </div>

      {sourceLoading ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="h-80 animate-pulse rounded-xl bg-kraft/80 lg:col-span-7" />
          <div className="h-80 animate-pulse rounded-xl bg-kraft/70 lg:col-span-5" />
        </div>
      ) : buyItems.length === 0 ? (
        /* 来源失效（参数缺失/商品或篮子条目不存在） */
        <div className="mt-12 flex flex-col items-center py-10 text-center">
          <img
            src="/product-placeholder.png"
            alt=""
            className="h-[160px] w-[160px] rounded-xl object-cover shadow-paper"
          />
          <h2 className="mt-6 font-hand text-3xl text-wood">这一单好像空了。</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate">
            {productQuery.isError
              ? '这件商品不在架上了，去看看别的吧。'
              : '篮子里的这些东西已经不在了，重新点一遍吧。'}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              to="/cart"
              className="inline-flex items-center rounded-lg bg-stamp px-7 py-2.5 text-sm text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95"
            >
              回购物篮
            </Link>
            <Link to="/products" className="link-underline-hand text-sm text-stamp">
              去货架看看 →
            </Link>
          </div>
        </div>
      ) : (
        /* Section 2 · 双栏（左表单 7 : 右摘要 5） */
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-12">
          {/* 左 · 收货信息 */}
          <section className="card-postcard p-5 md:p-6 lg:col-span-7">
            <h3 className="font-hand text-2xl text-wood">包裹寄往哪里？</h3>

            {/* 已存地址卡（localStorage 演示存储） */}
            {saved && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode('saved')}
                  className={cn(
                    'relative rounded-lg border p-3 text-left transition-all duration-300',
                    mode === 'saved'
                      ? 'border-vermilion bg-vermilion/5 shadow-[inset_0_0_0_1px_#B85C38]'
                      : 'border-[#C9B48C] hover:border-vermilion/60',
                  )}
                >
                  {mode === 'saved' && (
                    <motion.span
                      initial={{ scale: 1.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="absolute right-2 top-2 rounded-sm border border-stamp px-1 font-hand text-xs leading-5 text-stamp"
                      style={{ rotate: '-6deg' }}
                    >
                      常用
                    </motion.span>
                  )}
                  <p className="font-semibold text-ink">{saved.receiver}</p>
                  <p className="mt-0.5 font-garamond text-sm text-slate">{saved.phone}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate">
                    {saved.region} {saved.detail}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border border-dashed p-3 text-sm transition-colors duration-300',
                    mode === 'new'
                      ? 'border-vermilion text-wood'
                      : 'border-[#B9A67F] text-slate hover:text-wood',
                  )}
                >
                  <Plus size={15} /> 新地址
                </button>
              </div>
            )}

            {/* 新地址表单（字段 stagger 入场） */}
            {mode === 'new' && (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                className="mt-2 space-y-4"
              >
                <FloatField
                  label="收件人"
                  value={form.receiver}
                  onChange={setField('receiver')}
                  error={errors.receiver}
                />
                <FloatField
                  label="手机号"
                  value={form.phone}
                  onChange={setField('phone')}
                  error={errors.phone}
                  tel
                />
                <FloatField label="省 / 市 / 区" value={form.region} onChange={setField('region')} />
                <FloatField
                  label="详细地址（街道、门牌，越详细越好）"
                  value={form.detail}
                  onChange={setField('detail')}
                  error={errors.address}
                  textarea
                />
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <button
                    type="button"
                    aria-pressed={saveAddr}
                    aria-label="存为常用地址"
                    onClick={() => setSaveAddr((v) => !v)}
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-300',
                      saveAddr ? 'border-stamp bg-stamp text-cream' : 'border-[#B9A67F] text-transparent',
                    )}
                  >
                    <Check size={12} />
                  </button>
                  <span className="text-sm text-slate">存为常用地址，下次来就不用再写了</span>
                </motion.div>
              </motion.div>
            )}
          </section>

          {/* 右 · 订单摘要（sticky） */}
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="lg:sticky lg:top-[100px] lg:col-span-5"
          >
            <div className="card-postcard p-5 md:p-6">
              <h3 className="font-hand text-2xl text-wood">篮子里这些</h3>
              <ul className="mt-4 space-y-3">
                {buyItems.map((it) => (
                  <li key={it.productId} className="flex items-center gap-3">
                    <img
                      src={it.imageUrl ?? '/product-placeholder.png'}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-md object-cover sepia-[0.15]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] text-ink">{it.name}</p>
                      <p className="font-garamond text-xs text-slate">×{it.quantity}</p>
                    </div>
                    <p className="shrink-0 font-garamond text-base text-wood">
                      ¥{fmtMoney(it.price * it.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="divider-sew mt-4 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate">商品合计</span>
                  <span className="font-garamond text-ink">¥{fmtMoney(total)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate">运费</span>
                  <span className="text-moss">店主骑车送 · 包邮</span>
                </div>
                {/* 表单合法前合计 60% 透明，合法后提亮 */}
                <div
                  className={cn(
                    'mt-3 flex items-end justify-between transition-opacity duration-300',
                    !formValid && 'opacity-60',
                  )}
                >
                  <span className="text-sm text-slate">应付合计</span>
                  <p className="font-garamond text-[28px] leading-none text-stamp">
                    <span className="mr-0.5 align-top text-base">¥</span>
                    <AnimMoney value={total} duration={0.4} />
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={createMut.isPending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-stamp py-3 text-cream shadow-paper transition-all duration-500 ease-shop hover:translate-y-[1px] hover:brightness-95 disabled:opacity-60"
              >
                {createMut.isPending ? (
                  <>
                    <motion.span
                      animate={{ rotate: [0, -7, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <PenLine size={16} />
                    </motion.span>
                    正在写订单…
                  </>
                ) : (
                  '提交订单，去柜台结账'
                )}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-slate">
                包裹会用牛皮纸包好，从浪矢杂货店寄出。
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </div>
  );
}
