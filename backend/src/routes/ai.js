import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = Router();

const SYSTEM_PROMPT =
  "You are the Atheris AI assistant, embedded in the Atheris Online Compiler. " +
  "Help the user write, debug, and explain code in any programming language, and answer " +
  "general questions clearly and concisely. Always put code in fenced code blocks with a " +
  "language tag (e.g. ```python) so it can be inserted straight into the editor.";

// This endpoint is a thin proxy to any OpenAI-compatible /chat/completions API —
// it works unmodified with OpenAI itself, or with any drop-in replacement that
// speaks the same protocol (Groq, OpenRouter, Together AI, Fireworks, a local
// Ollama server, etc). Swap providers by changing AI_BASE_URL / AI_MODEL / AI_API_KEY
// in backend/.env — no code changes needed. See README "AI Assistant" section.
router.post("/chat", requireAuth, aiLimiter, async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "messages array is required." });
  }
  if (messages.length > 30) {
    return res.status(400).json({ message: "This conversation has gotten long — please start a new chat." });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      message:
        "The AI assistant isn't configured yet. Set AI_API_KEY (and optionally AI_BASE_URL / AI_MODEL) in backend/.env, then restart the server.",
    });
  }

  const baseURL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const maxTokens = Number(process.env.AI_MAX_TOKENS) || 1024;

  // Keep only the last 20 turns and cap each message's length — bounds token
  // usage per request regardless of what the client sends.
  const trimmed = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? "").slice(0, 8000),
  }));

  let upstream;
  try {
    upstream = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        stream: true,
        max_tokens: maxTokens,
      }),
    });
  } catch (err) {
    console.error("[ai] could not reach provider:", err.message);
    return res.status(502).json({ message: "Could not reach the AI provider. Check AI_BASE_URL and your network." });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("[ai] provider error:", upstream.status, detail.slice(0, 500));
    return res.status(502).json({
      message:
        upstream.status === 401 || upstream.status === 403
          ? "The AI provider rejected the API key — check AI_API_KEY in backend/.env."
          : "The AI provider returned an error.",
    });
  }

  // Stream the provider's SSE response straight through to the browser.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    console.error("[ai] stream error:", err.message);
  } finally {
    res.end();
  }
});

// Fast, non-streaming, single-shot completion used for inline "ghost text"
// autocomplete in the editor — deliberately separate from /chat, which is
// tuned for a back-and-forth conversation. Low max_tokens keeps latency
// tight enough to feel responsive as the user types (the frontend also
// debounces calls — see components/CodeEditor.jsx — so this isn't hit on
// every keystroke).
router.post("/complete", requireAuth, aiLimiter, async (req, res) => {
  const { language, prefix, suffix } = req.body;
  if (typeof prefix !== "string") {
    return res.status(400).json({ message: "prefix is required." });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    // Autocomplete silently no-ops without a key configured, rather than
    // surfacing an error toast on every keystroke — the chat panel already
    // explains how to set AI_API_KEY if the user goes looking.
    return res.json({ completion: "" });
  }

  const baseURL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  const prompt =
    `You are a code completion engine for ${language || "code"}. Given the code before and after the cursor, ` +
    `output ONLY the text that should be inserted at the cursor to continue it naturally — no explanation, ` +
    `no markdown fences, no repeating existing code. If nothing sensible completes it, output nothing.\n\n` +
    `--- CODE BEFORE CURSOR ---\n${String(prefix).slice(-2000)}\n--- CODE AFTER CURSOR ---\n${String(suffix || "").slice(0, 500)}`;

  try {
    const upstream = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.2,
        stream: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return res.json({ completion: "" });
    const data = await upstream.json();
    const completion = data?.choices?.[0]?.message?.content || "";
    res.json({ completion });
  } catch (err) {
    // Autocomplete failing silently is the right UX here — never block or
    // error the editor over a missed inline suggestion.
    res.json({ completion: "" });
  }
});

export default router;
