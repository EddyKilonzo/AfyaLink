"use client";

import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "afyalink-theme";

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "light";
}

function systemIsDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve a theme choice to light/dark without touching React state. */
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return systemIsDark() ? "dark" : "light";
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolveTheme(theme) === "dark");
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
}>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitial);
  // Computed synchronously from `theme` — no setState inside an effect.
  const resolved = useMemo(() => resolveTheme(theme), [theme]);

  // Side effect only: toggle the class on the root and subscribe to OS changes.
  useEffect(() => {
    apply(theme);
    if (theme !== "system") return;
    const onQuery = () => apply("system");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onQuery);
    return () => mq.removeEventListener("change", onQuery);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { setTheme, resolved } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Switch to ${next} mode`}
      className="grid size-9 place-items-center rounded-[10px] text-muted transition-colors hover:bg-sunken hover:text-ink"
      aria-label={`Switch to ${next} mode`}
    >
      {resolved === "dark" ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  );
}