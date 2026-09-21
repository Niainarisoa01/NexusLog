// NexusLog Hook — useTheme
//
// Manages theme state and provides toggle functionality.

import { useEffect, useState, useCallback } from "react";
import { type Theme, getInitialTheme, applyTheme } from "@/styles/theme";

interface UseThemeReturn {
  /** Current active theme */
  theme: Theme;
  /** Toggle between dark and light mode */
  toggleTheme: () => void;
  /** Set a specific theme */
  setTheme: (theme: Theme) => void;
  /** Whether dark mode is active */
  isDark: boolean;
}

/**
 * Hook for managing the application theme (dark/light mode).
 * Persists the preference in localStorage.
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return getInitialTheme();
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === "dark",
  };
}
