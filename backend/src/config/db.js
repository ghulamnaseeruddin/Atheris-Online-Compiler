import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SQLite lives on disk as a single file — no external service to run or
// connection string to manage. Path is configurable via SQLITE_DB_PATH for
// deployments where you want the file outside the repo (e.g. a mounted
// volume on Render/Fly/Railway).
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, "..", "..", "data", "atheris.db");

let db;

export function getDB() {
  if (!db) {
    throw new Error("Database not initialized — call connectDB() before getDB().");
  }
  return db;
}

export async function connectDB() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT UNIQUE,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_id TEXT,
      avatar_url TEXT,
      password_reset_token TEXT,
      password_reset_expires INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_providerid
      ON users (provider, provider_id) WHERE provider_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      stdin TEXT NOT NULL DEFAULT '',
      title TEXT,
      is_public INTEGER NOT NULL DEFAULT 1,
      owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_snippets_owner ON snippets (owner_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS execution_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      stdin TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      stdout TEXT NOT NULL DEFAULT '',
      stderr TEXT NOT NULL DEFAULT '',
      execution_time_ms INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_history_user ON execution_history (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS snippet_revisions (
      id TEXT PRIMARY KEY,
      snippet_id TEXT NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      stdin TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_revisions_snippet ON snippet_revisions (snippet_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      secret TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks (user_id);
  `);

  // Lightweight migration for DBs created before `title`/`is_public` existed
  // on snippets — ALTER TABLE ... ADD COLUMN is a no-op error if the column
  // is already there, so this just swallows that specific case.
  for (const stmt of [
    "ALTER TABLE snippets ADD COLUMN title TEXT",
    "ALTER TABLE snippets ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE snippets ADD COLUMN test_cases_json TEXT",
    "ALTER TABLE snippets ADD COLUMN fork_of TEXT REFERENCES snippets(id) ON DELETE SET NULL",
    "ALTER TABLE users ADD COLUMN totp_secret TEXT",
    "ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0",
    // --- Settings page (Profile / Account / Appearance / Editor / Notifications) ---
    "ALTER TABLE users ADD COLUMN full_name TEXT",
    "ALTER TABLE users ADD COLUMN bio TEXT",
    "ALTER TABLE users ADD COLUMN developer_profile TEXT",
    "ALTER TABLE users ADD COLUMN appearance TEXT NOT NULL DEFAULT 'system'",
    "ALTER TABLE users ADD COLUMN editor_prefs_json TEXT",
    "ALTER TABLE users ADD COLUMN notif_email INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE users ADD COLUMN notif_security INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE users ADD COLUMN notif_compiler_updates INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE users ADD COLUMN phone TEXT",
  ]) {
    try {
      db.exec(stmt);
    } catch (err) {
      if (!/duplicate column name/i.test(err.message)) throw err;
    }
  }

  console.log(`[db] SQLite ready at ${DB_PATH}`);
  return db;
}
