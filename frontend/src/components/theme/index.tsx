"use client";

import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { THEME_STORAGE_KEY } from "./bootstrap";

export type Theme = "light" | "dark" | "system";

const DEFAULT_THEME: Theme = "light";

// ---- Saved choice: localStorage, kept in sync across tabs -----------------

const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // Storage blocked (private mode, policy): fall back to the default.
  }
  return DEFAULT_THEME;
}

function writeStored(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted, but still applied for this session via the listeners.
  }
  for (const listener of listeners) listener();
}

function subscribeStored(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ---- OS preference --------------------------------------------------------

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystem(callback: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function systemIsDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** Resolve a theme choice to light/dark. */
function resolveTheme(theme: Theme, systemDark: boolean): "light" | "dark" {
  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
}>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  resolved: "light",
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server and hydration render the default; the stored value takes over right
  // after, so markup never mismatches. The bootstrap script has already set the
  // class on <html>, so there is no visible flash in between.
  const theme = useSyncExternalStore(subscribeStored, readStored, () => DEFAULT_THEME);
  const systemDark = useSyncExternalStore(subscribeSystem, systemIsDark, () => false);
  const resolved = resolveTheme(theme, systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const value = useMemo(() => ({ theme, setTheme: writeStored, resolved }), [theme, resolved]);

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
