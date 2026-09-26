import "dotenv/config";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import express from "express";
import cors from "cors";
import passport from "passport";
import path from "node:path"; // Imported native path module
import { fileURLToPath } from "node:url"; // Imported ESM url resolution helper

import { connectDB } from "./config/db.js";
import { configurePassport } from "./config/passport.js";

// Routes
import authRoutes from "./routes/auth.js";
import executeRoutes from "./routes/execute.js";
import snippetRoutes from "./routes/snippets.js";
import aiRoutes from "./routes/ai.js";
import usersRoutes from "./routes/users.js";
import historyRoutes from "./routes/history.js";
import apiKeysRoutes from "./routes/apiKeys.js";
import webhooksRoutes from "./routes/webhooks.js";
import statsRoutes from "./routes/stats.js";

// ESM __dirname declaration helper
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Node 18+ DNS / Network workarounds
dns.setDefaultResultOrder("ipv4first");
http.globalAgent.keepAlive = false;
https.globalAgent.keepAlive = false;

// Fail fast if JWT_SECRET is missing
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error(
    "[startup] JWT_SECRET is missing from backend/.env — copy .env.example to .env and set it (e.g. `openssl rand -hex 32`)."
  );
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);

// CONFIGURING CORS: 
app.use(
  cors({
    origin: [
      "http://localhost:5173", 
      "https://atheris-online-compiler-frontend.vercel.app", 
      /\.vercel\.app\$/ 
    ],
    credentials: true,
  })
);

// Body parser configuration
app.use(express.json({ limit: "3mb" }));

// Passport initialization
configurePassport();
app.use(passport.initialize());

// Health Check Route
app.get("/api/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// API Routing Setup
app.use("/api/auth", authRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/api-keys", apiKeysRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/stats", statsRoutes);

// MONOREPO INTEGRATION: Serve Vite's static production output files 
// This reads from /frontend/dist when running inside the /backend/src directory
app.use(express.static(path.join(__dirname, "..", "..", "frontend", "dist")));

// Centralized error handler — matches your exact custom handler middleware layout
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.publicMessage || "Something went wrong." });
});

// Catch-all SPA router: Any non-API route serves the frontend's main index.html file
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "frontend", "dist", "index.html"));
});

const PORT = process.env.PORT || 4000;

// Database Connection & Server Start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] Atheris backend listening on port ${PORT}`);
  });
});
