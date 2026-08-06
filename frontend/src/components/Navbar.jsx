import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/atheris-logo.png";
import { useAuth } from "../lib/AuthContext";
import ThemeToggle from "./ThemeToggle";
import AIButton from "./AIButton";
import AccountAvatar from "./AccountAvatar";
import AppMenu from "./AppMenu";

const NAV_LINKS = [
  { to: "/editor", label: "Editor", kind: "route" },
  { to: "/#languages", label: "Languages", kind: "anchor" },
  { to: "/#features", label: "Features", kind: "anchor" },
  { to: "/about", label: "About", kind: "route" },
  { to: "/docs", label: "Docs", kind: "route" },
  { to: "/settings", label: "Settings", kind: "route" },
  { to: "/contact", label: "Contact Us", kind: "route" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white bg-circuit-dark dark:border-white/5 dark:bg-charcoal-950">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Atheris" className="h-9 w-9 rounded-full" />
          <span className="font-display text-lg font-semibold tracking-tight text-charcoal-950 dark:text-white">
            Atheris
            <span className="ml-1.5 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 sm:inline">
              Online Compiler
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((item) =>
            item.kind === "anchor" ? (
              <a key={item.label} href={item.to} className="btn-ghost">
                {item.label}
              </a>
            ) : (
              <NavLink key={item.label} to={item.to} className="btn-ghost">
                {item.label}
              </NavLink>
            )
          )}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <AIButton />
          <ThemeToggle />
          {user ? (
            <>
              <AccountAvatar />
              <AppMenu />
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary">
                Sign up free
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <AIButton />
          <ThemeToggle />
          {user && <AccountAvatar />}
          <button
            className="rounded-md p-2 text-charcoal-700 dark:text-white/80"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-surface-border bg-white px-4 pb-4 pt-2 dark:border-white/5 dark:bg-charcoal-950 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((item) =>
              item.kind === "anchor" ? (
                <a
                  key={item.label}
                  href={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="btn-ghost justify-start"
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="btn-ghost justify-start"
                >
                  {item.label}
                </NavLink>
              )
            )}

            {user ? (
              <>
                <div className="mt-1 flex items-center gap-2.5 border-t border-surface-border px-1 pt-3 dark:border-white/5">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                      {(user.fullName || user.username || user.email || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-charcoal-900 dark:text-white/90">
                    {user.fullName || user.username || user.email}
                  </span>
                </div>
                <NavLink to="/history" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                  Execution history
                </NavLink>
                <NavLink to="/analytics" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                  Your activity
                </NavLink>
                <NavLink to="/settings/api-keys" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                  API keys
                </NavLink>
                <NavLink to="/settings/webhooks" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                  Webhooks
                </NavLink>
                <NavLink to="/settings/security" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                  Security (2FA)
                </NavLink>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="btn-ghost justify-start text-red-600 dark:text-red-400"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-ghost justify-start">
                  Log in
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="btn-primary mt-1 justify-center">
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
