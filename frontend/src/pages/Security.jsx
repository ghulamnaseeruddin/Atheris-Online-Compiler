import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";

export default function Security() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [step, setStep] = useState("idle"); // idle | setup | disable
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/2fa/setup");
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep("setup");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not start 2FA setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/2fa/enable", { totpCode: code });
      setMessage("Two-factor authentication is now enabled.");
      setStep("idle");
      setCode("");
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || "That code didn't work — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/2fa/disable", { password });
      setMessage("Two-factor authentication has been disabled.");
      setStep("idle");
      setPassword("");
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not disable 2FA.");
    } finally {
      setBusy(false);
    }
  }

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">Security</h1>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
        Two-factor authentication adds a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password,
        etc.) on top of your password.
      </p>

      {message && (
        <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {step === "idle" && (
        <div className="mt-6 rounded-lg border border-surface-border bg-white p-4 dark:border-white/10 dark:bg-charcoal-900">
          <p className="text-sm font-medium text-charcoal-900 dark:text-white/90">
            Status: {user?.totpEnabled ? "Enabled" : "Not enabled"}
          </p>
          <div className="mt-3">
            {user?.totpEnabled ? (
              <button onClick={() => setStep("disable")} className="btn-secondary text-sm">
                Disable 2FA
              </button>
            ) : (
              <button onClick={startSetup} disabled={busy} className="btn-primary text-sm">
                {busy ? "Starting…" : "Enable 2FA"}
              </button>
            )}
          </div>
        </div>
      )}

      {step === "setup" && (
        <div className="mt-6 rounded-lg border border-surface-border bg-white p-4 dark:border-white/10 dark:bg-charcoal-900">
          <p className="text-sm text-charcoal-800 dark:text-white/80">
            Scan this QR code with your authenticator app:
          </p>
          {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="2FA QR code" className="my-3 h-44 w-44 rounded-md border border-surface-border dark:border-white/10" />}
          <p className="text-xs text-surface-muted dark:text-white/40">
            Can't scan it? Enter this key manually: <code className="font-mono">{secret}</code>
          </p>
          <form onSubmit={confirmEnable} className="mt-4 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="input-field flex-1 text-sm"
              required
            />
            <button type="submit" disabled={busy} className="btn-primary text-sm">
              {busy ? "Verifying…" : "Confirm"}
            </button>
          </form>
        </div>
      )}

      {step === "disable" && (
        <form onSubmit={confirmDisable} className="mt-6 rounded-lg border border-surface-border bg-white p-4 dark:border-white/10 dark:bg-charcoal-900">
          <p className="text-sm text-charcoal-800 dark:text-white/80">Enter your password to disable 2FA.</p>
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field flex-1 text-sm"
              required
            />
            <button type="submit" disabled={busy} className="btn-secondary text-sm text-red-600 dark:text-red-400">
              {busy ? "Disabling…" : "Disable"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
