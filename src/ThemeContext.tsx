import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  darkTheme,
  lightTheme,
  pinkTheme,
  orangeTheme,
  type Theme,
  type ThemeMode,
} from './theme';
import { getGridSpan, saveGridSpan } from './nativeModule';

const THEME_MODES: ThemeMode[] = ['dark', 'light', 'pink', 'orange'];

type ThemeContextValue = {
  theme: Theme;
  setTheme: (mode: ThemeMode) => void;
  gridSpan: number;
  setGridSpan: (span: 1 | 3) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  setTheme: () => {},
  gridSpan: 1,
  setGridSpan: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [gridSpan, _setGridSpan] = useState<1 | 3>(1);

  useEffect(() => {
    // @ts-ignore lazy bridging import idiom
    const { NativeModules } = require('react-native');
    const mod = NativeModules.HabitWidget;
    if (mod && mod.getTheme) {
      mod.getTheme().then((s: string | null) => {
        if (s && (THEME_MODES as string[]).includes(s)) setMode(s as ThemeMode);
      }).catch(() => {});
    }
    getGridSpan().then(s => {
      if (s === 3) _setGridSpan(3);
    }).catch(() => {});
  }, []);

  const setGridSpan = useCallback((span: 1 | 3) => {
    _setGridSpan(span);
    saveGridSpan(span);
  }, []);

  const theme = useMemo<Theme>(() => {
    if (mode === 'light') return lightTheme;
    if (mode === 'pink') return pinkTheme;
    if (mode === 'orange') return orangeTheme;
    return darkTheme;
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (next: ThemeMode) => {
      setMode(next);
      // @ts-ignore
      const { NativeModules } = require('react-native');
      const mod = NativeModules.HabitWidget;
      if (mod && mod.saveTheme) mod.saveTheme(next);
    },
    gridSpan,
    setGridSpan,
  }), [theme, gridSpan, setGridSpan]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
