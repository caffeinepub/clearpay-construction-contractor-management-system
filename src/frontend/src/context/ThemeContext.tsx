import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AppTheme = "light" | "neon";

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const stored = localStorage.getItem("bms-theme");
      return stored === "neon" ? "neon" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "neon") {
      root.setAttribute("data-theme", "neon");
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("bms-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "neon" : "light"));
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
