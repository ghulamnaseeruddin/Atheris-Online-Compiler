import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "atheris_theme_mode";

function getSystemPref() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// "mode" is what the user picked (light / dark / system — matches Settings →
// Appearance). "system" isn't a real theme, it means "track the OS setting",
// so it's resolved to an actual light/dark value below before being applied.
function getInitialMode() {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  // Back-compat with the old two-value storage key this replaces.
  const legacy = window.localStorage.getItem("atheris_theme");
  if (legacy === "light" || legacy === "dark") return legacy;
  return "system";
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(getInitialMode);
  const [systemPref, setSystemPref] = useState(getSystemPref);

  // Track the OS preference live so "System" mode updates without a reload
  // if the user flips their OS theme while the app is open.
  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;
    const onChange = (e) => setSystemPref(e.matches ? "dark" : "light");
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const resolvedTheme = mode === "system" ? systemPref : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((next) => {
    if (next === "light" || next === "dark" || next === "system") setModeState(next);
  }, []);

  // Kept for existing consumers (ThemeToggle, CommandPalette) that only
  // care about light vs. dark, not the tri-state mode — toggling always
  // lands on an explicit light/dark choice (never re-enters "system").
  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const current = prev === "system" ? getSystemPref() : prev;
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, theme: resolvedTheme, toggleTheme }),
    [mode, setMode, resolvedTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
