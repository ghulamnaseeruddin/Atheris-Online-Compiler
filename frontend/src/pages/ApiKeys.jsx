import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";

function formatDate(ms) {
  if (!ms) return "Never";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ApiKeys() {
  const { user, loading: authLoading } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(null); // { rawKey, name } — shown once
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api-keys");
      setKeys(data.keys);
    } catch {
      setError("Could not load your API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/api-keys", { name: newKeyName.trim() || undefined });
      setJustCreated(data);
      setNewKeyName("");
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create a new API key.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm("Revoke this API key? Anything using it will stop working immediately.")) return;
    setKeys((prev) => prev.filter((k) => k.id !== id));
    try {
      await api.delete(`/api-keys/${id}`);
    } catch {
      load();
    }
  }

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">API keys</h1>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
        Use a personal API key to call <code className="font-mono">POST /api/execute</code> programmatically —
        scripts, CI pipelines, or your own tools — without a browser session. Send it as an{" "}
        <code className="font-mono">X-API-Key</code> header.
      </p>

      {justCreated && (
        <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-50 p-4 dark:bg-emerald-500/10">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            "{justCreated.name}" created — copy this key now, it won't be shown again:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-white px-3 py-2 font-mono text-xs text-charcoal-900 dark:bg-charcoal-950 dark:text-white/90">
              {justCreated.rawKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(justCreated.rawKey).catch(() => {})}
              className="btn-secondary text-xs"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setJustCreated(null)}
            className="mt-2 text-xs text-emerald-700 underline dark:text-emerald-400"
          >
            Done, dismiss this
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder='Key name (e.g. "CI pipeline")'
          maxLength={60}
          className="input-field flex-1 text-sm"
        />
        <button type="submit" disabled={creating} className="btn-primary text-sm disabled:opacity-50">
          {creating ? "Creating…" : "New key"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-surface-muted dark:text-white/50">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-surface-muted dark:text-white/50">No API keys yet.</p>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-lg border border-surface-border bg-white px-4 py-3 dark:border-white/10 dark:bg-charcoal-900"
            >
              <div>
                <p className="text-sm font-medium text-charcoal-900 dark:text-white/90">{k.name}</p>
                <p className="font-mono text-xs text-surface-muted dark:text-white/40">
                  {k.keyPrefix}… · created {formatDate(k.createdAt)} · last used {formatDate(k.lastUsedAt)}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(k.id)}
                className="btn-ghost text-xs text-red-600 dark:text-red-400"
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
