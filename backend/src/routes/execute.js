import { Router } from "express";
import { runExecution } from "../execution/runExecution.js";
import { executeLimiter } from "../middleware/rateLimiter.js";
import { optionalAuthOrApiKey, requireAuth } from "../middleware/auth.js";
import * as History from "../models/History.js";
import * as Webhook from "../models/Webhook.js";

const router = Router();

const MAX_CODE_LENGTH = 100_000;
const MAX_STDIN_LENGTH = 20_000;
const MAX_TEST_CASES = 20;

router.post("/", optionalAuthOrApiKey, executeLimiter, async (req, res) => {
  const { language, code, stdin, fileName } = req.body;

  if (!language || typeof code !== "string") {
    return res.status(400).json({ message: "language and code are required." });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return res.status(413).json({ message: "Code exceeds the maximum allowed length." });
  }
  if (stdin && stdin.length > MAX_STDIN_LENGTH) {
    return res.status(413).json({ message: "stdin exceeds the maximum allowed length." });
  }

  const result = await runExecution({ language, code, stdin, fileName });

  // Only logged-in users (via session or personal API key) get history —
  // anonymous execution behaves exactly as it always did.
  if (req.user) {
    History.record({
      userId: req.user.id,
      language,
      code,
      stdin,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTimeMs: result.executionTimeMs,
    });
  }

  // Webhooks are only fired for API-key-authenticated calls (programmatic
  // use — CI, scripts) — not for interactive browser use, where a webhook
  // firing on every keystroke-triggered "Run" would be noise, not signal.
  // Fire-and-forget: never awaited into the response, never blocks it.
  if (req.apiKeyId && req.user) {
    for (const webhook of Webhook.listEnabledForUser(req.user.id)) {
      Webhook.deliver(webhook, {
        event: "execution.completed",
        language,
        status: result.status,
        executionTimeMs: result.executionTimeMs,
        stdout: result.stdout,
        stderr: result.stderr,
        timestamp: Date.now(),
      });
    }
  }

  res.json(result);
});

// Streaming variant of the same execution: instead of one JSON response
// after everything finishes, this sends newline-delimited JSON events
// (`{"type":"deps"|"build"|"stdout"|"stderr","chunk":"..."}`, then a final
// `{"type":"done", status, executionTimeMs}`) as they happen, so
// dependency-install and build output scroll in the client's terminal live
// instead of appearing all at once at the end.
//
// This is plain chunked HTTP (POST + a readable response stream), not
// EventSource/SSE — EventSource can't send a POST body or custom auth
// headers, and the code being run can be well over what's comfortable in a
// query string, so the frontend reads this with fetch()'s streaming body
// reader instead (see frontend/src/lib/streamExecute.js).
router.post("/stream", optionalAuthOrApiKey, executeLimiter, async (req, res) => {
  const { language, code, stdin, fileName } = req.body;

  if (!language || typeof code !== "string") {
    return res.status(400).json({ message: "language and code are required." });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return res.status(413).json({ message: "Code exceeds the maximum allowed length." });
  }
  if (stdin && stdin.length > MAX_STDIN_LENGTH) {
    return res.status(413).json({ message: "stdin exceeds the maximum allowed length." });
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Tells nginx (if this ever sits behind one, e.g. on some PaaS setups)
    // not to buffer the response — without this a reverse proxy can quietly
    // turn "streamed" back into "all at once at the end".
    "X-Accel-Buffering": "no",
  });

  const send = (event) => res.write(JSON.stringify(event) + "\n");
  let combinedStdout = "";
  let combinedStderr = "";

  try {
    const result = await runExecution({
      language,
      code,
      stdin,
      fileName,
      onOutput: (type, chunk) => {
        if (type === "stderr") combinedStderr += chunk;
        else combinedStdout += chunk;
        send({ type, chunk });
      },
    });
    send({ type: "done", status: result.status, executionTimeMs: result.executionTimeMs });

    if (req.user) {
      History.record({
        userId: req.user.id,
        language,
        code,
        stdin,
        status: result.status,
        stdout: combinedStdout,
        stderr: combinedStderr,
        executionTimeMs: result.executionTimeMs,
      });
    }
  } catch (err) {
    send({
      type: "done",
      status: "error",
      executionTimeMs: 0,
      message: "Something went wrong while running your code.",
    });
  } finally {
    res.end();
  }
});

// Runs the same code against multiple {stdin, expectedOutput} pairs — the
// "test case runner" feature. Each case is a normal, independent execution
// (no shared process/state between cases, same isolation as a single run);
// this endpoint just fans out N runExecution() calls and grades stdout
// against what was expected. Sequential, not parallel, so this can't be
// used to multiply the effective rate limit of the execute endpoint.
router.post("/test-cases", requireAuth, executeLimiter, async (req, res) => {
  const { language, code, fileName, cases } = req.body;

  if (!language || typeof code !== "string") {
    return res.status(400).json({ message: "language and code are required." });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return res.status(413).json({ message: "Code exceeds the maximum allowed length." });
  }
  if (!Array.isArray(cases) || cases.length === 0) {
    return res.status(400).json({ message: "At least one test case is required." });
  }
  if (cases.length > MAX_TEST_CASES) {
    return res.status(400).json({ message: `A maximum of ${MAX_TEST_CASES} test cases is supported per run.` });
  }

  const results = [];
  for (const testCase of cases) {
    const stdin = String(testCase.stdin ?? "").slice(0, MAX_STDIN_LENGTH);
    const expected = String(testCase.expectedOutput ?? "");
    const result = await runExecution({ language, code, stdin, fileName });
    // Trim trailing whitespace/newlines on both sides before comparing —
    // otherwise a program that's logically correct but ends with an extra
    // newline (extremely common) would show as failing every case.
    const actual = (result.stdout || "").trimEnd();
    const passed = result.status === "success" && actual === expected.trimEnd();
    results.push({ stdin, expectedOutput: expected, actualOutput: result.stdout, stderr: result.stderr, status: result.status, passed });
  }

  const passedCount = results.filter((r) => r.passed).length;
  res.json({ passedCount, totalCount: results.length, results });
});

export default router;
