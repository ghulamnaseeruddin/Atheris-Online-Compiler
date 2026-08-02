import crypto from "crypto";
import { getDB } from "../config/db.js";

const MAX_REVISIONS_PER_SNIPPET = 50;

function rowToSnippet(row) {
  if (!row) return null;
  return {
    id: row.id,
    language: row.language,
    code: row.code,
    stdin: row.stdin,
    title: row.title,
    isPublic: !!row.is_public,
    ownerId: row.owner_id,
    forkOf: row.fork_of,
    testCases: row.test_cases_json ? JSON.parse(row.test_cases_json) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRevision(row) {
  if (!row) return null;
  return { id: row.id, code: row.code, stdin: row.stdin, createdAt: row.created_at };
}

export function create({
  id,
  language,
  code,
  stdin = "",
  title = null,
  isPublic = true,
  ownerId = null,
  forkOf = null,
  testCases = [],
}) {
  const now = Date.now();
  getDB()
    .prepare(
      `INSERT INTO snippets (id, language, code, stdin, title, is_public, owner_id, fork_of, test_cases_json, created_at, updated_at)
       VALUES (@id, @language, @code, @stdin, @title, @isPublic, @ownerId, @forkOf, @testCasesJson, @now, @now)`
    )
    .run({
      id,
      language,
      code,
      stdin,
      title,
      isPublic: isPublic ? 1 : 0,
      ownerId,
      forkOf,
      testCasesJson: testCases && testCases.length ? JSON.stringify(testCases.slice(0, 20)) : null,
      now,
    });
  return findById(id);
}

export function findById(id) {
  const row = getDB().prepare("SELECT * FROM snippets WHERE id = ?").get(id);
  return rowToSnippet(row);
}

// Snippets a user has chosen to keep public, newest first — powers their
// profile page at /u/:username. Private snippets (isPublic: false) never
// show up here even to other logged-in users, only to the owner via the
// authenticated history/snippets views.
export function listPublicByOwner(ownerId, { limit = 30 } = {}) {
  const rows = getDB()
    .prepare(`SELECT * FROM snippets WHERE owner_id = ? AND is_public = 1 ORDER BY created_at DESC LIMIT ?`)
    .all(ownerId, limit);
  return rows.map(rowToSnippet);
}

// Updates a snippet's code/stdin in place and archives the *previous*
// version into snippet_revisions first, so "version history" is a byproduct
// of normal saves rather than a separate thing the user has to remember to do.
export function updateCode(id, { code, stdin }) {
  const db = getDB();
  const current = findById(id);
  if (!current) return null;

  const now = Date.now();
  db.prepare(
    `INSERT INTO snippet_revisions (id, snippet_id, code, stdin, created_at) VALUES (@id, @snippetId, @code, @stdin, @now)`
  ).run({ id: crypto.randomUUID(), snippetId: id, code: current.code, stdin: current.stdin, now: current.updatedAt });

  db.prepare(`UPDATE snippets SET code = ?, stdin = ?, updated_at = ? WHERE id = ?`).run(code, stdin ?? "", now, id);

  // Trim old revisions so a heavily-edited snippet can't grow unbounded.
  db.prepare(
    `DELETE FROM snippet_revisions WHERE snippet_id = ? AND id NOT IN (
       SELECT id FROM snippet_revisions WHERE snippet_id = ? ORDER BY created_at DESC LIMIT ?
     )`
  ).run(id, id, MAX_REVISIONS_PER_SNIPPET);

  return findById(id);
}

export function listRevisions(snippetId, { limit = 50 } = {}) {
  const rows = getDB()
    .prepare(`SELECT * FROM snippet_revisions WHERE snippet_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(snippetId, limit);
  return rows.map(rowToRevision);
}

// Copies another user's (or your own) snippet into a brand-new snippet
// owned by `ownerId`, keeping a pointer back via fork_of — same idea as a
// GitHub fork/Gist fork.
export function fork({ id, sourceId, ownerId }) {
  const source = findById(sourceId);
  if (!source) return null;
  return create({
    id,
    language: source.language,
    code: source.code,
    stdin: source.stdin,
    title: source.title ? `${source.title} (fork)` : null,
    isPublic: true,
    ownerId,
    forkOf: sourceId,
    testCases: source.testCases,
  });
}
