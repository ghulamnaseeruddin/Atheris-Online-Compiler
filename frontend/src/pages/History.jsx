import React, { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useAIPanel } from "../lib/AIContext";
import api from "../lib/api";

function formatDate(ms) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const { insertCode } = useAIPanel();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/history");
      setEntries(data.entries);
    } catch {
      setError("Could not load your execution history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.delete(`/history/${id}`);
    } catch {
      load(); // out of sync with the server — refetch to be safe
    }
  }

  async function handleClearAll() {
    if (!window.confirm("Delete your entire execution history? This can't be undone.")) return;
    setEntries([]);
    try {
      await api.delete("/history");
    } catch {
      load();
    }
  }

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">
            Execution history
          </h1>
          <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
            Your last 100 runs, newest first. Only visible to you.
          </p>
        </div>
        {entries.length > 0 && (
          <button onClick={handleClearAll} className="btn-secondary text-sm">
            Clear all
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-surface-muted dark:text-white/50">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center dark:border-white/10">
          <p className="text-sm text-surface-muted dark:text-white/50">
            Nothing here yet — run some code in the editor and it'll show up here.
          </p>
          <Link to="/editor" className="btn-primary mt-4 inline-block">
            Open editor
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry) => {
          const expanded = expandedId === entry.id;
          return (
            <div
              key={entry.id}
              className="overflow-hidden rounded-lg border border-surface-border bg-white dark:border-white/10 dark:bg-charcoal-900"
            >
              <button
                onClick={() => setExpandedId(expanded ? null : entry.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${
                      entry.status === "success" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span className="font-mono text-sm text-charcoal-900 dark:text-white/80">{entry.language}</span>
                  <span className="truncate text-xs text-surface-muted dark:text-white/40">
                    {entry.code.split("\n")[0].slice(0, 60)}
                  </span>
                </div>
                <span className="flex-shrink-0 text-xs text-surface-muted dark:text-white/40">
                  {formatDate(entry.createdAt)}
                </span>
              </button>

              {expanded && (
                <div className="border-t border-surface-border px-4 py-3 dark:border-white/10">
                  <pre className="max-h-64 overflow-auto rounded-md bg-surface p-3 font-mono text-xs text-charcoal-900 dark:bg-charcoal-950 dark:text-white/80">
                    {entry.code}
                  </pre>
                  {entry.stderr && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-red-50 p-3 font-mono text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                      {entry.stderr}
                    </pre>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Link
                      to="/editor"
                      onClick={() => insertCode(entry.code)}
                      className="btn-secondary text-xs"
                    >
                      Open in editor
                    </Link>
                    <button onClick={() => handleDelete(entry.id)} className="btn-ghost text-xs text-red-600 dark:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
