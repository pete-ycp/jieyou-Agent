import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Drumstick, Mail, MessageCircleHeart } from 'lucide-react';
import ShibaChatPanel from '@/components/shiba/ShibaChatPanel';
import { useDayNight } from '@/hooks/useDayNight';

/**
 * 小柴 · AI 解忧员（漫游版）
 * 一只在页面底部走来走去的柴犬。状态机驱动：
 *   walk 巡逻散步 | sit 坐着发呆 | sleep 蜷成团睡觉（夜里更贪睡）
 *   roll  累了打滚 | beg 饿了作揖讨吃（点它=喂它）| eat 开心干饭
 *   letter 叼着信跑腿（信箱页面更爱干）| greet 被点醒/打招呼
 * 场景感知：信箱页叼信、收银台讨吃、故事墙坐着读信、夜里夜巡/打瞌睡。
 * 点击它（非讨吃状态时）= 打招呼并打开 AI 解忧聊天面板。
 * 后台管理页不展示。
 */

type ShibaState = 'walk' | 'sit' | 'sleep' | 'roll' | 'beg' | 'eat' | 'letter' | 'greet';

const POSE: Record<ShibaState, string> = {
  walk: '/shiba-walk.png',
  sit: '/shiba-sit.png',
  sleep: '/shiba-sleep.png',
  roll: '/shiba-roll.png',
  beg: '/shiba-beg.png',
  eat: '/shiba-eat.png',
  letter: '/shiba-letter.png',
  greet: '/shiba-happy.png',
};

/** 行走循环帧：三帧四肢相位不同、尾巴高低变化——轮播起来就是走路摇尾巴 */
const WALK_FRAMES = ['/shiba-walk.png', '/shiba-walk-2.png', '/shiba-walk-3.png'];
const WALK_FRAME_MS = 150; // ≈7fps，手绘动画节奏

/** 各状态停留时长（毫秒）：[min, max] */
const DURATION: Record<ShibaState, [number, number]> = {
  walk: [7000, 13000],
  sit: [5000, 9000],
  sleep: [9000, 15000],
  roll: [3200, 4200],
  beg: [7000, 11000],
  eat: [4200, 5200],
  letter: [7000, 11000],
  greet: [1600, 1600],
};

/** 会移动的状态（走路 / 叼信跑腿） */
const MOVING: ReadonlySet<ShibaState> = new Set(['walk', 'letter']);

/** 各状态的循环小动作（QQ 宠物式生命力） */
const STATE_ANIM: Record<ShibaState, string> = {
  walk: 'animate-[shiba-bob_0.45s_ease-in-out_infinite]',
  letter: 'animate-[shiba-bob_0.55s_ease-in-out_infinite]',
  beg: 'animate-[shiba-beg_0.9s_ease-in-out_infinite]',
  roll: 'animate-[shiba-rock_1.2s_ease-in-out_infinite]',
  sleep: 'animate-[shiba-breathe_3.2s_ease-in-out_infinite]',
  eat: 'animate-[shiba-munch_0.5s_ease-in-out_infinite]',
  sit: 'animate-[shiba-breathe_4.2s_ease-in-out_infinite]',
  greet: 'animate-[shiba-hop_0.6s_ease-in-out_infinite]',
};

interface Bubble {
  text: string;
  icon?: 'moon' | 'food' | 'mail' | 'heart';
}

