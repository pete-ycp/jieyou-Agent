import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Navbar from '@/components/Navbar';
import DayNightBar from '@/components/DayNightBar';
import Footer from '@/components/Footer';
import ShibaConcierge from '@/components/shiba/ShibaConcierge';
import { DayNightProvider } from '@/hooks/useDayNight';

gsap.registerPlugin(ScrollTrigger);

/**
 * 全站布局：Navbar（sticky）+ DayNightBar + 内容槽 + Footer。
 * 嵌套路由模式：Layout 渲染 <Outlet/>，App 必须将其作为 layout route。
 * Lenis（lerp 0.08）接管平滑滚动并与 ScrollTrigger 同步。
 */
export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, [location.pathname]);

  return (
    <DayNightProvider>
      <div className="flex min-h-[100dvh] flex-col">
        <Navbar />
        <DayNightBar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <ShibaConcierge />
      </div>
    </DayNightProvider>
  );
}
