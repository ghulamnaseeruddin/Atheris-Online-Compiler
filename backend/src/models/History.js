import crypto from "crypto";
import { getDB } from "../config/db.js";

function rowToEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    language: row.language,
    code: row.code,
    stdin: row.stdin,
    status: row.status,
    stdout: row.stdout,
    stderr: row.stderr,
    executionTimeMs: row.execution_time_ms,
    createdAt: row.created_at,
  };
}

const MAX_ENTRIES_PER_USER = 100;

export function record({ userId, language, code, stdin = "", status, stdout = "", stderr = "", executionTimeMs }) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const db = getDB();

  db.prepare(
    `INSERT INTO execution_history (id, user_id, language, code, stdin, status, stdout, stderr, execution_time_ms, created_at)
     VALUES (@id, @userId, @language, @code, @stdin, @status, @stdout, @stderr, @executionTimeMs, @now)`
  ).run({
    id,
    userId,
    language,
    // Cap what's stored — history is for quick recall, not unlimited log
    // retention, and this keeps rows small regardless of what the client sent.
    code: String(code).slice(0, 50_000),
    stdin: String(stdin).slice(0, 10_000),
    status,
    stdout: String(stdout).slice(0, 20_000),
    stderr: String(stderr).slice(0, 20_000),
    executionTimeMs: executionTimeMs ?? null,
    now,
  });

  // Trim to the most recent MAX_ENTRIES_PER_USER rows for this user so the
  // table can't grow unbounded for a single heavy user.
  db.prepare(
    `DELETE FROM execution_history
     WHERE user_id = ? AND id NOT IN (
       SELECT id FROM execution_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
     )`
  ).run(userId, userId, MAX_ENTRIES_PER_USER);

  return id;
}

export function listForUser(userId, { limit = 30, before } = {}) {
  const db = getDB();
  const rows = before
    ? db
        .prepare(
          `SELECT * FROM execution_history WHERE user_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`
        )
        .all(userId, before, limit)
    : db.prepare(`SELECT * FROM execution_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`).all(userId, limit);
  return rows.map(rowToEntry);
}

export function findById(id, userId) {
  const row = getDB().prepare(`SELECT * FROM execution_history WHERE id = ? AND user_id = ?`).get(id, userId);
  return rowToEntry(row);
}

export function remove(id, userId) {
  getDB().prepare(`DELETE FROM execution_history WHERE id = ? AND user_id = ?`).run(id, userId);
}

export function clearForUser(userId) {
  getDB().prepare(`DELETE FROM execution_history WHERE user_id = ?`).run(userId);
}
