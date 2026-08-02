import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LANGUAGES } from "../lib/languages";
import { streamExecute } from "../lib/streamExecute";

export default function Embed() {
  const { id } = useParams();
  const [snippet, setSnippet] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}/snippets/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setSnippet)
      .catch(() => setError("Snippet not found."));
  }, [id]);

  async function handleRun() {
    if (!snippet) return;
    setRunning(true);
    setResult({ status: "running", stdout: "", stderr: "" });
    const runner = LANGUAGES[snippet.language]?.runner || snippet.language;
    try {
      await streamExecute({ language: runner, code: snippet.code, stdin: snippet.stdin }, (event) => {
        if (event.type === "stdout" || event.type === "deps" || event.type === "build") {
          setResult((prev) => ({ ...prev, stdout: (prev?.stdout || "") + event.chunk }));
        } else if (event.type === "stderr") {
          setResult((prev) => ({ ...prev, stderr: (prev?.stderr || "") + event.chunk }));
        } else if (event.type === "done") {
          setResult((prev) => ({ ...prev, status: event.status, executionTimeMs: event.executionTimeMs }));
        }
      });
    } catch (err) {
      setResult({ status: "error", stdout: "", stderr: err?.message || "Something went wrong." });
    } finally {
      setRunning(false);
    }
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-[#1e1e1e] text-sm text-white/60">{error}</div>;
  }
  if (!snippet) {
    return <div className="flex h-screen items-center justify-center bg-[#1e1e1e] text-sm text-white/60">Loading…</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-[#1e1e1e] text-white/90">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-xs text-white/50">{snippet.language}</span>
        <div className="flex items-center gap-2">
          <a
            href={`/editor?snippet=${snippet.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:underline"
          >
            Open in Atheris ↗
          </a>
          <button
            onClick={handleRun}
            disabled={running}
            className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {running ? "Running…" : "▶ Run"}
          </button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-xs">{snippet.code}</pre>
      {result && (
        <div className="max-h-32 overflow-auto border-t border-white/10 p-3 font-mono text-xs">
          {result.stdout && <pre className="whitespace-pre-wrap">{result.stdout}</pre>}
          {result.stderr && <pre className="whitespace-pre-wrap text-red-400">{result.stderr}</pre>}
        </div>
      )}
    </div>
  );
}
