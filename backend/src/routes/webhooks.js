import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as Webhook from "../models/Webhook.js";

const router = Router();
router.use(requireAuth);

const MAX_WEBHOOKS_PER_USER = 5;
const URL_RE = /^https:\/\/.+/;

router.get("/", async (req, res) => {
  res.json({ webhooks: Webhook.listForUser(req.user.id) });
});

router.post("/", async (req, res) => {
  const existing = Webhook.listForUser(req.user.id);
  if (existing.length >= MAX_WEBHOOKS_PER_USER) {
    return res.status(400).json({ message: `You can have at most ${MAX_WEBHOOKS_PER_USER} webhooks.` });
  }
  const { url } = req.body;
  if (!url || !URL_RE.test(url)) {
    return res.status(400).json({ message: "A valid https:// URL is required." });
  }
  const webhook = Webhook.create({ userId: req.user.id, url });
  res.status(201).json(webhook);
});

router.delete("/:id", async (req, res) => {
  const removed = Webhook.remove(req.params.id, req.user.id);
  if (!removed) return res.status(404).json({ message: "Webhook not found." });
  res.status(204).end();
});

export default router;
