import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import logo from "../assets/atheris-logo.png";
import { useAuth } from "../lib/AuthContext";
import PasswordField from "../components/PasswordField";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

function passwordScore(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}

export default function Signup() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordScore(password);

  if (user) return <Navigate to="/editor" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!EMAIL_RE.test(email)) {
      return setError("Enter a valid email address.");
    }
    if (phone && !PHONE_RE.test(phone)) {
      return setError("Enter a valid phone number, or leave it blank.");
    }
    if (!USERNAME_RE.test(username)) {
      return setError("Username must be 3–20 characters (letters, numbers, underscore).");
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }

    setSubmitting(true);
    try {
      await signup({ email, username, phone: phone || undefined, password });
      navigate("/editor");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create your account. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-surface bg-circuit-dark px-4 py-12 dark:bg-charcoal-950">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-charcoal-900">
        <div className="flex flex-col items-center">
          <img src={logo} alt="Atheris" className="h-16 w-16 rounded-full" />
          <h1 className="mt-4 font-display text-xl font-semibold text-charcoal-950 dark:text-white">
            Create your Atheris account
          </h1>
          <p className="mt-1 text-sm text-surface-muted dark:text-white/50">Write, run, and share code — free forever.</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <a href={`${API_BASE}/auth/github`} className="btn-secondary">
            <GithubIcon /> GitHub
          </a>
          <a href={`${API_BASE}/auth/google`} className="btn-secondary">
            <GoogleIcon /> Google
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-surface-muted dark:text-white/50">
              Mobile number <span className="text-surface-muted/70 dark:text-white/30">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-surface-muted dark:text-white/50">Username</label>
            <input
              type="text"
              placeholder="yourusername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-surface-muted dark:text-white/50">Password</label>
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="mt-1.5 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i < strength ? "bg-emerald-500" : "bg-surface-border dark:bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-surface-muted dark:text-white/50">
              Confirm password
            </label>
            <PasswordField value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" required />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-muted dark:text-white/50">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.73.5.98 5.24.98 11.52c0 4.94 3.2 9.13 7.65 10.6.56.1.76-.24.76-.54v-2c-3.11.68-3.77-1.5-3.77-1.5-.5-1.28-1.24-1.62-1.24-1.62-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15 1 1.71 2.63 1.22 3.27.93.1-.72.39-1.22.71-1.5-2.48-.28-5.1-1.24-5.1-5.53 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.1-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 015.6 0c2.14-1.45 3.08-1.15 3.08-1.15.6 1.54.22 2.68.1 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.62 5.24-5.12 5.52.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.03 11.03 0 0023 11.52C23 5.24 18.27.5 12 .5z" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.2c0-.8-.07-1.4-.2-2H12v3.8h5.9c-.1.9-.8 2.4-2.3 3.4l-.02.2 3.4 2.6.2.02c2.2-2 3.5-5 3.5-8z" />
      <path fill="#34A853" d="M12 23c3.1 0 5.7-1 7.6-2.8l-3.6-2.8c-1 .7-2.3 1.1-4 1.1-3 0-5.6-2-6.6-4.8l-.2.02-3.6 2.8-.05.2C3.4 20.5 7.4 23 12 23z" />
      <path fill="#FBBC05" d="M5.4 13.7A6.8 6.8 0 015 12c0-.6.1-1.2.3-1.7l-.02-.2-3.6-2.8-.12.06A11 11 0 001 12c0 1.8.4 3.5 1.2 5l3.2-3.3z" />
      <path fill="#EA4335" d="M12 5.4c1.7 0 2.9.7 3.6 1.3l2.6-2.6C16.7 2.5 14.6 1.6 12 1.6 7.4 1.6 3.4 4.1 1.6 7.7l3.6 2.8C6.3 7.6 8.9 5.4 12 5.4z" />
    </svg>
  );
}
