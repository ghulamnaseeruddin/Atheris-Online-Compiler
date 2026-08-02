import crypto from "crypto";
import { getDB } from "../config/db.js";

// Plain repository functions over the `users` table — no ORM layer, since
// better-sqlite3's synchronous API makes one unnecessary. Row shape uses
// snake_case columns; toPublicJSON() maps to the camelCase shape the
// frontend already expects.

export const DEFAULT_EDITOR_PREFS = {
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  editorTheme: "vs-dark",
  tabSize: 4,
  wordWrap: false,
  autoSave: true,
  autoComplete: true,
  lineNumbers: true,
  minimap: false,
};

function parseEditorPrefs(json) {
  if (!json) return { ...DEFAULT_EDITOR_PREFS };
  try {
    return { ...DEFAULT_EDITOR_PREFS, ...JSON.parse(json) };
  } catch {
    return { ...DEFAULT_EDITOR_PREFS };
  }
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    provider: row.provider,
    providerId: row.provider_id,
    avatarUrl: row.avatar_url,
    passwordResetToken: row.password_reset_token,
    passwordResetExpires: row.password_reset_expires,
    totpSecret: row.totp_secret,
    totpEnabled: !!row.totp_enabled,
    fullName: row.full_name,
    bio: row.bio,
    developerProfile: row.developer_profile,
    phone: row.phone,
    appearance: row.appearance || "system",
    editorPrefs: parseEditorPrefs(row.editor_prefs_json),
    notifications: {
      email: row.notif_email === undefined || row.notif_email === null ? true : !!row.notif_email,
      security: row.notif_security === undefined || row.notif_security === null ? true : !!row.notif_security,
      compilerUpdates:
        row.notif_compiler_updates === undefined || row.notif_compiler_updates === null
          ? true
          : !!row.notif_compiler_updates,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicJSON(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    totpEnabled: user.totpEnabled,
    fullName: user.fullName || "",
    bio: user.bio || "",
    developerProfile: user.developerProfile || "",
    phone: user.phone || "",
    appearance: user.appearance || "system",
    editorPrefs: user.editorPrefs || { ...DEFAULT_EDITOR_PREFS },
    notifications: user.notifications || { email: true, security: true, compilerUpdates: true },
    createdAt: user.createdAt,
  };
}

export function setTotpSecret(id, secret) {
  getDB().prepare("UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?").run(secret, Date.now(), id);
}

export function setTotpEnabled(id, enabled) {
  getDB()
    .prepare("UPDATE users SET totp_enabled = ?, updated_at = ? WHERE id = ?")
    .run(enabled ? 1 : 0, Date.now(), id);
}

export function findById(id) {
  if (!id) return null;
  const row = getDB().prepare("SELECT * FROM users WHERE id = ?").get(id);
  return rowToUser(row);
}

export function findByUsername(username) {
  if (!username) return null;
  const row = getDB().prepare("SELECT * FROM users WHERE username = ?").get(username);
  return rowToUser(row);
}

export function findByEmailOrUsername({ email, username }) {
  const row = getDB()
    .prepare("SELECT * FROM users WHERE (email IS NOT NULL AND email = ?) OR (username IS NOT NULL AND username = ?)")
    .get(email || "\0", username || "\0");
  return rowToUser(row);
}

export function findByProviderId(provider, providerId) {
  const row = getDB()
    .prepare("SELECT * FROM users WHERE provider = ? AND provider_id = ?")
    .get(provider, providerId);
  return rowToUser(row);
}

export function findByEmail(email) {
  if (!email) return null;
  const row = getDB().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  return rowToUser(row);
}

export function findByResetToken(hashedToken) {
  const row = getDB()
    .prepare("SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > ?")
    .get(hashedToken, Date.now());
  return rowToUser(row);
}

export function create({ email, username, passwordHash, provider = "local", providerId, avatarUrl, phone }) {
  const id = crypto.randomUUID();
  const now = Date.now();
  getDB()
    .prepare(
      `INSERT INTO users (id, email, username, password_hash, provider, provider_id, avatar_url, phone, created_at, updated_at)
       VALUES (@id, @email, @username, @passwordHash, @provider, @providerId, @avatarUrl, @phone, @now, @now)`
    )
    .run({
      id,
      email: email ? email.toLowerCase() : null,
      username: username || null,
      passwordHash: passwordHash || null,
      provider,
      providerId: providerId || null,
      avatarUrl: avatarUrl || null,
      phone: phone || null,
      now,
    });
  return findById(id);
}

export function setResetToken(id, hashedToken, expiresAt) {
  getDB()
    .prepare("UPDATE users SET password_reset_token = ?, password_reset_expires = ?, updated_at = ? WHERE id = ?")
    .run(hashedToken, expiresAt, Date.now(), id);
}

export function updatePassword(id, passwordHash) {
  getDB()
    .prepare(
      "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = ? WHERE id = ?"
    )
    .run(passwordHash, Date.now(), id);
}

export function updateEmail(id, email) {
  getDB()
    .prepare("UPDATE users SET email = ?, updated_at = ? WHERE id = ?")
    .run(email ? email.toLowerCase() : null, Date.now(), id);
}

// --- Settings: Profile tab ---
export function updateProfile(id, { fullName, username, bio, developerProfile } = {}) {
  const current = findById(id);
  if (!current) return null;
  getDB()
    .prepare(
      `UPDATE users
       SET full_name = @fullName, username = @username, bio = @bio, developer_profile = @developerProfile,
           updated_at = @now
       WHERE id = @id`
    )
    .run({
      id,
      fullName: fullName !== undefined ? fullName : current.fullName,
      username: username !== undefined ? username : current.username,
      bio: bio !== undefined ? bio : current.bio,
      developerProfile: developerProfile !== undefined ? developerProfile : current.developerProfile,
      now: Date.now(),
    });
  return findById(id);
}

export function updateAvatar(id, avatarUrl) {
  getDB()
    .prepare("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?")
    .run(avatarUrl, Date.now(), id);
  return findById(id);
}

// --- Settings: Appearance tab ---
export function updateAppearance(id, appearance) {
  getDB()
    .prepare("UPDATE users SET appearance = ?, updated_at = ? WHERE id = ?")
    .run(appearance, Date.now(), id);
  return findById(id);
}

// --- Settings: Editor preferences tab ---
export function updateEditorPrefs(id, prefsPatch = {}) {
  const current = findById(id);
  if (!current) return null;
  const merged = { ...DEFAULT_EDITOR_PREFS, ...current.editorPrefs, ...prefsPatch };
  getDB()
    .prepare("UPDATE users SET editor_prefs_json = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(merged), Date.now(), id);
  return findById(id);
}

// --- Settings: Notifications tab ---
export function updateNotifications(id, patch = {}) {
  const current = findById(id);
  if (!current) return null;
  const merged = { ...current.notifications, ...patch };
  getDB()
    .prepare(
      "UPDATE users SET notif_email = ?, notif_security = ?, notif_compiler_updates = ?, updated_at = ? WHERE id = ?"
    )
    .run(merged.email ? 1 : 0, merged.security ? 1 : 0, merged.compilerUpdates ? 1 : 0, Date.now(), id);
  return findById(id);
}

export function deleteUser(id) {
  // ON DELETE CASCADE handles execution_history, api_keys, and webhooks.
  // snippets.owner_id is ON DELETE SET NULL, so previously-shared public
  // snippets survive as anonymous rather than vanishing.
  getDB().prepare("DELETE FROM users WHERE id = ?").run(id);
}
