import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, Search, ShoppingBasket, Store, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShopSign from '@/components/shop/ShopSign';
import MilkBox from '@/components/shop/MilkBox';
import { useAuth } from '@/hooks/useAuth';
import { LOGIN_PATH } from '@/const';
import { trpc } from '@/providers/trpc';

const NAV_LINKS = [
  { to: '/products', label: '商城货架' },
  { to: '/letters', label: '解忧信箱' },
  { to: '/stories', label: '示例信件' },
  { to: '/about', label: '关于本店' },
];

/**
 * 木质顶部导航（sticky，正常文档流）。
 * 滚动超过 80px 从 64px 收缩至 52px 并加深投影（300ms）。
 * 移动端：汉堡 → 全屏牛皮纸抽屉菜单（右滑入 450ms，菜单项竖排 stagger）。
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout } = useAuth();

  const loggedIn = !!user;
  const { data: cartCount } = trpc.cart.count.useQuery(undefined, {
    enabled: loggedIn,
    retry: false,
  });
  const { data: unreadCount } = trpc.letter.unreadCount.useQuery(undefined, {
    enabled: loggedIn,
    retry: false,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) {
      setSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50">
      <nav
        className={cn(
          'wood-grain relative bg-wood text-cream transition-all duration-300 ease-shop',
          scrolled ? 'shadow-paper-deep' : 'shadow-paper',
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-shop items-center justify-between gap-4 px-4 transition-all duration-300 ease-shop md:px-6',
            scrolled ? 'h-[52px]' : 'h-16',
          )}
        >
          <ShopSign height={scrolled ? 38 : 46} className="transition-all duration-300" />

          {/* 桌面导航 */}
          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'link-underline-hand text-[15px] tracking-wide text-cream/90 transition-colors hover:text-lamp-glow',
                    isActive && 'text-lamp-glow',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="搜索"
              onClick={() => setSearchOpen((v) => !v)}
              className="text-cream/90 transition-colors hover:text-lamp-glow"
            >
              <Search size={20} />
            </button>
            {/* 牛奶箱（我的信件入口，角标=未读回信数） */}
            <Link to="/letters/mine" aria-label="我的信件" className="text-cream/90 transition-colors hover:text-lamp-glow">
              <MilkBox unread={unreadCount ?? 0} size={24} />
            </Link>
            {/* 购物车（角标=条目数） */}
            <Link to="/cart" aria-label="购物篮" className="relative text-cream/90 transition-colors hover:text-lamp-glow">
              <ShoppingBasket size={21} />
              {loggedIn && (cartCount ?? 0) > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-moss px-1 text-[10px] font-medium text-cream">
                  {cartCount}
                </span>
              )}
            </Link>
            {authLoading ? (
              <span className="hidden h-8 w-16 animate-pulse rounded-md bg-cream/10 sm:inline-flex" />
            ) : loggedIn ? (
              <div className="hidden items-center gap-3 sm:flex">
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1 text-sm text-lamp-glow transition-colors hover:text-lamp"
                  >
                    <Store size={15} /> 店主工作台
                  </Link>
                )}
                <span className="max-w-28 truncate text-sm text-cream/90">{user.name ?? '客人'}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  aria-label="退出登录"
                  className="text-cream/70 transition-colors hover:text-lamp-glow"
                >
                  <LogOut size={17} />
                </button>
              </div>
            ) : (
              <Link
                to={LOGIN_PATH}
                className="hidden rounded-md border border-lamp-glow/60 px-3 py-1.5 text-sm text-lamp-glow transition-colors hover:bg-lamp-glow/10 sm:inline-flex"
              >
                登录
              </Link>
            )}
            <button
              type="button"
              aria-label="打开菜单"
              className="text-cream/90 md:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* 木牌下挂式搜索条 */}
        <AnimatePresence>
          {searchOpen && (
            <motion.form
              onSubmit={submitSearch}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-cream/15 bg-wood"
            >
              <div className="mx-auto flex max-w-shop items-center gap-3 px-4 py-3 md:px-6">
                <Search size={17} className="shrink-0 text-lamp-glow" />
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="想在货架上找什么？"
                  className="w-full bg-transparent text-[15px] text-cream placeholder:text-cream/50 focus:outline-none"
                />
                <button type="submit" className="shrink-0 text-sm text-lamp-glow">
                  找找看
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </nav>

      {/* 移动端全屏牛皮纸抽屉菜单 */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[60] flex flex-col bg-kraft md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <ShopSign height={42} />
              <button type="button" aria-label="关闭菜单" onClick={() => setDrawerOpen(false)} className="text-wood">
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col items-center justify-center gap-8">
              {NAV_LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={l.to}
                    onClick={() => setDrawerOpen(false)}
                    className="font-hand text-3xl text-wood"
                    style={{ writingMode: 'vertical-rl', letterSpacing: '0.35em' }}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {loggedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      logout();
                    }}
                    className="rounded-md border border-wood/40 px-6 py-2.5 text-wood"
                  >
                    退出登录（{user.name ?? '客人'}）
                  </button>
                ) : (
                  <Link
                    to={LOGIN_PATH}
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-md bg-stamp px-6 py-2.5 text-cream"
                  >
                    登录
                  </Link>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
