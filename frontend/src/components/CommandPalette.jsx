import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useAIPanel } from "../lib/AIContext";
import { useTheme } from "../lib/ThemeContext";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../lib/languages";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggleOpen: toggleAIPanel } = useAIPanel();
  const { toggleTheme } = useTheme();

  // Global Cmd+K / Ctrl+K to open, Escape to close — works from anywhere in
  // the app, including while typing in the code editor.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Wait a tick for the input to mount before focusing.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commands = useMemo(() => {
    const base = [
      { id: "home", label: "Go home", action: () => navigate("/") },
      { id: "editor", label: "Open editor", action: () => navigate("/editor") },
      { id: "ai", label: "Toggle AI assistant", action: () => toggleAIPanel() },
      { id: "theme", label: "Toggle light / dark theme", action: () => toggleTheme() },
      { id: "leaderboard", label: "View language leaderboard", action: () => navigate("/leaderboard") },
    ];

    if (user) {
      base.push(
        { id: "history", label: "View execution history", action: () => navigate("/history") },
        { id: "analytics", label: "View your activity stats", action: () => navigate("/analytics") },
        { id: "settings", label: "Open settings", action: () => navigate("/settings") },
        { id: "api-keys", label: "Manage API keys", action: () => navigate("/settings/api-keys") },
        { id: "webhooks", label: "Manage webhooks", action: () => navigate("/settings/webhooks") },
        { id: "security", label: "Two-factor authentication settings", action: () => navigate("/settings/security") },
        { id: "profile", label: `View my public profile (@${user.username || user.email})`, action: () => user.username && navigate(`/u/${user.username}`) },
        { id: "about", label: "About Atheris", action: () => navigate("/about") },
        { id: "contact", label: "Contact us", action: () => navigate("/contact") },
        { id: "signout", label: "Sign out", action: () => { logout(); navigate("/"); } }
      );
    } else {
      base.push(
        { id: "login", label: "Log in", action: () => navigate("/login") },
        { id: "signup", label: "Sign up", action: () => navigate("/signup") }
      );
    }

    // Quick-jump to editor with a specific language pre-selected.
    Object.entries(LANGUAGES).forEach(([key, meta]) => {
      if (key === DEFAULT_LANGUAGE) return;
      base.push({
        id: `lang-${key}`,
        label: `New ${meta.name} snippet`,
        action: () => navigate(`/editor?lang=${key}`),
      });
    });

    return base;
  }, [user, navigate, toggleAIPanel, toggleTheme, logout]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 8);
    return commands.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 8);
  }, [commands, query]);

  function runCommand(cmd) {
    setOpen(false);
    cmd.action();
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      runCommand(filtered[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-24" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-surface-border bg-white shadow-2xl dark:border-white/10 dark:bg-charcoal-900"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a command…"
          className="w-full border-b border-surface-border bg-transparent px-4 py-3 text-sm text-charcoal-950 outline-none dark:border-white/10 dark:text-white/90"
        />
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-surface-muted dark:text-white/40">No matching commands.</p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => runCommand(cmd)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center px-4 py-2.5 text-left text-sm ${
                i === activeIndex
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "text-charcoal-800 dark:text-white/80"
              }`}
            >
              {cmd.label}
            </button>
          ))}
        </div>
        <div className="border-t border-surface-border px-4 py-2 text-xs text-surface-muted dark:border-white/10 dark:text-white/30">
          ↑↓ to navigate · Enter to select · Esc to close
        </div>
      </div>
    </div>
  );
}
