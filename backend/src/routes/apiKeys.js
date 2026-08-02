import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ApiKey from "../models/ApiKey.js";

const router = Router();

router.use(requireAuth);

const MAX_KEYS_PER_USER = 10;

router.get("/", async (req, res) => {
  res.json({ keys: ApiKey.listForUser(req.user.id) });
});

router.post("/", async (req, res) => {
  const existing = ApiKey.listForUser(req.user.id);
  if (existing.length >= MAX_KEYS_PER_USER) {
    return res.status(400).json({ message: `You can have at most ${MAX_KEYS_PER_USER} API keys. Revoke one first.` });
  }
  const { name } = req.body;
  const created = ApiKey.create({ userId: req.user.id, name: name ? String(name).slice(0, 60) : undefined });
  // rawKey is only ever sent in this one response — the client must show it
  // to the user now and tell them it won't be shown again.
  res.status(201).json(created);
});

router.delete("/:id", async (req, res) => {
  const revoked = ApiKey.revoke(req.params.id, req.user.id);
  if (!revoked) return res.status(404).json({ message: "Key not found." });
  res.status(204).end();
});

export default router;
