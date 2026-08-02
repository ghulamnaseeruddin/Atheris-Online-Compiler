import React, { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/ThemeContext";
import api from "../lib/api";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "editor", label: "Editor" },
  { id: "notifications", label: "Notifications" },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab = TABS.some((t) => t.id === requested) ? requested : "profile";

  function setTab(id) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">Settings</h1>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
        Manage your profile, account, appearance, editor, and notification preferences.
      </p>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:w-48 lg:flex-shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={activeTab === t.id}
              className={`flex-shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "bg-emerald-500 text-charcoal-950"
                  : "text-charcoal-700 hover:bg-charcoal-950/5 dark:text-white/70 dark:hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "account" && <AccountTab />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "editor" && <EditorTab />}
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}

// --- Shared bits ---------------------------------------------------------

function initials(user) {
  const source = user.fullName || user.username || user.email || "?";
  return source.trim().slice(0, 2).toUpperCase();
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-charcoal-900 dark:text-white/90">{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-surface-muted dark:text-white/40">{desc}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
          checked ? "bg-emerald-500" : "bg-surface-border dark:bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

// Reads a File, downsizes it on a canvas, and hands back a compact JPEG data
// URL — keeps avatar uploads well under the backend's size limit without
// asking the user to pre-resize their own photo.
function resizeImageToDataUrl(file, maxDim = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Profile tab -----------------------------------------------------------

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user.fullName || "");
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [developerProfile, setDeveloperProfile] = useState(user.developerProfile || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const { data } = await api.patch("/users/me/profile", { fullName, username, bio, developerProfile });
      updateUser(data.user);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update your profile.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const { data } = await api.put("/users/me/avatar", { dataUrl });
      updateUser(data.user);
      setMessage("Profile picture updated.");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Could not upload that image.");
    } finally {
      setUploading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    setError("");
    try {
      const { data } = await api.delete("/users/me/avatar");
      updateUser(data.user);
    } catch {
      setError("Could not remove your profile picture.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="panel p-6">
      <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">Profile</h2>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
        This information may be visible to others on your public profile page.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-2xl font-semibold text-white">
            {initials(user)}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-sm"
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          {user.avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="btn-ghost text-sm text-red-600 dark:text-red-400"
            >
              Remove photo
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={80}
            className="input-field"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">Username</label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-surface-muted dark:text-white/40">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              className="input-field"
              placeholder="yourusername"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            rows={3}
            className="input-field resize-none"
            placeholder="A short bio about you"
          />
          <p className="mt-1 text-right text-xs text-surface-muted dark:text-white/30">{bio.length}/300</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">
            Developer profile
          </label>
          <textarea
            value={developerProfile}
            onChange={(e) => setDeveloperProfile(e.target.value.slice(0, 500))}
            rows={3}
            className="input-field resize-none"
            placeholder="Languages you use, GitHub/portfolio links, what you're building…"
          />
          <p className="mt-1 text-right text-xs text-surface-muted dark:text-white/30">{developerProfile.length}/500</p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}

        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}

// --- Account tab -----------------------------------------------------------

function AccountTab() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const isLocal = user.provider === "local";

  const [email, setEmail] = useState(user.email || "");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  async function handleEmailSave(e) {
    e.preventDefault();
    setEmailError("");
    setEmailMessage("");
    setEmailSaving(true);
    try {
      const { data } = await api.put("/users/me/email", { email, password: emailPassword });
      updateUser(data.user);
      setEmailPassword("");
      setEmailMessage("Email updated.");
    } catch (err) {
      setEmailError(err?.response?.data?.message || "Could not update your email.");
    } finally {
      setEmailSaving(false);
      setTimeout(() => setEmailMessage(""), 3000);
    }
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwMessage, setPwMessage] = useState("");

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwError("");
    setPwMessage("");
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await api.put("/users/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwMessage("Password updated.");
    } catch (err) {
      setPwError(err?.response?.data?.message || "Could not update your password.");
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMessage(""), 3000);
    }
  }

  const [showDanger, setShowDanger] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(e) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      await api.delete("/users/me", { data: { confirm: confirmText, password: deletePassword } });
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Could not delete your account.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">Email</h2>
        <form onSubmit={handleEmailSave} className="mt-4 max-w-sm space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
          />
          {isLocal && (
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder="Current password"
              className="input-field"
              required
            />
          )}
          {emailError && <p className="text-sm text-red-600 dark:text-red-400">{emailError}</p>}
          {emailMessage && <p className="text-sm text-emerald-700 dark:text-emerald-400">{emailMessage}</p>}
          <button type="submit" disabled={emailSaving} className="btn-primary text-sm">
            {emailSaving ? "Saving…" : "Update email"}
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">Password</h2>
        {isLocal ? (
          <form onSubmit={handlePasswordSave} className="mt-4 max-w-sm space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="input-field"
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="input-field"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="input-field"
              required
            />
            {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}
            {pwMessage && <p className="text-sm text-emerald-700 dark:text-emerald-400">{pwMessage}</p>}
            <button type="submit" disabled={pwSaving} className="btn-primary text-sm">
              {pwSaving ? "Saving…" : "Update password"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-surface-muted dark:text-white/50">
            Your account signs in with {user.provider === "github" ? "GitHub" : "Google"} — there's no password to
            change here.
          </p>
        )}
      </div>

      <div className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">
              Two-factor authentication
            </h2>
            <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
              Status: <span className="font-medium">{user.totpEnabled ? "Enabled" : "Not enabled"}</span> (optional)
            </p>
          </div>
          <Link to="/settings/security" className="btn-secondary text-sm">
            Manage 2FA
          </Link>
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">Session</h2>
        <p className="mt-1 text-sm text-surface-muted dark:text-white/50">Sign out of Atheris on this device.</p>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/", { replace: true });
          }}
          className="btn-secondary mt-4 text-sm text-red-600 dark:text-red-400"
        >
          Log out
        </button>
      </div>

      <div className="panel border-red-300/50 p-6 dark:border-red-500/20">
        <h2 className="font-display text-lg font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
        <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
          Deleting your account permanently removes your profile, execution history, API keys, and webhooks. This
          can't be undone.
        </p>
        {!showDanger ? (
          <button
            type="button"
            onClick={() => setShowDanger(true)}
            className="btn-secondary mt-4 text-sm text-red-600 dark:text-red-400"
          >
            Delete account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="mt-4 max-w-sm space-y-3">
            {isLocal && (
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Current password"
                className="input-field"
                required
              />
            )}
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="input-field"
              required
            />
            {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting || confirmText !== "DELETE"}
                className="btn-primary bg-red-600 text-sm hover:bg-red-500 disabled:hover:bg-red-600"
              >
                {deleting ? "Deleting…" : "Permanently delete my account"}
              </button>
              <button type="button" onClick={() => setShowDanger(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// --- Appearance tab ----------------------------------------------------------

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm0 5.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm7.5 1a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1Zm-14 0a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1Zm10.6-6.1a1 1 0 0 1 1.4 1.4l-.7.7a1 1 0 0 1-1.4-1.4l.7-.7Zm-9.5 9.5a1 1 0 0 1 1.4 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7Zm9.5 2.1.7.7a1 1 0 0 1-1.4 1.4l-.7-.7a1 1 0 0 1 1.4-1.4ZM7.5 6.5l-.7-.7A1 1 0 1 1 8.2 4.4l.7.7A1 1 0 0 1 7.5 6.5ZM12 17a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.7 15.5A8.5 8.5 0 0 1 9.3 4.1c.3-.3.1-.8-.3-.9A9.7 9.7 0 1 0 21.6 15.9c-.1-.4-.6-.5-.9-.4Z" />
    </svg>
  );
}
function SystemIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    </svg>
  );
}

const APPEARANCE_OPTIONS = [
  { id: "light", label: "Light", icon: SunIcon },
  { id: "dark", label: "Dark", icon: MoonIcon },
  { id: "system", label: "System", icon: SystemIcon },
];

function AppearanceTab() {
  const { updateUser } = useAuth();
  const { mode, setMode } = useTheme();
  const [saving, setSaving] = useState(false);

  async function choose(next) {
    setMode(next);
    setSaving(true);
    try {
      const { data } = await api.put("/users/me/appearance", { appearance: next });
      updateUser(data.user);
    } catch {
      // The theme still applied locally — it just won't be remembered on
      // other devices/sessions until the save succeeds. Not worth blocking
      // the UI over.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel p-6">
      <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">Appearance</h2>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">Choose how Atheris looks on this device.</p>

      <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
        {APPEARANCE_OPTIONS.map((o) => {
          const Icon = o.icon;
          const active = mode === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition ${
                active
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-surface-border text-charcoal-700 hover:border-emerald-400/50 dark:border-white/10 dark:text-white/70"
              }`}
            >
              <Icon />
              {o.label}
            </button>
          );
        })}
      </div>
      {saving && <p className="mt-3 text-xs text-surface-muted dark:text-white/40">Saving…</p>}
    </div>
  );
}

