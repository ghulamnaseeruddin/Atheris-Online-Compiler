import "dotenv/config";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import express from "express";
import cors from "cors";
import passport from "passport";
import { connectDB } from "./config/db.js";
import { configurePassport } from "./config/passport.js";

// Node 18+ tries IPv6 first by default. On networks/VPNs where IPv6 routing
// is broken but the OS still reports it as available, this causes outbound
// HTTPS requests to intermittently hang and reset ("socket hang up") — a
// very common cause of GitHub/Google OAuth failures on Windows. Preferring
// IPv4 first avoids that without disabling IPv6 entirely.
dns.setDefaultResultOrder("ipv4first");

// Belt-and-suspenders for the same class of bug: disable HTTP keep-alive on
// the default agents so outbound OAuth requests (token exchange, then the
// GitHub /user/emails follow-up call) never reuse a pooled socket that the
// remote server has already half-closed — the other common cause of
// "socket hang up" / ECONNRESET on Windows (often triggered by antivirus
// HTTPS-scanning features or certain VPNs/routers).
http.globalAgent.keepAlive = false;
https.globalAgent.keepAlive = false;

import authRoutes from "./routes/auth.js";
import executeRoutes from "./routes/execute.js";
import snippetRoutes from "./routes/snippets.js";
import aiRoutes from "./routes/ai.js";
import usersRoutes from "./routes/users.js";
import historyRoutes from "./routes/history.js";
import apiKeysRoutes from "./routes/apiKeys.js";
import webhooksRoutes from "./routes/webhooks.js";
import statsRoutes from "./routes/stats.js";

// Fail fast with a clear message rather than crashing later, mid-request,
// with a cryptic jsonwebtoken error (this is what "expiresIn should be a
// number of seconds..." usually actually means — JWT_SECRET was never set).
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error(
    "[startup] JWT_SECRET is missing from backend/.env — copy .env.example to .env and set it (e.g. `openssl rand -hex 32`)."
  );
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
// 3mb (not 1mb) because Settings → Profile lets users upload an avatar as a
// base64 data URL — base64 inflates raw bytes by ~33%, and the upload route
// itself caps the decoded image at ~1.5MB (see routes/users.js).
app.use(express.json({ limit: "3mb" }));

configurePassport();
app.use(passport.initialize());

app.get("/api/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api/auth", authRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/api-keys", apiKeysRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/stats", statsRoutes);

// Centralized error handler — keeps stack traces out of API responses.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.publicMessage || "Something went wrong." });
});

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] Atheris backend listening on port ${PORT}`);
  });
});