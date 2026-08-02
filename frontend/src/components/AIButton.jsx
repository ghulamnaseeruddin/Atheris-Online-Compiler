import React from "react";
import { useAuth } from "../lib/AuthContext";
import { useAIPanel } from "../lib/AIContext";

export default function AIButton({ className = "" }) {
  const { user } = useAuth();
  const { open, toggleOpen } = useAIPanel();

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={toggleOpen}
      aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      title="Atheris AI"
      className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
        open
          ? "bg-emerald-500 text-charcoal-950"
          : "text-charcoal-700 hover:bg-charcoal-950/5 hover:text-charcoal-950 dark:text-white/80 dark:hover:bg-white/5 dark:hover:text-white"
      } ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5c.4 0 .77.26.9.64l1.36 4.02 4.02 1.36a.95.95 0 0 1 0 1.8l-4.02 1.36-1.36 4.02a.95.95 0 0 1-1.8 0l-1.36-4.02-4.02-1.36a.95.95 0 0 1 0-1.8l4.02-1.36 1.36-4.02c.13-.38.5-.64.9-.64Z" />
        <path d="M19 14.5c.3 0 .56.19.66.47l.5 1.42 1.42.5a.7.7 0 0 1 0 1.32l-1.42.5-.5 1.42a.7.7 0 0 1-1.32 0l-.5-1.42-1.42-.5a.7.7 0 0 1 0-1.32l1.42-.5.5-1.42c.1-.28.37-.47.66-.47Z" />
      </svg>
      <span className="hidden sm:inline">Atheris AI</span>
    </button>
  );
}