// --- Editor tab --------------------------------------------------------------

const FONT_FAMILIES = ["JetBrains Mono", "Fira Code", "Source Code Pro", "Consolas", "Menlo", "monospace"];
const EDITOR_THEMES = [
  { id: "vs-dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "hc-black", label: "High contrast" },
];
const SHORTCUTS = [
  ["Run code", "Ctrl / Cmd + Enter"],
  ["Command palette", "Ctrl / Cmd + K"],
  ["Find", "Ctrl / Cmd + F"],
  ["Toggle line comment", "Ctrl / Cmd + /"],
  ["Format document", "Shift + Alt + F"],
  ["Multi-cursor", "Alt + Click"],
];

function EditorTab() {
  const { user, updateUser } = useAuth();
  const [prefs, setPrefs] = useState(user.editorPrefs);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function set(key, value) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const { data } = await api.put("/users/me/editor-prefs", prefs);
      updateUser(data.user);
      setPrefs(data.user.editorPrefs);
      setMessage("Editor preferences saved.");
    } catch {
      setMessage("Could not save editor preferences.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  return (
    <div className="panel p-6">
      <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">Editor preferences</h2>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">
        Applied the next time you open the code editor.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">Font size</label>
          <select value={prefs.fontSize} onChange={(e) => set("fontSize", Number(e.target.value))} className="input-field">
            {[12, 13, 14, 15, 16, 18, 20].map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">Font family</label>
          <select value={prefs.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} className="input-field">
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">Editor theme</label>
          <select
            value={prefs.editorTheme}
            onChange={(e) => set("editorTheme", e.target.value)}
            className="input-field"
          >
            {EDITOR_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal-800 dark:text-white/80">Tab size</label>
          <select value={prefs.tabSize} onChange={(e) => set("tabSize", Number(e.target.value))} className="input-field">
            {[2, 4, 8].map((s) => (
              <option key={s} value={s}>
                {s} spaces
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 divide-y divide-surface-border dark:divide-white/10">
        <Toggle
          label="Word wrap"
          desc="Wrap long lines instead of scrolling horizontally."
          checked={prefs.wordWrap}
          onChange={(v) => set("wordWrap", v)}
        />
        <Toggle
          label="Auto save"
          desc="Keep your current draft saved locally so a refresh never loses your work."
          checked={prefs.autoSave}
          onChange={(v) => set("autoSave", v)}
        />
        <Toggle
          label="Auto complete"
          desc="Show inline suggestions as you type."
          checked={prefs.autoComplete}
          onChange={(v) => set("autoComplete", v)}
        />
        <Toggle label="Line numbers" checked={prefs.lineNumbers} onChange={(v) => set("lineNumbers", v)} />
        <Toggle
          label="Minimap"
          desc="Show the code overview strip on the right edge of the editor."
          checked={prefs.minimap}
          onChange={(v) => set("minimap", v)}
        />
      </div>

      {message && <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary mt-4 text-sm">
        {saving ? "Saving…" : "Save editor preferences"}
      </button>

      <div className="mt-8 border-t border-surface-border pt-6 dark:border-white/10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-surface-muted dark:text-white/40">
          Keyboard shortcuts
        </h3>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {SHORTCUTS.map(([label, keys]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-surface-border py-1.5 text-sm last:border-0 dark:border-white/5 sm:border-0">
              <dt className="text-charcoal-700 dark:text-white/70">{label}</dt>
              <dd className="font-mono text-xs text-surface-muted dark:text-white/40">{keys}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// --- Notifications tab -------------------------------------------------------

function NotificationsTab() {
  const { user, updateUser } = useAuth();
  const [prefs, setPrefs] = useState(user.notifications);
  const [error, setError] = useState("");

  async function toggle(key, value) {
    setError("");
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      const { data } = await api.put("/users/me/notifications", { [key]: value });
      updateUser(data.user);
    } catch {
      setPrefs((p) => ({ ...p, [key]: !value }));
      setError("Could not save that preference — please try again.");
    }
  }

  return (
    <div className="panel p-6">
      <h2 className="font-display text-lg font-semibold text-charcoal-950 dark:text-white">Notifications</h2>
      <p className="mt-1 text-sm text-surface-muted dark:text-white/50">Choose what Atheris keeps you posted about.</p>

      <div className="mt-4 divide-y divide-surface-border dark:divide-white/10">
        <Toggle
          label="Email notifications"
          desc="General account and product updates."
          checked={prefs.email}
          onChange={(v) => toggle("email", v)}
        />
        <Toggle
          label="Security alerts"
          desc="New sign-ins, password changes, and two-factor authentication changes."
          checked={prefs.security}
          onChange={(v) => toggle("security", v)}
        />
        <Toggle
          label="Compiler updates"
          desc="New languages, features, and platform changes."
          checked={prefs.compilerUpdates}
          onChange={(v) => toggle("compilerUpdates", v)}
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
