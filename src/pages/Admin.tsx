import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookOpen, CornerUpLeft, Mail, Package, ReceiptText, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/const';
import { trpc } from '@/providers/trpc';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminLetters from '@/components/admin/AdminLetters';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminContents from '@/components/admin/AdminContents';
import { replyDeadline, type AdminLetter } from '@/components/admin/helpers';

type TabKey = 'products' | 'letters' | 'orders' | 'contents';

const TABS: { key: TabKey; label: string; icon: typeof Package }[] = [
  { key: 'products', label: '货架管理', icon: Package },
  { key: 'letters', label: '回信工作台', icon: Mail },
  { key: 'orders', label: '订单柜台', icon: ReceiptText },
  { key: 'contents', label: '内容架', icon: BookOpen },
];

/**
 * 店主工作台（/admin/*）：单页内 Tab 切换四个工作台。
 * 权限守卫：未登录 → 跳登录；非 admin → 温和 403。
 */
export default function Admin() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('letters');

  const isAdmin = !!user && user.role === 'admin';

  useEffect(() => {
    if (!isLoading && !user) navigate(LOGIN_PATH);
  }, [isLoading, user, navigate]);

  // 待回数 / 超时数角标
  const { data: pendingData } = trpc.admin.letters.useQuery(
    { filter: 'pending' },
    { enabled: isAdmin, retry: false },
  );
  const pendingLetters = (pendingData ?? []) as AdminLetter[];
  const pendingCount = pendingLetters.length;
  const overdueCount = pendingLetters.filter((l) => replyDeadline(l.createdAt).overdue).length;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-shop px-4 py-24 text-center">
        <p className="font-hand text-2xl text-wood">店主正在点灯…</p>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-letter flex-col items-center px-4 py-24 text-center">
        <div className="card-postcard w-full p-10">
          <p className="font-hand text-3xl text-wood">只有店主能进到这里</p>
          <p className="mt-4 leading-8 text-slate">
            后间的台灯还亮着，但那是店主写回信的地方。
            <br />
            如果你有烦恼，卷帘门上的投递口一直为你开着。
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/letters/new"
              className="rounded-md bg-stamp px-5 py-2.5 text-cream transition-colors hover:bg-stamp/90"
            >
              去写一封信
            </Link>
            <Link
              to="/"
              className="rounded-md border border-wood/40 px-5 py-2.5 text-wood transition-colors hover:bg-lamp/10"
            >
              回到店门口
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 md:px-6">
      <Toaster position="top-center" />

      {/* 页头 */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-hand text-4xl text-wood">店主的后间</h1>
          <p className="mt-1 text-sm text-slate">
            台灯、账本与牛奶箱——打烊之后的正经事都在这里。
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-wood underline decoration-dotted underline-offset-4 hover:text-stamp"
        >
          <CornerUpLeft size={14} /> 回前台看看
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        {/* 左侧木棕窄侧栏 */}
        <aside className="wood-grain hidden h-fit rounded-xl bg-wood p-3 shadow-paper md:block">
          <nav className="flex flex-col gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[15px] transition-all duration-300 ease-shop',
                    active ? 'bg-lamp/20 text-lamp-glow' : 'text-cream/80 hover:bg-cream/10 hover:text-cream',
                  )}
                >
                  <Icon size={17} />
                  {t.label}
                  {t.key === 'letters' && pendingCount > 0 && (
                    <span className="ml-auto flex items-center gap-1">
                      {overdueCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-stamp px-1 text-[11px] font-medium text-cream">
                          {overdueCount}
                        </span>
                      )}
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-moss px-1 text-[11px] font-medium text-cream">
                        {pendingCount}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
            <div className="my-2 border-t border-cream/15" />
            <Link
              to="/"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream"
            >
              <Store size={17} /> 回前台
            </Link>
          </nav>
        </aside>

        {/* 移动端顶部 Tab 条 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors',
                  active ? 'border-wood bg-wood text-cream' : 'border-[#C9B48C] bg-cream/60 text-wood',
                )}
              >
                <Icon size={15} />
                {t.label}
                {t.key === 'letters' && pendingCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-stamp px-1 text-[10px] text-cream">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        <main className="min-w-0">
          {tab === 'products' && <AdminProducts />}
          {tab === 'letters' && <AdminLetters />}
          {tab === 'orders' && <AdminOrders />}
          {tab === 'contents' && <AdminContents />}
        </main>
      </div>
    </div>
  );
}
