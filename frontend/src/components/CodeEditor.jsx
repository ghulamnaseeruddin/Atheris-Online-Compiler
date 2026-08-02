import React from "react";
import Editor from "@monaco-editor/react";
import { DEFAULT_EDITOR_PREFS } from "../lib/editorPrefs";

export default function CodeEditor({ value, onChange, monacoId, prefs }) {
  const p = { ...DEFAULT_EDITOR_PREFS, ...prefs };

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-surface-border bg-[#1e1e1e] dark:border-white/10">
      <Editor
        height="100%"
        language={monacoId}
        theme={p.editorTheme}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: p.fontSize,
          fontFamily: `'${p.fontFamily}', monospace`,
          minimap: { enabled: p.minimap },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: p.tabSize,
          wordWrap: p.wordWrap ? "on" : "off",
          lineNumbers: p.lineNumbers ? "on" : "off",
          quickSuggestions: p.autoComplete,
          suggestOnTriggerCharacters: p.autoComplete,
          padding: { top: 12 },
        }}
      />
    </div>
  );
}
