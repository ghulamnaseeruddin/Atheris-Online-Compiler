import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api
      .get("/stats/me")
      .then(({ data }) => setStats(data))
      .catch(() => setError("Could not load your stats."));
  }, [user]);

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  const maxDaily = stats ? Math.max(1, ...stats.daily.map((d) => d.count)) : 1;
  const maxLang = stats ? Math.max(1, ...stats.byLanguage.map((l) => l.count)) : 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">Your activity</h1>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!stats ? (
        <p className="mt-4 text-sm text-surface-muted dark:text-white/50">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-surface-border bg-white p-4 dark:border-white/10 dark:bg-charcoal-900">
              <p className="text-2xl font-semibold text-charcoal-950 dark:text-white">{stats.totalRuns}</p>
              <p className="text-xs text-surface-muted dark:text-white/50">Total runs</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-white p-4 dark:border-white/10 dark:bg-charcoal-900">
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.successRate}%</p>
              <p className="text-xs text-surface-muted dark:text-white/50">Success rate</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-white p-4 dark:border-white/10 dark:bg-charcoal-900">
              <p className="text-2xl font-semibold text-charcoal-950 dark:text-white">{stats.byLanguage.length}</p>
              <p className="text-xs text-surface-muted dark:text-white/50">Languages used</p>
            </div>
          </div>

          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-surface-muted dark:text-white/40">
            Last 30 days
          </h2>
          {stats.daily.length === 0 ? (
            <p className="text-sm text-surface-muted dark:text-white/50">No runs in the last 30 days.</p>
          ) : (
            <div className="flex h-32 items-end gap-1 rounded-lg border border-surface-border bg-white p-3 dark:border-white/10 dark:bg-charcoal-900">
              {stats.daily.map((d) => (
                <div
                  key={d.date}
                  title={`${new Date(d.date).toLocaleDateString()}: ${d.count} runs`}
                  className="flex-1 rounded-t bg-emerald-500/70"
                  style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: 2 }}
                />
              ))}
            </div>
          )}

          <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-surface-muted dark:text-white/40">
            By language
          </h2>
          <div className="space-y-2">
            {stats.byLanguage.map((l) => (
              <div key={l.language} className="flex items-center gap-3">
                <span className="w-24 flex-shrink-0 font-mono text-sm text-charcoal-800 dark:text-white/80">
                  {l.language}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface dark:bg-white/5">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(l.count / maxLang) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-surface-muted dark:text-white/50">{l.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
