import { Router } from "express";
import bcrypt from "bcryptjs";
import * as User from "../models/User.js";
import * as Snippet from "../models/Snippet.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// Data URLs only (no remote fetch), and capped well under the express.json
// body limit so one enormous "avatar" can't be used to exhaust memory.
const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024; // ~1.5MB decoded
const AVATAR_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/;

// NOTE: every /me route below must be registered before the public
// GET /:username route further down, otherwise Express would match
// "/me" against the ":username" param first.

// --- Current user (settings source of truth) ---
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: User.toPublicJSON(req.user) });
});

// --- Settings → Profile tab ---
router.patch("/me/profile", requireAuth, (req, res) => {
  const { fullName, username, bio, developerProfile } = req.body;

  if (username !== undefined && username !== req.user.username) {
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ message: "Username must be 3–20 characters (letters, numbers, underscore)." });
    }
    const existing = User.findByUsername(username);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ message: "That username is already taken." });
    }
  }

  if (fullName !== undefined && fullName.length > 80) {
    return res.status(400).json({ message: "Full name must be 80 characters or fewer." });
  }
  if (bio !== undefined && bio.length > 300) {
    return res.status(400).json({ message: "Bio must be 300 characters or fewer." });
  }
  if (developerProfile !== undefined && developerProfile.length > 500) {
    return res.status(400).json({ message: "Developer profile must be 500 characters or fewer." });
  }

  const updated = User.updateProfile(req.user.id, { fullName, username, bio, developerProfile });
  res.json({ user: User.toPublicJSON(updated) });
});

router.put("/me/avatar", requireAuth, (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl || typeof dataUrl !== "string") {
    return res.status(400).json({ message: "No image was provided." });
  }
  const match = AVATAR_DATA_URL_RE.exec(dataUrl);
  if (!match) {
    return res.status(400).json({ message: "Avatar must be a PNG, JPEG, WEBP, or GIF image." });
  }
  const approxBytes = Math.ceil((match[2].length * 3) / 4);
  if (approxBytes > MAX_AVATAR_BYTES) {
    return res.status(400).json({ message: "Image is too large — please use one under ~1.5MB." });
  }
  const updated = User.updateAvatar(req.user.id, dataUrl);
  res.json({ user: User.toPublicJSON(updated) });
});

router.delete("/me/avatar", requireAuth, (req, res) => {
  const updated = User.updateAvatar(req.user.id, null);
  res.json({ user: User.toPublicJSON(updated) });
});

// --- Settings → Account tab ---
router.put("/me/email", requireAuth, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (req.user.passwordHash) {
    const valid = password && (await bcrypt.compare(password, req.user.passwordHash));
    if (!valid) return res.status(401).json({ message: "Incorrect password." });
  }
  const existing = User.findByEmail(email);
  if (existing && existing.id !== req.user.id) {
    return res.status(409).json({ message: "That email is already in use by another account." });
  }
  User.updateEmail(req.user.id, email);
  res.json({ user: User.toPublicJSON(User.findById(req.user.id)) });
});

router.put("/me/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }
  if (req.user.passwordHash) {
    const valid = currentPassword && (await bcrypt.compare(currentPassword, req.user.passwordHash));
    if (!valid) return res.status(401).json({ message: "Current password is incorrect." });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  User.updatePassword(req.user.id, passwordHash);
  res.json({ message: "Password updated." });
});

router.delete("/me", requireAuth, async (req, res) => {
  const { password, confirm } = req.body;
  if (confirm !== "DELETE") {
    return res.status(400).json({ message: 'Type "DELETE" to confirm account deletion.' });
  }
  if (req.user.passwordHash) {
    const valid = password && (await bcrypt.compare(password, req.user.passwordHash));
    if (!valid) return res.status(401).json({ message: "Incorrect password." });
  }
  User.deleteUser(req.user.id);
  res.json({ message: "Your account has been deleted." });
});

// --- Settings → Appearance tab ---
router.put("/me/appearance", requireAuth, (req, res) => {
  const { appearance } = req.body;
  if (!["light", "dark", "system"].includes(appearance)) {
    return res.status(400).json({ message: "Appearance must be light, dark, or system." });
  }
  const updated = User.updateAppearance(req.user.id, appearance);
  res.json({ user: User.toPublicJSON(updated) });
});

// --- Settings → Editor preferences tab ---
router.put("/me/editor-prefs", requireAuth, (req, res) => {
  const patch = req.body || {};
  const updated = User.updateEditorPrefs(req.user.id, patch);
  res.json({ user: User.toPublicJSON(updated) });
});

// --- Settings → Notifications tab ---
router.put("/me/notifications", requireAuth, (req, res) => {
  const patch = req.body || {};
  const updated = User.updateNotifications(req.user.id, patch);
  res.json({ user: User.toPublicJSON(updated) });
});

// Public — no auth required. Only ever exposes what toPublicJSON() already
// exposes elsewhere (id, username, avatarUrl, provider — never email or
// password hash), plus the user's public snippets.
router.get("/:username", async (req, res) => {
  const user = User.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ message: "User not found." });

  const snippets = Snippet.listPublicByOwner(user.id, { limit: 30 });

  res.json({
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    memberSince: user.createdAt,
    snippets: snippets.map((s) => ({
      id: s.id,
      title: s.title,
      language: s.language,
      createdAt: s.createdAt,
    })),
  });
});

export default router;
