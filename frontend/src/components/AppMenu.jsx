import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const ITEMS = [
  { to: "/editor", label: "Open editor" },
  { to: "/history", label: "Execution history" },
  { to: "/analytics", label: "Your activity" },
  { to: "/settings/api-keys", label: "API keys" },
  { to: "/settings/webhooks", label: "Webhooks" },
  { to: "/settings/security", label: "Security (2FA)" },
];

// Everything application-level (navigation + actions) lives here, separate
// from AccountAvatar which only ever opens the account/profile page. This
// mirrors GitHub/Notion/Vercel: one control for "who am I", a different one
// for "what can I do here".
export default function AppMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  if (!user) return null;

  const displayName = user.fullName || user.username || user.email;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open application menu"
        title="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-charcoal-700 transition hover:bg-charcoal-950/5 dark:text-white/80 dark:hover:bg-white/5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-surface-border bg-white shadow-lg shadow-black/5 dark:border-white/10 dark:bg-charcoal-900"
        >
          <div className="border-b border-surface-border px-4 py-3 dark:border-white/10">
            <p className="truncate text-sm font-semibold text-charcoal-950 dark:text-white">{displayName}</p>
            {user.email && user.username && (
              <p className="truncate text-xs text-surface-muted dark:text-white/50">{user.email}</p>
            )}
          </div>

          <div className="py-1">
            {ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-charcoal-800 hover:bg-charcoal-950/5 dark:text-white/80 dark:hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
            {user.username && (
              <Link
                to={`/u/${user.username}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-charcoal-800 hover:bg-charcoal-950/5 dark:text-white/80 dark:hover:bg-white/5"
              >
                My public profile
              </Link>
            )}
          </div>

          <div className="border-t border-surface-border py-1 dark:border-white/10">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
