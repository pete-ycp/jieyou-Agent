import { Link } from 'react-router';
import ShopSign from '@/components/shop/ShopSign';

const NAV = [
  { to: '/products', label: '商城货架' },
  { to: '/letters', label: '解忧信箱' },
  { to: '/stories', label: '示例信件' },
  { to: '/about', label: '关于本店' },
];

/**
 * 页脚：深夜蓝底（日间也用，"打烊后的店"隐喻）三栏 + 缝纫虚线 + 版权与隐私承诺。
 * 红豆面包插画热气 4s 循环（动画在 anpan-milk.svg 内部分层）。
 */
export default function Footer() {
  return (
    <footer className="bg-night text-night-text">
      <div className="mx-auto grid max-w-shop gap-10 px-4 py-14 md:grid-cols-3 md:px-6">
        <div>
          <ShopSign height={52} />
          <p className="mt-4 text-sm leading-7 text-night-text/80">
            提供商品订购服务，欢迎咨询。
            <br />
            <span className="font-mincho text-night-text/60">ナミヤ雑貨店</span>
          </p>
        </div>
        <nav className="flex flex-col gap-3 text-sm">
          {NAV.map((l) => (
            <Link key={l.to} to={l.to} className="link-underline-hand w-fit text-night-text/85 hover:text-lamp-glow">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-start gap-4">
          <div>
            <p className="font-hand text-xl text-lamp-glow">有烦恼？</p>
            <Link
              to="/letters/new"
              className="link-underline-hand mt-1 inline-block text-sm text-night-text/85 hover:text-lamp-glow"
            >
              写信给店主 →
            </Link>
          </div>
          <img src="/anpan-milk.svg" alt="红豆面包与牛奶" className="ml-auto w-28 shrink-0" loading="lazy" />
        </div>
      </div>
      <div className="divider-sew mx-auto max-w-shop opacity-60" />
      <div className="mx-auto flex max-w-shop flex-col gap-1 px-4 py-5 text-xs text-night-text/60 md:flex-row md:items-center md:justify-between md:px-6">
        <p>© {new Date().getFullYear()} 浪矢杂货店 · 解忧杂货店</p>
        <p>本店信件绝不窥视——你的信，只有店主会读。</p>
      </div>
    </footer>
  );
}
