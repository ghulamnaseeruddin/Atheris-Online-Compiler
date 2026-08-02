import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const AIContext = createContext(null);

export function AIProvider({ children }) {
  const [open, setOpen] = useState(false);
  const insertHandlerRef = useRef(null);
  const [pendingCode, setPendingCode] = useState(null);
  const [queuedPrompt, setQueuedPrompt] = useState(null);

  // Lets any component (e.g. an "Explain this error" button) open the AI
  // panel and have it immediately send a prompt, without that component
  // needing to know anything about the panel's internal chat state.
  const askAI = useCallback(
    (prompt) => {
      setQueuedPrompt(prompt);
      setOpen(true);
    },
    [setOpen]
  );

  const consumeQueuedPrompt = useCallback(() => setQueuedPrompt(null), []);

  // The editor page registers itself here while mounted, so "Insert into
  // editor" can push code straight into the live CodeMirror/Monaco buffer
  // without the AI panel (which is global, mounted outside the router)
  // needing to know anything about editor internals.
  const registerInsertHandler = useCallback((fn) => {
    insertHandlerRef.current = fn;
  }, []);

  // Returns true if the code was inserted immediately (editor page is
  // mounted); false if it was only queued (caller should navigate to
  // /editor, where the queued code is picked up on mount).
  const insertCode = useCallback((code) => {
    if (insertHandlerRef.current) {
      insertHandlerRef.current(code);
      return true;
    }
    setPendingCode(code);
    return false;
  }, []);

  const consumePendingCode = useCallback(() => setPendingCode(null), []);

  return (
    <AIContext.Provider
      value={{
        open,
        setOpen,
        toggleOpen: () => setOpen((v) => !v),
        registerInsertHandler,
        insertCode,
        pendingCode,
        consumePendingCode,
        askAI,
        queuedPrompt,
        consumeQueuedPrompt,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAIPanel() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAIPanel must be used within an AIProvider");
  return ctx;
}
