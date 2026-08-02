import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import logo from "../assets/atheris-logo.png";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";

export default function ForgotPassword() {
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/editor" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/forgot-password", { identifier });
      setSent(true);
    } catch {
      // Always show success to avoid leaking whether an account exists
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-surface bg-circuit-dark px-4 py-12 dark:bg-charcoal-950">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-charcoal-900">
        <div className="flex flex-col items-center">
          <img src={logo} alt="Atheris" className="h-16 w-16 rounded-full" />
          <h1 className="mt-4 font-display text-xl font-semibold text-charcoal-950 dark:text-white">Reset your password</h1>
        </div>

        {sent ? (
          <p className="mt-6 rounded-md bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            If an account matches that email or username, we've sent a reset link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="text"
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input-field"
              required
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="submit" className="btn-primary w-full py-2.5">
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-surface-muted dark:text-white/50">
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
