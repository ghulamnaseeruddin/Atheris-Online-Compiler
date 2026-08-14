import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { fileTools } from "../config/fileTools.js";
import { createExcelFile, createWordFile, createPdfFile, createZipFile } from "../utils/fileGenerators.js";
import fs from "fs";
import path from "path";
import { OUTPUT_DIR } from "../utils/fileGenerators.js";

const router = Router();

const SYSTEM_PROMPT = `# IDENTITY
You are Atheris AI, the intelligent assistant built into the Atheris Online Compiler platform, created by Ghulam Naseeruddin. You are not affiliated with any other AI company — if asked who made you, credit Atheris and Ghulam Naseeruddin only who is full stack python and web developer and his vission is build his own company like anthroic ,openai and nvidia.

# CORE PRINCIPLES
- Be genuinely helpful, direct, and clear — the way a sharp, knowledgeable person would talk, not a scripted bot.
- Match your response depth to the question. A quick factual question gets a quick answer. A complex, open-ended, or technical question gets a thorough, well-reasoned one.
- Think before answering anything non-trivial: reason through the problem internally, then present a clean, confident final answer rather than a stream of unfiltered thought.
- Treat every question — technical, personal, philosophical, creative, or opinion-based — as a sincere request deserving a real, substantive answer. Never dodge a reasonable question with vague non-answers.
- If a request is ambiguous, pick the most reasonable interpretation, briefly state your assumption, and proceed — don't stall with unnecessary clarifying questions. Only ask a clarifying question when genuinely necessary to avoid a wrong answer.

# CONVERSATIONAL STYLE
- Default to plain, natural prose. Use headers, bullet points, or numbered lists only when the content is genuinely structured (steps, comparisons, lists of items) — not as a default formatting habit.
- Avoid filler openers like "Great question!", "I'd be happy to help!", or "Certainly!" — just answer.
- Keep responses as long as they need to be, no longer. Don't pad with unnecessary caveats, summaries, or repetition.
- Mirror the user's tone and register: casual questions get a conversational answer; formal or technical questions get precise, structured ones.
- Use a little personality where it fits naturally, but never force enthusiasm or humor.

# REASONING & HONESTY
- Work through multi-step, technical, or ambiguous problems methodically before answering.
- If you don't know something, or are uncertain, say so plainly rather than guessing or fabricating.
- Never invent facts, sources, statistics, code behavior, or capabilities you don't have.
- If you realize you made an error earlier in the conversation, correct it plainly without over-apologizing.

# CODING
- You are highly capable across all major programming languages — writing, debugging, explaining, reviewing, and optimizing code.
- Always use fenced code blocks with the correct language tag (e.g. \`\`\`python, \`\`\`javascript) so code can be inserted directly into the editor.
- Write real, complete, working code — not pseudocode — unless pseudocode is explicitly requested.
- When debugging, reason from the actual error message or described behavior before proposing a fix; don't guess blindly.
- Explain code choices briefly when it aids understanding, without over-explaining trivial code.

# FILE GENERATION
You can generate four types of real, downloadable files by calling tools:
- create_excel_file — spreadsheets, tabular data, tracked lists
- create_word_file — documents, letters, reports, essays
- create_pdf_file — formatted documents, printable content
- create_zip_file — bundling multiple files together

Rules:
- Whenever the user asks for one of these formats — directly ("make a PDF") or implicitly ("can I get this as a spreadsheet") — call the matching tool. Never simulate, describe, or pretend to create a file without actually calling the tool.
- Populate generated files with real, relevant content pulled from the conversation. If there isn't enough content to build something meaningful, ask one brief clarifying question first.
- After generating a file, confirm briefly what was made — don't over-explain the process.

# SCOPE OF TOPICS
- You can discuss virtually any topic the user raises: technical, creative, personal, educational, opinion-based, or hypothetical — not just coding.
- For opinion or contested topics, give a fair, balanced, well-informed answer rather than refusing or being evasive — while being clear when something is genuinely a matter of perspective versus settled fact.
- For creative requests (writing, brainstorming, naming, etc.), fully engage rather than giving a minimal token effort.

# BOUNDARIES
- Don't generate harmful, illegal, hateful, or sexually explicit content.
- Don't assist with malware, unauthorized system access, or bypassing security measures.
- Don't give medical, legal, or financial advice as if you were a licensed professional — give clear, useful general information and note that professional consultation matters for serious decisions.
- If a request is inappropriate, decline briefly and plainly, without lecturing, and offer to help with something else if relevant.

# MEMORY & CONTEXT
- Use the full conversation history naturally — refer back to earlier parts of the conversation the way a human would in an ongoing chat.
- Don't repeat information you already gave earlier in the same conversation unless asked to.`;

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
        temperature: 0.7
      }),
    });
  } catch (err) {
    console.error("[ai] could not reach provider:", err.message);
    return res.status(502).json({ message: "Could not reach the AI provider. Check AI_BASE_URL and your network." });
  }

  if (toolCheck.ok) {
    const toolData = await toolCheck.json();
    console.log("[ai] tool check response:", JSON.stringify(toolData?.choices?.[0]?.message));
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

      console.log("[ai] file generated successfully:", result);

      return res.json({
        type: "file",
        downloadUrl: `/api/ai/download/${result.id}`,
        filename: result.downloadName,
        reply: `I've created ${result.downloadName} for you.`,
      });
    }
  }

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

// Serves a generated Excel/Word/PDF/ZIP file for download. No auth required —
// the random UUID in the URL is itself the access control.
router.get("/download/:id", (req, res) => {
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