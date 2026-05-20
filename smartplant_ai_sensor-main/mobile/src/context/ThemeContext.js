import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors } from '../constants/theme';

const ThemeCtx = createContext({ isDark: true, colors: DarkColors, toggle: () => {} });

export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('app_theme').then(v => {
      if (v !== null) setIsDark(v === 'dark');
    });
  }, []);

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('app_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ isDark, colors: isDark ? DarkColors : LightColors, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}
