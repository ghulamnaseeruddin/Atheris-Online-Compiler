import React, { useEffect, useState } from "react";
import api from "../lib/api";

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats/leaderboard")
      .then(({ data }) => setData(data))
      .catch(() => setError("Could not load the leaderboard."));
  }, []);

  const max = data ? Math.max(1, ...data.topLanguages.map((l) => l.count)) : 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">
        What people are running
      </h1>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
        Aggregate, anonymous activity across all Atheris users over the last {data?.windowDays ?? 7} days. No code,
        usernames, or personal data is shown here.
      </p>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!data && !error && <p className="mt-4 text-sm text-surface-muted dark:text-white/50">Loading…</p>}

      {data && (
        <>
          <p className="mt-6 text-sm text-surface-muted dark:text-white/50">
            {data.totalRuns.toLocaleString()} total executions this week
          </p>
          <div className="mt-3 space-y-2">
            {data.topLanguages.map((l, i) => (
              <div key={l.language} className="flex items-center gap-3">
                <span className="w-6 flex-shrink-0 text-right text-xs text-surface-muted dark:text-white/40">
                  {i + 1}
                </span>
                <span className="w-24 flex-shrink-0 font-mono text-sm text-charcoal-800 dark:text-white/80">
                  {l.language}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface dark:bg-white/5">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(l.count / max) * 100}%` }} />
                </div>
                <span className="w-12 text-right text-xs text-surface-muted dark:text-white/50">{l.count}</span>
              </div>
            ))}
            {data.topLanguages.length === 0 && (
              <p className="text-sm text-surface-muted dark:text-white/50">Not enough activity yet this week.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