const SIT_BUBBLES = ['店主在里面写信呢', '今天也会有好事发生', '陪我坐一会儿吧', '汪？'];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export default function ShibaConcierge() {
  const location = useLocation();
  const { isNight } = useDayNight();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ShibaState>('walk');
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [dir, setDir] = useState<-1 | 1>(-1);
  const [walkFrame, setWalkFrame] = useState(0);

  const dogRef = useRef<HTMLButtonElement>(null);
  const xRef = useRef(typeof window !== 'undefined' ? window.innerWidth * 0.6 : 600);
  const dirRef = useRef<-1 | 1>(-1);
  const stateRef = useRef<ShibaState>('walk');
  const openRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const hintRef = useRef<number | undefined>(undefined);
  const isNightRef = useRef(isNight);
  const pathRef = useRef(location.pathname);
  const speedRef = useRef(60);

  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // 让 ref 与最新值同步（rAF 与定时器里读的都是 ref，避免闭包旧值）
  isNightRef.current = isNight;
  pathRef.current = location.pathname;
  stateRef.current = state;
  openRef.current = open;

  const isAdmin = location.pathname.startsWith('/admin');
  // 购物车页底部有 fixed 结算条（z-40），小柴抬高避免遮挡合计金额与结账按钮
  const isCartPage = location.pathname === '/cart';

  /* ---------------- 状态气泡 ---------------- */
  const bubbleFor = useCallback((s: ShibaState): Bubble | null => {
    const path = pathRef.current;
    const night = isNightRef.current;
    switch (s) {
      case 'sleep':
        return { text: night ? '呼……店主也睡了' : '午睡一会儿……', icon: 'moon' };
      case 'roll':
        return { text: '累了，打个滚～' };
      case 'beg':
        return {
          text: /cart|checkout|pay/.test(path) ? '这个……是买给柴的吗？' : '赏口吃的吧……',
          icon: 'food',
        };
      case 'eat':
        return { text: '唔姆唔姆……谢谢款待！', icon: 'food' };
      case 'letter':
        return {
          text: path.startsWith('/letters') ? '我替你盯着牛奶箱' : '要寄信吗？我跑得快',
          icon: 'mail',
        };
      case 'sit':
        if (path.startsWith('/stories')) return { text: '这些信好感人……' };
        if (path.startsWith('/products') || path.startsWith('/search'))
          return { text: '货架上全是好东西' };
        return Math.random() < 0.75 ? { text: pick(SIT_BUBBLES) } : null;
      case 'walk':
        if (night) return { text: '夜巡中……', icon: 'moon' };
        return Math.random() < 0.25 ? { text: '巡逻中……' } : null;
      case 'greet':
        return { text: '汪！来找我啦？', icon: 'heart' };
      default:
        return null;
    }
  }, []);

  /* ---------------- 状态切换 ---------------- */
  const transitionTo = useCallback(
    (s: ShibaState) => {
      window.clearTimeout(timerRef.current);
      setState(s);
      setBubble(bubbleFor(s));
      // 每次走路/跑腿随机换个步速，更像活物
      if (s === 'walk') speedRef.current = rand(48, 82);
      if (s === 'letter') speedRef.current = rand(38, 56);
      const [min, max] = DURATION[s];
      timerRef.current = window.setTimeout(() => {
        transitionTo(pickNext());
      }, rand(min, max));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bubbleFor],
  );

  /** 按场景加权地挑下一个状态 */
  const pickNext = useCallback((): ShibaState => {
    const path = pathRef.current;
    const night = isNightRef.current;
    const last = stateRef.current;
    const w: Array<[ShibaState, number]> = [
      ['walk', 34 + (path.startsWith('/products') || path.startsWith('/search') ? 8 : 0)],
      ['sit', 20 + (path.startsWith('/stories') ? 12 : 0)],
      ['sleep', 8 + (night ? 20 : 0)],
      ['roll', night ? 4 : 9],
      ['beg', /cart|checkout|pay/.test(path) ? 26 : 8],
      ['letter', path.startsWith('/letters') ? 26 : 6],
    ];
    const pool = w.filter(([s]) => s !== last);
    const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
    let r = Math.random() * total;
    for (const [s, weight] of pool) {
      r -= weight;
      if (r <= 0) return s;
    }
    return 'walk';
  }, []);

  /* ---------------- 移动循环（rAF，直接写 transform，不走 re-render） ---------------- */
  useEffect(() => {
    if (reduceMotion || isAdmin) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const el = dogRef.current;
      if (el) {
        const dogW = el.offsetWidth || 80;
        const maxX = window.innerWidth - dogW - 6;
        if (MOVING.has(stateRef.current) && !openRef.current) {
          // 游走途中偶尔心血来潮掉头（约 15%/秒），更像闲逛
          if (Math.random() < dt * 0.15) {
            dirRef.current = dirRef.current === 1 ? -1 : 1;
            setDir(dirRef.current);
          }
          let x = xRef.current + dirRef.current * speedRef.current * dt;
          if (x <= 6) {
            x = 6;
            dirRef.current = 1;
            setDir(1);
            if (Math.random() < 0.25) transitionTo('sit');
          } else if (x >= maxX) {
            x = maxX;
            dirRef.current = -1;
            setDir(-1);
            if (Math.random() < 0.25) transitionTo('sit');
          }
          xRef.current = x;
        }
        el.style.transform = `translateX(${xRef.current}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, isAdmin, transitionTo]);

  /* ---------------- 行走帧动画：walk 状态时轮播三帧，四肢迈步 + 摇尾巴 ---------------- */
  useEffect(() => {
    if (isAdmin || reduceMotion || state !== 'walk') {
      setWalkFrame(0);
      return;
    }
    const id = window.setInterval(() => {
      setWalkFrame((f) => (f + 1) % WALK_FRAMES.length);
    }, WALK_FRAME_MS);
    return () => window.clearInterval(id);
  }, [state, isAdmin, reduceMotion]);

  /* ---------------- 预载行走帧，避免首次轮播闪白 ---------------- */
  useEffect(() => {
    WALK_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  /* ---------------- 初始状态 & 清理 ---------------- */
  useEffect(() => {
    if (isAdmin) return;
    transitionTo('walk');
    return () => {
      window.clearTimeout(timerRef.current);
      window.clearInterval(hintRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  /* ---------------- 周期性「点我聊聊」提示 ---------------- */
  useEffect(() => {
    if (isAdmin || reduceMotion) return;
    hintRef.current = window.setInterval(() => {
      if (openRef.current) return;
      if (stateRef.current === 'beg' || stateRef.current === 'sleep') return;
      setBubble({ text: '点我，跟我聊聊心事', icon: 'heart' });
      window.setTimeout(() => {
        if (!openRef.current) setBubble(bubbleFor(stateRef.current));
      }, 4200);
    }, 45000);
    return () => window.clearInterval(hintRef.current);
  }, [isAdmin, reduceMotion, bubbleFor]);

  /* ---------------- 面板开合时，小柴坐下陪聊 / 回去巡逻 ---------------- */
  useEffect(() => {
    if (isAdmin) return;
    transitionTo(open ? 'sit' : 'walk');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdmin]);

  /* ---------------- 点击交互 ---------------- */
  const handleClick = () => {
    const s = stateRef.current;
    if (openRef.current) {
      setOpen(false);
      return;
    }
    if (s === 'beg') {
      // 讨吃时点它 = 喂它
      transitionTo('eat');
      return;
    }
    if (s === 'sleep') {
      setBubble({ text: '唔……早呀，汪！', icon: 'heart' });
      setState('greet');
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setOpen(true), 700);
      return;
    }
    setState('greet');
    setBubble(bubbleFor('greet'));
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), 480);
  };

  if (isAdmin) return null;

  // walk/sit/letter/eat/sleep 立绘天然朝左；向右走时水平翻转（翻转套在外层 span 上，与立绘自身小动作互不干扰）
  const flip = dir === 1 ? -1 : 1;

  return (
    <>
      {/* 漫游柴犬 */}
      <button
        ref={dogRef}
        type="button"
        onClick={handleClick}
        aria-label="小柴（AI 解忧员）——点我聊聊"
        className={`fixed left-0 z-[40] block w-24 cursor-pointer select-none bg-transparent p-0 md:bottom-4 md:w-32 ${isCartPage ? 'bottom-20' : 'bottom-3'}`}
        style={{ transform: `translateX(${xRef.current}px)` }}
      >
        {/* 气泡：外层 span 专责定位居中（framer-motion 的内联 transform 会覆盖 Tailwind 位移类，需拆开），内层 motion 只做动画 */}
        <span className="absolute -top-9 left-1/2 -translate-x-1/2">
          <AnimatePresence>
            {bubble && (
              <motion.span
                key={bubble.text}
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.94 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-1 whitespace-nowrap rounded-full bg-cream/95 px-2.5 py-1 text-[11px] text-wood shadow-paper"
                style={{ border: '1px solid #D9C9A8' }}
              >
                {bubble.icon === 'moon' && <Moon size={11} className="text-slate" />}
                {bubble.icon === 'food' && <Drumstick size={11} className="text-vermilion" />}
                {bubble.icon === 'mail' && <Mail size={11} className="text-slate" />}
                {bubble.icon === 'heart' && <MessageCircleHeart size={11} className="text-stamp" />}
                {bubble.text}
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        {/* 睡觉时的 Zzz 飘字 */}
        {state === 'sleep' && (
          <span className="pointer-events-none absolute -top-4 right-2 flex gap-0.5 font-hand text-wood/70">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-[shiba-zzz_2.4s_ease-out_infinite]"
                style={{ animationDelay: `${i * 0.7}s`, fontSize: 11 + i * 3 }}
              >
                Z
              </span>
            ))}
          </span>
        )}

        <span className="block" style={{ transform: `scaleX(${flip})` }}>
          <img
            src={state === 'walk' ? WALK_FRAMES[walkFrame] : POSE[state]}
            alt="小柴"
            draggable={false}
            className={`${STATE_ANIM[state]} w-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]`}
          />
        </span>
      </button>

      {/* 聊天面板 */}
      <ShibaChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
