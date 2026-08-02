import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";

export default function Webhooks() {
  const { user, loading: authLoading } = useAuth();
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/webhooks");
      setWebhooks(data.webhooks);
    } catch {
      setError("Could not load your webhooks.");
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
      const { data } = await api.post("/webhooks", { url });
      setJustCreated(data);
      setUrl("");
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create webhook.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    try {
      await api.delete(`/webhooks/${id}`);
    } catch {
      load();
    }
  }

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">Webhooks</h1>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
        Get a POST request with the result every time code runs through your{" "}
        <a href="/settings/api-keys" className="text-emerald-700 underline dark:text-emerald-400">
          API key
        </a>{" "}
        — useful for CI pipelines or automated grading. Not fired for interactive runs in the editor.
      </p>

      {justCreated && (
        <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-50 p-4 dark:bg-emerald-500/10">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Webhook created. Save this signing secret to verify deliveries (won't be shown again):
          </p>
          <code className="mt-2 block overflow-x-auto rounded-md bg-white px-3 py-2 font-mono text-xs text-charcoal-900 dark:bg-charcoal-950 dark:text-white/90">
            {justCreated.secret}
          </code>
          <p className="mt-2 text-xs text-surface-muted dark:text-white/40">
            Each delivery includes an <code className="font-mono">X-Atheris-Signature</code> header: HMAC-SHA256 of the
            raw JSON body, using this secret.
          </p>
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-server.com/webhook"
          className="input-field flex-1 text-sm"
          required
        />
        <button type="submit" disabled={creating} className="btn-primary text-sm disabled:opacity-50">
          {creating ? "Adding…" : "Add webhook"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-surface-muted dark:text-white/50">Loading…</p>
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-surface-muted dark:text-white/50">No webhooks yet.</p>
        ) : (
          webhooks.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-lg border border-surface-border bg-white px-4 py-3 dark:border-white/10 dark:bg-charcoal-900"
            >
              <span className="truncate font-mono text-sm text-charcoal-900 dark:text-white/90">{w.url}</span>
              <button onClick={() => handleDelete(w.id)} className="btn-ghost text-xs text-red-600 dark:text-red-400">
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
