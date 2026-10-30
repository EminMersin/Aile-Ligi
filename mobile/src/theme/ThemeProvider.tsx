import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors, type ThemeMode } from './palettes';

const STORAGE_KEY = 'aile-ligi-theme-mode';

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!active) return;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const scheme: 'light' | 'dark' = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors, setMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, scheme, colors],
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme/useColors, ThemeProvider içinde kullanılmalı');
  }
  return ctx;
}

/** Aktif renk paletini döndürür (açık ya da koyu, kullanıcı tercihine göre). */
export function useColors(): ThemeColors {
  return useThemeContext().colors;
}

/** Tema tercihini okumak/değiştirmek için (Ayarlar ekranındaki seçici). */
export function useTheme() {
  const { mode, scheme, setMode } = useThemeContext();
  return { mode, scheme, setMode };
}
