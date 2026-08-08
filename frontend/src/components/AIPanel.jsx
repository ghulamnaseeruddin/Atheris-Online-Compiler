import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useAIPanel } from "../lib/AIContext";
import { streamAIChat, parseMessageSegments } from "../lib/aiClient";

function CodeBlock({ lang, content }) {
  const { insertCode } = useAIPanel();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can be unavailable (e.g. insecure context) — ignore
    }
  };

  const handleInsert = () => {
    const insertedDirectly = insertCode(content);
    if (!insertedDirectly) navigate("/editor");
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-surface-border dark:border-white/10">
      <div className="flex items-center justify-between bg-[#252526] px-3 py-1.5">
        <span className="font-mono text-xs text-white/50">{lang || "code"}</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-xs text-white/60 hover:text-white">
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={handleInsert} className="text-xs text-emerald-400 hover:text-emerald-300">
            Insert into editor
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto bg-[#1e1e1e] p-3 font-mono text-xs leading-relaxed text-white/90">
        {content}
      </pre>
    </div>
  );
}

function MessageBubble({ role, content, file }) {
  const segments = parseMessageSegments(content);
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-emerald-500 text-charcoal-950"
            : "bg-surface text-charcoal-950 dark:bg-charcoal-800 dark:text-white/90"
        }`}
      >
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <CodeBlock key={i} lang={seg.lang} content={seg.content} />
          ) : (
            seg.content.trim() && (
              <p key={i} className="whitespace-pre-wrap leading-relaxed">
                {seg.content.trim()}
              </p>
            )
          )
        )}
        {file && (
          
            href={file.url}
            download={file.name}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-charcoal-950 hover:bg-emerald-400"
          >
            📄 Download {file.name}
          </a>
        )}
      </div>
    </div>
  );
}

export default function AIPanel() {
  const { user } = useAuth();
  const { open, setOpen, queuedPrompt, consumeQueuedPrompt } = useAIPanel();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const send = useCallback(
    async (overrideText) => {
      const text = (overrideText ?? input).trim();
      if (!text || streaming) return;

      setErrorMsg("");
      const nextMessages = [...messages, { role: "user", content: text }];
      setMessages([...nextMessages, { role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      await streamAIChat(nextMessages, {
        signal: controller.signal,
        onDelta: (delta) => {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: copy[copy.length - 1].content + delta,
            };
            return copy;
          });
        },
        onDone: (result) => {
          setStreaming(false);
          if (result?.type === "file") {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: result.reply,
                file: { url: result.downloadUrl, name: result.filename },
              };
              return copy;
            });
          }
        },
        onError: (msg) => {
          setStreaming(false);
          setErrorMsg(msg);
          setMessages((prev) => prev.slice(0, -1)); // drop the empty assistant bubble
        },
      });
    },
    [input, streaming, messages]
  );

  // A queued prompt (e.g. from the "Explain this error" button in
  // OutputPanel) gets sent automatically as soon as the panel is open and
  // idle, so the user doesn't have to paste anything themselves.
  useEffect(() => {
    if (open && queuedPrompt && !streaming) {
      const prompt = queuedPrompt;
      consumeQueuedPrompt();
      send(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queuedPrompt, streaming]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!user) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed right-0 top-16 z-50 flex h-[calc(100vh-4rem)] w-full max-w-sm transform flex-col border-l border-surface-border bg-white shadow-2xl transition-transform duration-200 dark:border-white/10 dark:bg-charcoal-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="font-display text-sm font-semibold text-charcoal-950 dark:text-white">
              Atheris AI
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="rounded px-2 py-1 text-xs text-surface-muted hover:text-charcoal-950 dark:text-white/50 dark:hover:text-white"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded p-1 text-surface-muted hover:text-charcoal-950 dark:text-white/50 dark:hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-surface-muted dark:text-white/40">
              Ask me to write code, explain an error, or answer anything — I can insert code
              straight into your editor.
            </p>
          )}
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} file={m.file} />
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <p className="text-xs text-surface-muted dark:text-white/40">Thinking…</p>
          )}
          {errorMsg && (
            <p className="rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {errorMsg}
            </p>
          )}
        </div>

        <div className="border-t border-surface-border p-3 dark:border-white/10">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI assistant…"
              rows={2}
              className="input-field resize-none text-sm"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="btn-primary h-10 px-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}