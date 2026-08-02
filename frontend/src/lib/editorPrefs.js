// Mirrors DEFAULT_EDITOR_PREFS in backend/src/models/User.js. Kept in sync
// by hand since the two run in different runtimes — if you add a field here,
// add it there too (and vice versa).
export const DEFAULT_EDITOR_PREFS = {
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  editorTheme: "vs-dark",
  tabSize: 4,
  wordWrap: false,
  autoSave: true,
  autoComplete: true,
  lineNumbers: true,
  minimap: false,
};

export const DRAFT_STORAGE_KEY = "atheris_editor_draft_v1";
