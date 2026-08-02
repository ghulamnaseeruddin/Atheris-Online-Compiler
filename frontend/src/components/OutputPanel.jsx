import React, { useState } from "react";
import { useAIPanel } from "../lib/AIContext";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";

export default function OutputPanel({ stdin, setStdin, result, running, supportsStdin, code, language, runnerLanguage, fileName }) {
  const [tab, setTab] = useState("output");
  const [cases, setCases] = useState([{ stdin: "", expectedOutput: "" }]);
  const [testResults, setTestResults] = useState(null);
  const [runningTests, setRunningTests] = useState(false);
  const { askAI } = useAIPanel();
  const { user } = useAuth();

  const hasError = result?.status === "error" && (result?.stderr || "").trim();

  function handleExplainError() {
    const prompt =
      `My ${language || "code"} program failed with this error. Explain what went wrong in plain English, ` +
      `then show the corrected code.\n\n` +
      `--- Code ---\n${code || ""}\n\n--- Error output ---\n${result.stderr}`;
    askAI(prompt);
  }

  function handleReviewCode() {
    const prompt =
      `Review this ${language || ""} code for bugs, style issues, and potential edge cases. ` +
      `Be specific and concise, and suggest concrete fixes.\n\n${code || ""}`;
    askAI(prompt);
  }

  function updateCase(i, field, value) {
    setCases((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  function addCase() {
    setCases((prev) => [...prev, { stdin: "", expectedOutput: "" }]);
  }

  function removeCase(i) {
    setCases((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function runTests() {
    setRunningTests(true);
    setTestResults(null);
    try {
      const { data } = await api.post("/execute/test-cases", {
        language: runnerLanguage,
        code,
        fileName,
        cases: cases.filter((c) => c.expectedOutput.trim() !== ""),
      });
      setTestResults(data);
    } catch (err) {
      setTestResults({ error: err?.response?.data?.message || "Could not run test cases." });
    } finally {
      setRunningTests(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-surface-border bg-white dark:border-white/10 dark:bg-charcoal-900">
      <div className="flex items-center gap-1 border-b border-surface-border px-2 pt-2 dark:border-white/10">
        {["output", ...(supportsStdin ? ["input"] : []), "tests"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-md px-3 py-1.5 text-sm font-medium capitalize ${
              tab === t
                ? "border border-b-0 border-surface-border bg-white text-emerald-700 dark:border-white/10 dark:bg-charcoal-900 dark:text-emerald-400"
                : "text-surface-muted hover:text-charcoal-900 dark:text-white/50 dark:hover:text-white/80"
            }`}
          >
            {t === "input" ? "stdin" : t}
          </button>
        ))}
        {user && (
          <button
            onClick={handleReviewCode}
            className="mb-1 rounded-full border border-emerald-600/30 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          >
            ✦ Review code
          </button>
        )}
        {hasError && user && (
          <button
            onClick={handleExplainError}
            className="mb-1 rounded-full border border-emerald-600/30 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          >
            ✦ Explain error
          </button>
        )}
        {result?.status && (
          <span
            className={`ml-auto mb-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              result.status === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : result.status === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                : "bg-surface text-surface-muted dark:bg-white/5 dark:text-white/50"
            }`}
          >
            {result.status}{result.status !== "running" && ` · ${result.executionTimeMs ?? 0}ms`}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono text-sm">
        {tab === "output" ? (
          result ? (
            <>
              {result.stdout && (
                <pre className="whitespace-pre-wrap text-charcoal-950 dark:text-white/90">{result.stdout}</pre>
              )}
              {result.stderr && (
                <pre className="mt-2 whitespace-pre-wrap text-red-600 dark:text-red-400">{result.stderr}</pre>
              )}
              {!result.stdout && !result.stderr && (
                <p className="text-surface-muted dark:text-white/50">
                  {running ? "Running…" : "Program finished with no output."}
                </p>
              )}
              {running && (result.stdout || result.stderr) && (
                <span className="inline-block h-4 w-1.5 animate-pulse bg-emerald-500 align-text-bottom" />
              )}
            </>
          ) : running ? (
            <p className="text-surface-muted dark:text-white/50">Running…</p>
          ) : (
            <p className="text-surface-muted dark:text-white/50">Run your code to see output here.</p>
          )
        ) : tab === "tests" ? (
          <div className="space-y-3">
            {!user ? (
              <p className="text-surface-muted dark:text-white/50">Log in to run test cases.</p>
            ) : (
              <>
                {cases.map((c, i) => (
                  <div key={i} className="rounded-md border border-surface-border p-2 dark:border-white/10">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-surface-muted dark:text-white/40">
                        Case {i + 1}
                      </span>
                      {cases.length > 1 && (
                        <button onClick={() => removeCase(i)} className="text-xs text-red-600 dark:text-red-400">
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      value={c.stdin}
                      onChange={(e) => updateCase(i, "stdin", e.target.value)}
                      placeholder="stdin (optional)"
                      rows={2}
                      className="mb-1 w-full resize-none rounded border border-surface-border bg-transparent p-1.5 text-xs outline-none dark:border-white/10"
                    />
                    <textarea
                      value={c.expectedOutput}
                      onChange={(e) => updateCase(i, "expectedOutput", e.target.value)}
                      placeholder="expected stdout"
                      rows={2}
                      className="w-full resize-none rounded border border-surface-border bg-transparent p-1.5 text-xs outline-none dark:border-white/10"
                    />
                    {testResults?.results?.[i] && (
                      <p
                        className={`mt-1 text-xs font-medium ${
                          testResults.results[i].passed
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {testResults.results[i].passed
                          ? "✓ Passed"
                          : `✗ Failed — got: ${testResults.results[i].actualOutput || "(nothing)"}`}
                      </p>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <button onClick={addCase} className="btn-secondary text-xs">
                    + Add case
                  </button>
                  <button onClick={runTests} disabled={runningTests} className="btn-primary text-xs disabled:opacity-50">
                    {runningTests ? "Running…" : "Run all tests"}
                  </button>
                  {testResults?.totalCount != null && (
                    <span className="text-xs text-surface-muted dark:text-white/50">
                      {testResults.passedCount}/{testResults.totalCount} passed
                    </span>
                  )}
                </div>
                {testResults?.error && <p className="text-xs text-red-600 dark:text-red-400">{testResults.error}</p>}
              </>
            )}
          </div>
        ) : (
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Provide stdin for your program, one value per line…"
            className="h-full w-full resize-none border-none bg-transparent p-0 text-sm text-charcoal-950 outline-none dark:text-white/90"
          />
        )}
      </div>
    </div>
  );
}
