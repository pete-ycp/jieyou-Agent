import LampGlow from '@/components/shop/LampGlow';

/** 信箱板块页面级加载占位：台灯呼吸 + 一句手写体小字 */
export default function PageLoading({ note = '正在点灯……' }: { note?: string }) {
  return (
    <div className="relative flex min-h-[60dvh] flex-col items-center justify-center gap-6 overflow-hidden">
      <LampGlow size={220} bright />
      <p className="relative font-hand text-xl text-wood">{note}</p>
    </div>
  );
}
