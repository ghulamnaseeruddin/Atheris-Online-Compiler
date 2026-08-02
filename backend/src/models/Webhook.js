import crypto from "crypto";
import { getDB } from "../config/db.js";

function rowToWebhook(row) {
  if (!row) return null;
  return {
    id: row.id,
    url: row.url,
    secret: row.secret,
    enabled: !!row.enabled,
    createdAt: row.created_at,
  };
}

export function create({ userId, url }) {
  const id = crypto.randomUUID();
  const secret = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  getDB()
    .prepare(`INSERT INTO webhooks (id, user_id, url, secret, created_at) VALUES (@id, @userId, @url, @secret, @now)`)
    .run({ id, userId, url, secret, now });
  return { id, url, secret, enabled: true, createdAt: now };
}

export function listForUser(userId) {
  const rows = getDB().prepare(`SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
  return rows.map(rowToWebhook);
}

export function listEnabledForUser(userId) {
  const rows = getDB()
    .prepare(`SELECT * FROM webhooks WHERE user_id = ? AND enabled = 1`)
    .all(userId);
  return rows.map(rowToWebhook);
}

export function remove(id, userId) {
  const result = getDB().prepare(`DELETE FROM webhooks WHERE id = ? AND user_id = ?`).run(id, userId);
  return result.changes > 0;
}

// Fire-and-forget delivery — a webhook failing (unreachable URL, 500, etc.)
// must never affect the /execute response the actual user is waiting on, so
// every call site treats this as best-effort and swallows delivery errors.
// Includes an HMAC-SHA256 signature (X-Atheris-Signature) over the raw JSON
// body so the receiver can verify the payload actually came from Atheris.
export async function deliver(webhook, payload) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
  try {
    await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Atheris-Signature": signature },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn(`[webhook] delivery to ${webhook.url} failed:`, err.message);
  }
}
