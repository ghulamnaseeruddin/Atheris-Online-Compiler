import { Router } from "express";
import { getDB } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Personal usage stats — private to the requesting user. Never exposes
// other users' data; every query here is scoped by user_id.
router.get("/me", requireAuth, async (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  const totals = db
    .prepare(
      `SELECT COUNT(*) as totalRuns,
              SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount
       FROM execution_history WHERE user_id = ?`
    )
    .get(userId);

  const byLanguage = db
    .prepare(
      `SELECT language, COUNT(*) as count
       FROM execution_history WHERE user_id = ?
       GROUP BY language ORDER BY count DESC LIMIT 10`
    )
    .all(userId);

  // Runs per day for the last 30 days — powers a simple activity chart.
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const dailyRows = db
    .prepare(
      `SELECT (created_at / 86400000) as dayBucket, COUNT(*) as count
       FROM execution_history WHERE user_id = ? AND created_at > ?
       GROUP BY dayBucket ORDER BY dayBucket ASC`
    )
    .all(userId, thirtyDaysAgo);

  const daily = dailyRows.map((r) => ({ date: r.dayBucket * 86400000, count: r.count }));

  res.json({
    totalRuns: totals.totalRuns || 0,
    successCount: totals.successCount || 0,
    successRate: totals.totalRuns ? Math.round(((totals.successCount || 0) / totals.totalRuns) * 100) : 0,
    byLanguage,
    daily,
  });
});

// Public, anonymous, aggregate-only — no usernames, no code, no per-user
// breakdown. Just "what's popular across the platform right now".
router.get("/leaderboard", async (_req, res) => {
  const db = getDB();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const topLanguages = db
    .prepare(
      `SELECT language, COUNT(*) as count
       FROM execution_history WHERE created_at > ?
       GROUP BY language ORDER BY count DESC LIMIT 10`
    )
    .all(sevenDaysAgo);

  const totals = db
    .prepare(`SELECT COUNT(*) as totalRuns FROM execution_history WHERE created_at > ?`)
    .get(sevenDaysAgo);

  res.json({ windowDays: 7, totalRuns: totals.totalRuns || 0, topLanguages });
});

export default router;
