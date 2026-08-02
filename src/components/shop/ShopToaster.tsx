import { Toaster } from 'sonner';

/**
 * 纸感 Toast 容器（购物车/下单流程各页面各自挂载一个）。
 * 木棕底奶油字的小纸笺，从顶部飘下——配合 sonner 的 `toast()` 使用。
 */
export default function ShopToaster() {
  return (
    <Toaster
      position="top-center"
      gap={8}
      duration={2600}
      toastOptions={{
        style: {
          background: '#6B4A32',
          color: '#F7F0E1',
          border: '1px solid #C9B48C',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(107,74,50,.18), 0 12px 32px rgba(107,74,50,.12)',
          fontFamily: "'Noto Serif SC', serif",
        },
      }}
    />
  );
}
