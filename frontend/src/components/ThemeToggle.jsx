import React from "react";
import { useTheme } from "../lib/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-charcoal-700 transition-colors hover:bg-charcoal-950/5 hover:text-charcoal-950 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white ${className}`}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4.5" />
          <path
            d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7 5.6 5.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.7 15.5A8.5 8.5 0 0 1 9.3 4.1c.3-.3.1-.8-.3-.9A9.7 9.7 0 1 0 21.6 15.9c-.1-.4-.6-.5-.9-.4Z" />
        </svg>
      )}
    </button>
  );
}
