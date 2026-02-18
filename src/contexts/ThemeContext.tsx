import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
}

interface ThemeContextValue extends ThemeState {
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const applyThemeToDOM = (resolved: ResolvedTheme) => {
  document.documentElement.setAttribute("data-theme", resolved);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeState>(() => {
    try {
      const cached = localStorage.getItem("nyx_theme_cache");
      if (cached) {
        const parsed = JSON.parse(cached) as ThemeState;
        applyThemeToDOM(parsed.resolved);
        return parsed;
      }
    } catch {}
    return { mode: "system", resolved: "dark" };
  });

  useEffect(() => {
    applyThemeToDOM(theme.resolved);
  }, [theme.resolved]);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.getTheme().then((t: ThemeState) => {
      setThemeState(t);
      applyThemeToDOM(t.resolved);
      localStorage.setItem("nyx_theme_cache", JSON.stringify(t));
    });

    const cleanup = window.electronAPI.onThemeChanged(
      (newTheme: ThemeState) => {
        setThemeState(newTheme);
        applyThemeToDOM(newTheme.resolved as ResolvedTheme);
        localStorage.setItem("nyx_theme_cache", JSON.stringify(newTheme));
      },
    );

    return cleanup;
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    if (window.electronAPI) {
      window.electronAPI.setTheme(mode).then((t: ThemeState) => {
        setThemeState(t);
        applyThemeToDOM(t.resolved);
        localStorage.setItem("nyx_theme_cache", JSON.stringify(t));
      });
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ ...theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
