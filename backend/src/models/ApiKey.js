import crypto from "crypto";
import { getDB } from "../config/db.js";

// Keys are shown to the user exactly once at creation time (like GitHub
// personal access tokens or Stripe secret keys) — only a SHA-256 hash is
// stored, so a database leak alone can't be used to authenticate as the
// user. `key_prefix` (first 10 chars) is kept in plaintext purely so the
// user can visually tell their keys apart in a list without re-revealing them.
const KEY_PREFIX = "ath_";

function hash(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

export function create({ userId, name }) {
  const raw = KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
  const id = crypto.randomUUID();
  const now = Date.now();

  getDB()
    .prepare(
      `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at)
       VALUES (@id, @userId, @name, @keyHash, @keyPrefix, @now)`
    )
    .run({ id, userId, name: name || "Untitled key", keyHash: hash(raw), keyPrefix: raw.slice(0, 10), now });

  // The raw key is only ever returned here, right after creation.
  return { id, name: name || "Untitled key", rawKey: raw, keyPrefix: raw.slice(0, 10), createdAt: now };
}

export function listForUser(userId) {
  const rows = getDB().prepare(`SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
  return rows.map(rowToKey);
}

export function findByRawKey(rawKey) {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;
  const row = getDB().prepare(`SELECT * FROM api_keys WHERE key_hash = ?`).get(hash(rawKey));
  if (!row) return null;
  return { id: row.id, userId: row.user_id, name: row.name };
}

export function touchLastUsed(id) {
  getDB().prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`).run(Date.now(), id);
}

export function revoke(id, userId) {
  const result = getDB().prepare(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`).run(id, userId);
  return result.changes > 0;
}
