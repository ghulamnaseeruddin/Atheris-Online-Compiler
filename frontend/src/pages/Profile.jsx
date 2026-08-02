import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";

function formatDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get(`/users/${username}`)
      .then(({ data }) => setProfile(data))
      .catch((err) => {
        setError(err?.response?.status === 404 ? "This user doesn't exist." : "Could not load this profile.");
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return <p className="mx-auto max-w-3xl px-4 py-10 text-sm text-surface-muted dark:text-white/50">Loading…</p>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm text-surface-muted dark:text-white/50">{error}</p>
        <Link to="/" className="btn-secondary mt-4 inline-block">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-xl font-semibold text-white">
            {profile.username.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="font-display text-xl font-semibold text-charcoal-950 dark:text-white">
            {profile.username}
          </h1>
          <p className="text-sm text-surface-muted dark:text-white/50">
            Member since {formatDate(profile.memberSince)}
          </p>
        </div>
      </div>

      {profile.bio && <p className="mt-4 max-w-xl text-sm text-charcoal-800 dark:text-white/70">{profile.bio}</p>}

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-surface-muted dark:text-white/40">
        Public snippets
      </h2>

      {profile.snippets.length === 0 ? (
        <p className="text-sm text-surface-muted dark:text-white/50">No public snippets yet.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {profile.snippets.map((s) => (
            <Link
              key={s.id}
              to={`/editor?snippet=${s.id}`}
              className="rounded-lg border border-surface-border bg-white p-3 transition hover:border-emerald-500/50 dark:border-white/10 dark:bg-charcoal-900"
            >
              <p className="truncate text-sm font-medium text-charcoal-900 dark:text-white/90">
                {s.title || "Untitled snippet"}
              </p>
              <p className="mt-1 font-mono text-xs text-surface-muted dark:text-white/40">
                {s.language} · {formatDate(s.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
