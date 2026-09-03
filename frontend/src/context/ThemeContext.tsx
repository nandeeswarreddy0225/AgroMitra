import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'krishisetu-theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // 1. Read from primary localStorage key or fallback
    const saved = (localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('krishisetu_theme')) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // 2. Check system color scheme preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    // 3. Default to Light
    return 'light';
  });

  // Apply theme to DOM and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;
    
    // Toggle Tailwind 'dark' class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set dataset.theme for single CSS variable source
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    // Persist to unified localStorage key
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem('krishisetu_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
