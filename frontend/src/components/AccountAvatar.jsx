import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

function initials(user) {
  const source = user.fullName || user.username || user.email || "?";
  return source.trim().slice(0, 2).toUpperCase();
}

// Represents the account only — no application navigation lives here.
// Clicking it goes straight to the account/profile settings, matching the
// GitHub / Notion / Vercel pattern of separating "who am I" from "what can
// I do here" (the latter lives in AppMenu, the hamburger next to this).
export default function AccountAvatar({ className = "" }) {
  const { user } = useAuth();
  if (!user) return null;

  const displayName = user.fullName || user.username || user.email;

  return (
    <Link
      to="/settings?tab=profile"
      title={`${displayName} — account settings`}
      aria-label="Account settings"
      className={`flex-shrink-0 rounded-full transition hover:ring-2 hover:ring-emerald-500/40 ${className}`}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
          {initials(user)}
        </span>
      )}
    </Link>
  );
}
