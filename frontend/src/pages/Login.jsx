import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/atheris-logo.png";
import { useAuth } from "../lib/AuthContext";
import PasswordField from "../components/PasswordField";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — no reason to show the login form (e.g. a bookmarked
  // /login link, or the "Log in" nav item clicked twice).
  if (user) return <Navigate to={location.state?.from || "/editor"} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(identifier, password, needsTotp ? totpCode : undefined);
      navigate(location.state?.from || "/editor", { replace: true });
    } catch (err) {
      if (err?.response?.data?.requiresTotp) {
        setNeedsTotp(true);
        setError(err.response.data.message || "Enter your 6-digit authenticator code.");
      } else {
        setError(err?.response?.data?.message || "Invalid credentials. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-surface bg-circuit-dark px-4 py-12 dark:bg-charcoal-950">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-charcoal-900">
        <div className="flex flex-col items-center">
          <img src={logo} alt="Atheris" className="h-16 w-16 rounded-full" />
          <h1 className="mt-4 font-display text-xl font-semibold text-charcoal-950 dark:text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-surface-muted dark:text-white/50">Log in to keep coding where you left off.</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <a href={`${API_BASE}/auth/github`} className="btn-secondary">
            Continue with GitHub
          </a>
          <a href={`${API_BASE}/auth/google`} className="btn-secondary">
            Continue with Google
          </a>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-surface-muted dark:text-white/40">
          <div className="h-px flex-1 bg-surface-border dark:bg-white/10" />
          or continue with
          <div className="h-px flex-1 bg-surface-border dark:bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-surface-muted dark:text-white/50">
              Gmail / Email
            </label>
            <input
              type="email"
              placeholder="you@gmail.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-surface-muted dark:text-white/50">Password</label>
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required disabled={needsTotp} />
          </div>

          {needsTotp && (
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit authenticator code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              maxLength={6}
              autoFocus
              className="input-field"
              required
            />
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
            {submitting ? "Logging in…" : needsTotp ? "Verify code" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-muted dark:text-white/50">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
