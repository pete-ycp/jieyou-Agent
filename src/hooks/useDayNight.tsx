/* eslint-disable react-refresh/only-export-components -- Provider + hook 同文件是本项目的既定模式 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type DayNight = 'day' | 'night';

const STORAGE_KEY = 'namiya-theme';

interface DayNightContextValue {
  theme: DayNight;
  isNight: boolean;
  toggle: () => void;
}

const DayNightContext = createContext<DayNightContextValue>({
  theme: 'day',
  isNight: false,
  toggle: () => {},
});

/** 营业中 08:30–20:00 为日间，其余时间为夜间（打烊后） */
function autoTheme(now: Date = new Date()): DayNight {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= 8 * 60 + 30 && minutes < 20 * 60 ? 'day' : 'night';
}

function initialTheme(): DayNight {
  if (typeof window === 'undefined') return 'day';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'day' || saved === 'night') return saved;
  return autoTheme();
}

export function DayNightProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DayNight>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: DayNight = prev === 'day' ? 'night' : 'day';
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <DayNightContext.Provider value={{ theme, isNight: theme === 'night', toggle }}>
      {children}
    </DayNightContext.Provider>
  );
}

export function useDayNight() {
  return useContext(DayNightContext);
}
