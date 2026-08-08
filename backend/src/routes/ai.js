import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { fileTools } from "../config/fileTools.js";
import { createExcelFile, createWordFile, createPdfFile, createZipFile } from "../utils/fileGenerators.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OUTPUT_DIR } from "../utils/fileGenerators.js";

const router = Router();

const SYSTEM_PROMPT =
  "You are the Atheris AI assistant, embedded in the Atheris Online Compiler. " +
  "Help the user write, debug, and explain code in any programming language, and answer " +
  "general questions clearly and concisely. Always put code in fenced code blocks with a " +
  "language tag (e.g. ```python) so it can be inserted straight into the editor. " +
  "If the user asks you to create an Excel, Word, PDF, or ZIP file, use the matching tool " +
  "to actually generate it — never pretend to make one without calling the tool.";

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

  const trimmed = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? "").slice(0, 8000),
  }));

  // First, ask the AI (without streaming) whether this message wants a file.
  let toolCheck;
  try {
    toolCheck = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        tools: fileTools,
        stream: false,
        max_tokens: maxTokens,
      }),
    });
  } catch (err) {
    console.error("[ai] could not reach provider:", err.message);
    return res.status(502).json({ message: "Could not reach the AI provider. Check AI_BASE_URL and your network." });
  }

  if (toolCheck.ok) {
    const toolData = await toolCheck.json();
    const choice = toolData?.choices?.[0]?.message;

    if (choice?.tool_calls?.length > 0) {
      const call = choice.tool_calls[0];
      const args = JSON.parse(call.function.arguments);
      let result;

      try {
        if (call.function.name === "create_excel_file") result = await createExcelFile(args);
        if (call.function.name === "create_word_file") result = await createWordFile(args);
        if (call.function.name === "create_pdf_file") result = await createPdfFile(args);
        if (call.function.name === "create_zip_file") result = await createZipFile(args);
      } catch (err) {
        console.error("[ai] file generation failed:", err.message);
        return res.status(500).json({ message: "Failed to generate the file." });
      }

      return res.json({
        type: "file",
        downloadUrl: `/api/ai/download/${result.id}`,
        filename: result.downloadName,
        reply: `I've created ${result.downloadName} for you.`,
      });
    }
  }

  // No file requested — fall through to the normal streaming chat response.
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

// Serves a generated Excel/Word/PDF/ZIP file for download.
router.get("/download/:id", requireAuth, (req, res) => {
  const files = fs.readdirSync(OUTPUT_DIR);
  const match = files.find((f) => f.startsWith(req.params.id));
  if (!match) return res.status(404).json({ message: "File not found or expired." });
  res.download(path.join(OUTPUT_DIR, match));
});

router.post("/complete", requireAuth, aiLimiter, async (req, res) => {
  const { language, prefix, suffix } = req.body;
  if (typeof prefix !== "string") {
    return res.status(400).json({ message: "prefix is required." });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
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
    res.json({ completion: "" });
  }
});

export default router;