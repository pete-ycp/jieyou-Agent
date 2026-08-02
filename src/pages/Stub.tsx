import { Link } from 'react-router';

/** 脚手架占位页：后续页面代理按各自 design/*.md 实现时替换 */
export default function Stub({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mx-auto flex max-w-shop flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="font-hand text-3xl text-page-fg">{title}</p>
      <p className="text-sm text-slate">{note ?? '本页正在整理货架，很快就来。'}</p>
      <Link to="/" className="link-underline-hand mt-2 text-sm text-stamp">
        先回店门口看看 →
      </Link>
    </div>
  );
}
