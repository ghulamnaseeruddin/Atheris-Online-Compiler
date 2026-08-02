import { Router } from "express";
import { nanoid } from "nanoid";
import * as Snippet from "../models/Snippet.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", optionalAuth, async (req, res) => {
  const { language, code, stdin, title, isPublic, testCases } = req.body;
  if (!language || typeof code !== "string") {
    return res.status(400).json({ message: "language and code are required." });
  }
  if (code.length > 200_000) {
    return res.status(413).json({ message: "Snippet is too large to share." });
  }

  const snippet = Snippet.create({
    id: nanoid(10),
    language,
    code,
    stdin: stdin || "",
    title: title ? String(title).slice(0, 120) : null,
    isPublic: isPublic !== false,
    ownerId: req.user?.id || null,
    testCases: Array.isArray(testCases) ? testCases : [],
  });

  res.status(201).json({ id: snippet.id });
});

router.get("/:id", async (req, res) => {
  const snippet = Snippet.findById(req.params.id);
  if (!snippet) return res.status(404).json({ message: "Snippet not found." });
  res.json(snippet);
});

// Updates a snippet's code in place, only if the requester owns it — the
// previous version is automatically archived to snippet_revisions (see
// Snippet.updateCode), so this is how "version history" gets populated.
router.patch("/:id", requireAuth, async (req, res) => {
  const snippet = Snippet.findById(req.params.id);
  if (!snippet) return res.status(404).json({ message: "Snippet not found." });
  if (snippet.ownerId !== req.user.id) {
    return res.status(403).json({ message: "You don't own this snippet." });
  }
  const { code, stdin } = req.body;
  if (typeof code !== "string") return res.status(400).json({ message: "code is required." });

  const updated = Snippet.updateCode(req.params.id, { code, stdin: stdin || "" });
  res.json(updated);
});

router.get("/:id/revisions", requireAuth, async (req, res) => {
  const snippet = Snippet.findById(req.params.id);
  if (!snippet) return res.status(404).json({ message: "Snippet not found." });
  if (snippet.ownerId !== req.user.id) {
    return res.status(403).json({ message: "You don't own this snippet." });
  }
  res.json({ revisions: Snippet.listRevisions(req.params.id) });
});

// Forking requires auth (the fork needs an owner) — copies the snippet as
// a new one owned by the current user, like a GitHub Gist fork.
router.post("/:id/fork", requireAuth, async (req, res) => {
  const source = Snippet.findById(req.params.id);
  if (!source) return res.status(404).json({ message: "Snippet not found." });
  if (!source.isPublic && source.ownerId !== req.user.id) {
    return res.status(403).json({ message: "This snippet is private." });
  }

  const forked = Snippet.fork({ id: nanoid(10), sourceId: req.params.id, ownerId: req.user.id });
  res.status(201).json({ id: forked.id });
});

export default router;
