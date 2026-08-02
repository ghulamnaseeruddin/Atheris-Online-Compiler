import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import passport from "passport";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import * as User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

// --- Email + username + password signup (phone number optional) ---
router.post("/signup", authLimiter, async (req, res) => {
  const { email, username, password, phone } = req.body;

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ message: "Username must be 3–20 characters (letters, numbers, underscore)." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }
  if (phone && !PHONE_RE.test(phone)) {
    return res.status(400).json({ message: "Enter a valid phone number, or leave it blank." });
  }

  const existing = User.findByEmailOrUsername({ email: email.toLowerCase(), username });
  if (existing) {
    return res.status(409).json({ message: "An account with that email or username already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = User.create({
    email,
    username,
    passwordHash,
    provider: "local",
    phone: phone || undefined,
  });

  const token = signToken(user);
  res.status(201).json({ token, user: User.toPublicJSON(user) });
});

// --- Email-or-username + password login ---
router.post("/login", authLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ message: "Identifier and password are required." });
  }

  const user = User.findByEmailOrUsername({ email: identifier.toLowerCase(), username: identifier });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  if (user.totpEnabled) {
    const { totpCode } = req.body;
    if (!totpCode) {
      // Password was correct, but a second factor is required — the
      // frontend prompts for a code and resubmits the same request with
      // totpCode set, rather than us issuing a separate pending-auth token.
      return res.status(401).json({ requiresTotp: true, message: "Enter your 6-digit authenticator code." });
    }
    const ok = authenticator.check(String(totpCode).trim(), user.totpSecret);
    if (!ok) {
      return res.status(401).json({ requiresTotp: true, message: "Invalid authenticator code." });
    }
  }

  const token = signToken(user);
  res.json({ token, user: User.toPublicJSON(user) });
});

// --- Two-factor authentication (TOTP) ---

// Generates a new secret and a scannable QR code, but does NOT enable 2FA
// yet — that only happens once the user proves they scanned it correctly
// via /2fa/enable, so a user can't get locked out by a botched setup.
router.post("/2fa/setup", requireAuth, async (req, res) => {
  const secret = authenticator.generateSecret();
  User.setTotpSecret(req.user.id, secret);
  const label = req.user.username || req.user.email || req.user.id;
  const otpauthUrl = authenticator.keyuri(label, "Atheris Online Compiler", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  res.json({ secret, qrCodeDataUrl });
});

router.post("/2fa/enable", requireAuth, async (req, res) => {
  const { totpCode } = req.body;
  if (!req.user.totpSecret) {
    return res.status(400).json({ message: "Call /2fa/setup first." });
  }
  if (!totpCode || !authenticator.check(String(totpCode).trim(), req.user.totpSecret)) {
    return res.status(400).json({ message: "That code doesn't match — check your authenticator app and try again." });
  }
  User.setTotpEnabled(req.user.id, true);
  res.json({ message: "Two-factor authentication enabled." });
});

router.post("/2fa/disable", requireAuth, async (req, res) => {
  const { password } = req.body;
  if (req.user.passwordHash) {
    // Only require re-entering the password for local accounts that have
    // one — OAuth-only accounts (no passwordHash) skip this check since
    // there's no password to verify.
    const valid = password && (await bcrypt.compare(password, req.user.passwordHash));
    if (!valid) return res.status(401).json({ message: "Incorrect password." });
  }
  User.setTotpEnabled(req.user.id, false);
  User.setTotpSecret(req.user.id, null);
  res.json({ message: "Two-factor authentication disabled." });
});

// --- Current user ---
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: User.toPublicJSON(req.user) });
});

// --- Forgot password (issues a time-limited reset token; wiring up the
//     actual email send is left to your transactional email provider —
//     see README "Future roadmap") ---
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { identifier } = req.body;
  const user = User.findByEmailOrUsername({ email: (identifier || "").toLowerCase(), username: identifier });

  // Always respond 200 to avoid leaking account existence.
  if (!user) return res.json({ message: "If that account exists, a reset link has been sent." });

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
  User.setResetToken(user.id, hashed, Date.now() + 60 * 60 * 1000); // 1 hour

  // TODO: send `resetToken` via email using your provider (Postmark, SES, etc.)
  // Reset link shape: `${CLIENT_URL}/reset-password?token=${resetToken}&id=${user.id}`
  res.json({ message: "If that account exists, a reset link has been sent." });
});

router.post("/reset-password", authLimiter, async (req, res) => {
  const { id, token, password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const hashed = crypto.createHash("sha256").update(token || "").digest("hex");
  const user = User.findByResetToken(hashed);

  if (!user || user.id !== id) {
    return res.status(400).json({ message: "This reset link is invalid or has expired." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  User.updatePassword(user.id, passwordHash);

  res.json({ message: "Password updated. You can now log in." });
});

// --- OAuth: GitHub ---
router.get("/github", passport.authenticate("github", { session: false, scope: ["user:email"] }));
router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/oauth/callback?token=${token}`);
  }
);

// --- OAuth: Google ---
router.get("/google", passport.authenticate("google", { session: false, scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  (req, res) => {
    const token = signToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/oauth/callback?token=${token}`);
  }
);

export default router;
