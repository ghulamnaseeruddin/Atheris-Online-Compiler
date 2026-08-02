import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as History from "../models/History.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const before = req.query.before ? Number(req.query.before) : undefined;
  res.json({ entries: History.listForUser(req.user.id, { limit, before }) });
});

router.get("/:id", async (req, res) => {
  const entry = History.findById(req.params.id, req.user.id);
  if (!entry) return res.status(404).json({ message: "History entry not found." });
  res.json(entry);
});

router.delete("/:id", async (req, res) => {
  History.remove(req.params.id, req.user.id);
  res.status(204).end();
});

router.delete("/", async (req, res) => {
  History.clearForUser(req.user.id);
  res.status(204).end();
});

export default router;
