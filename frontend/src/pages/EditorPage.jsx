import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";
import LanguagePicker from "../components/LanguagePicker";
import OutputPanel from "../components/OutputPanel";
import api from "../lib/api";
import { streamExecute } from "../lib/streamExecute";
import { useAIPanel } from "../lib/AIContext";
import { useAuth } from "../lib/AuthContext";
import { DEFAULT_LANGUAGE, LANGUAGES, getStarter, defaultFileName } from "../lib/languages";
import { DRAFT_STORAGE_KEY } from "../lib/editorPrefs";

export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const initialLang = searchParams.get("lang") || DEFAULT_LANGUAGE;

  const [lang, setLang] = useState(initialLang in LANGUAGES ? initialLang : DEFAULT_LANGUAGE);
  const [code, setCode] = useState(getStarter(initialLang));
  const [fileName, setFileName] = useState(defaultFileName(initialLang in LANGUAGES ? initialLang : DEFAULT_LANGUAGE));
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [loadedSnippet, setLoadedSnippet] = useState(null); // { id, ownerId } once a shared snippet is loaded
  // EditorPage only ever renders behind RequireAuth, so `user` is always set here.
  const { user } = useAuth();
  const editorPrefs = user.editorPrefs;

  const langMeta = LANGUAGES[lang];
  const { registerInsertHandler, pendingCode, consumePendingCode } = useAIPanel();

  // Restore an autosaved draft — but only for a "blank" /editor visit (no
  // specific snippet or language requested), so an explicit link like
  // /editor?lang=python or a shared snippet always wins over the draft.
  useEffect(() => {
    if (!editorPrefs.autoSave) return;
    if (searchParams.get("snippet") || searchParams.get("lang")) return;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && draft.lang in LANGUAGES) {
        setLang(draft.lang);
        setCode(draft.code ?? getStarter(draft.lang));
        setStdin(draft.stdin ?? "");
        setFileName(draft.fileName || defaultFileName(draft.lang));
      }
    } catch {
      // A corrupt/unreadable draft just gets ignored — starter code stands.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave of the current buffer to localStorage, so a refresh
  // (or an accidental tab close) never loses work in progress.
  useEffect(() => {
    if (!editorPrefs.autoSave) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ lang, code, stdin, fileName, savedAt: Date.now() })
        );
      } catch {
        // Private browsing / storage quota exceeded — just skip this tick.
      }
    }, 600);
    return () => clearTimeout(t);
  }, [lang, code, stdin, fileName, editorPrefs.autoSave]);

  // Let the (globally-mounted) AI panel push code straight into this editor
  // while this page is active.
  useEffect(() => {
    registerInsertHandler((incomingCode) => setCode(incomingCode));
    return () => registerInsertHandler(null);
  }, [registerInsertHandler]);

  // If the AI panel queued code before this page was mounted (e.g. the user
  // clicked "Insert into editor" from another page), apply it now.
  useEffect(() => {
    if (pendingCode) {
      setCode(pendingCode);
      consumePendingCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load a shared snippet if ?snippet=<id> is present
  useEffect(() => {
    const snippetId = searchParams.get("snippet");
    if (!snippetId) return;
    api.get(`/snippets/${snippetId}`).then(({ data }) => {
      setLang(data.language);
      setCode(data.code);
      setStdin(data.stdin || "");
      setLoadedSnippet({ id: data.id, ownerId: data.ownerId });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLangChange(nextLang) {
    setLang(nextLang);
    setCode(getStarter(nextLang));
    setFileName(defaultFileName(nextLang));
    setResult(null);
    setLoadedSnippet(null);
  }

  async function handleRun() {
    setRunning(true);
    // "running" status here just drives the neutral badge in OutputPanel —
    // stdout/stderr below get appended to live as events arrive, so the
    // panel fills in as install/build/program output actually happens
    // instead of jumping from blank to complete.
    setResult({ status: "running", stdout: "", stderr: "" });
    try {
      await streamExecute({ language: langMeta.runner, code, stdin, fileName }, (event) => {
        if (event.type === "stdout" || event.type === "deps" || event.type === "build") {
          setResult((prev) => ({ ...prev, stdout: (prev?.stdout || "") + event.chunk }));
        } else if (event.type === "stderr") {
          setResult((prev) => ({ ...prev, stderr: (prev?.stderr || "") + event.chunk }));
        } else if (event.type === "done") {
          setResult((prev) => ({
            ...prev,
            status: event.status,
            executionTimeMs: event.executionTimeMs,
            ...(event.message ? { stderr: (prev?.stderr || "") + event.message } : {}),
          }));
        }
      });
    } catch (err) {
      setResult((prev) => ({
        status: "error",
        stdout: prev?.stdout || "",
        stderr: (prev?.stderr || "") + (err?.message || "Something went wrong while running your code."),
      }));
    } finally {
      setRunning(false);
    }
  }

  async function handleShare() {
    setShareStatus("Generating link…");
    try {
      const { data } = await api.post("/snippets", { language: lang, code, stdin });
      const url = `${window.location.origin}/editor?snippet=${data.id}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      setShareStatus("Link copied to clipboard!");
    } catch {
      setShareStatus("Could not create share link.");
    } finally {
      setTimeout(() => setShareStatus(""), 3000);
    }
  }

  async function handleFork() {
    if (!loadedSnippet) return;
    setShareStatus("Forking…");
    try {
      const { data } = await api.post(`/snippets/${loadedSnippet.id}/fork`);
      window.location.href = `/editor?snippet=${data.id}`;
    } catch {
      setShareStatus("Could not fork this snippet.");
      setTimeout(() => setShareStatus(""), 3000);
    }
  }

  async function handleGetEmbedCode() {
    setShareStatus("Generating embed…");
    try {
      const { data } = await api.post("/snippets", { language: lang, code, stdin });
      const embedUrl = `${window.location.origin}/embed/${data.id}`;
      const iframeTag = `<iframe src="${embedUrl}" width="100%" height="400" style="border:1px solid #ddd;border-radius:8px;"></iframe>`;
      await navigator.clipboard.writeText(iframeTag).catch(() => {});
      setShareStatus("Embed code copied to clipboard!");
    } catch {
      setShareStatus("Could not create embed link.");
    } finally {
      setTimeout(() => setShareStatus(""), 3000);
    }
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || defaultFileName(lang);
    a.click();
    URL.revokeObjectURL(url);
  }

  const livePreviewDoc = useMemo(() => (langMeta.livePreview ? code : null), [code, langMeta]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-surface dark:bg-charcoal-950">
      <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-white px-4 py-2.5 dark:border-white/10 dark:bg-charcoal-900">
        <div className="flex items-center gap-3">
          <LanguagePicker value={lang} onChange={handleLangChange} />
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onBlur={() => {
              if (!fileName.trim()) setFileName(defaultFileName(lang));
            }}
            spellCheck={false}
            title={`Filename to run — must end in .${langMeta.extension || "?"}`}
            className="w-32 rounded-md border border-surface-border bg-transparent px-2 py-1 font-mono text-sm text-charcoal-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:text-white/80 sm:w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          {shareStatus && <span className="text-xs text-surface-muted dark:text-white/50">{shareStatus}</span>}
          {loadedSnippet && user && loadedSnippet.ownerId !== user.id && (
            <button onClick={handleFork} className="btn-secondary">
              Fork
            </button>
          )}
          <button onClick={handleGetEmbedCode} className="btn-secondary">
            Embed
          </button>
          <button onClick={handleDownload} className="btn-secondary">
            Download
          </button>
          <button onClick={handleShare} className="btn-secondary">
            Share
          </button>
          <button onClick={handleRun} disabled={running} className="btn-primary">
            {running ? "Running…" : "▶ Run"}
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-2">
        <CodeEditor value={code} onChange={setCode} monacoId={langMeta.monacoId} prefs={editorPrefs} />

        {langMeta.livePreview ? (
          <div className="overflow-hidden rounded-lg border border-surface-border bg-white dark:border-white/10">
            <iframe title="live-preview" className="h-full w-full" sandbox="allow-scripts" srcDoc={livePreviewDoc} />
          </div>
        ) : (
          <OutputPanel
            stdin={stdin}
            setStdin={setStdin}
            result={result}
            running={running}
            supportsStdin={langMeta.stdin}
            code={code}
            language={langMeta.name || lang}
            runnerLanguage={langMeta.runner}
            fileName={fileName}
          />
        )}
      </div>
    </div>
  );
}
