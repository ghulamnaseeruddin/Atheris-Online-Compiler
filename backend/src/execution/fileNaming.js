// Resolves the actual filename a run's source code gets written to. Every
// language defaults to "main.<ext>" if the user doesn't specify one, but
// the whole point of this module is to let that be overridden — see
// EditorPage's filename field on the frontend, threaded through
// POST /api/execute's `fileName` body field.
//
// `relativePath` is what actually gets written to disk inside the run's
// workDir — for most languages this is just the filename itself, but Rust
// (Cargo) requires source files to live in specific places, so its
// relativePath differs from its filename. Runners in runners/index.js
// receive both fileName and base (filename without extension) via ctx.

const LANGUAGE_EXTENSIONS = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  c: "c",
  cpp: "cpp",
  java: "java",
  go: "go",
  bash: "sh",
  ruby: "rb",
  php: "php",
  rust: "rs",
};

// Java requires the filename (minus extension) to be a valid Java
// identifier, since it must equal the public class name inside the file —
// that's a hard rule of the language itself, not something this server
// enforces on top of it. Everyone else just needs to be a safe filename.
const JAVA_IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const SAFE_BASENAME_RE = /^[A-Za-z0-9_-]+$/;
const MAX_LENGTH = 100;

export function defaultFileName(language) {
  const ext = LANGUAGE_EXTENSIONS[language];
  return ext ? `main.${ext}` : "main";
}

export function resolveFileName(language, requested) {
  const ext = LANGUAGE_EXTENSIONS[language];
  if (!ext) {
    // Language isn't in the extension table (e.g. not yet wired up on the
    // backend at all) — let the caller's own isSupported() check handle
    // that; this function only needs to produce something non-crashing.
    return { ok: true, fileName: requested || "main", base: (requested || "main").split(".")[0], relativePath: requested || "main" };
  }

  const trimmed = (requested || "").trim();

  if (!trimmed) {
    const fileName = `main.${ext}`;
    return { ok: true, fileName, base: "main", relativePath: relativePathFor(language, "main", fileName) };
  }

  if (trimmed.length > MAX_LENGTH) {
    return { ok: false, error: `Filename is too long (max ${MAX_LENGTH} characters).` };
  }
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..") || trimmed.includes("\0")) {
    return { ok: false, error: "Filename can't contain path separators or \"..\"." };
  }

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) {
    return { ok: false, error: `Filename must end in .${ext} (e.g. "app.${ext}").` };
  }
  const base = trimmed.slice(0, lastDot);
  const gotExt = trimmed.slice(lastDot + 1);

  if (gotExt.toLowerCase() !== ext) {
    return { ok: false, error: `${languageLabel(language)} files must end in ".${ext}" — got ".${gotExt}".` };
  }
  if (!SAFE_BASENAME_RE.test(base)) {
    return { ok: false, error: "Filename can only contain letters, digits, underscore, and hyphen." };
  }
  if (language === "java" && !JAVA_IDENTIFIER_RE.test(base)) {
    return {
      ok: false,
      error:
        "Java filenames must be valid identifiers (letters, digits, underscore — no hyphens, must start with a letter), because the filename has to match your public class name exactly.",
    };
  }

  const fileName = `${base}.${ext}`;
  return { ok: true, fileName, base, relativePath: relativePathFor(language, base, fileName) };
}

function relativePathFor(language, base, fileName) {
  // Cargo requires binaries to live under src/bin/<name>.rs (or the single
  // default src/main.rs) — writing every run to src/bin/<base>.rs, never
  // src/main.rs, means a custom filename always works uniformly instead of
  // needing separate logic for the "default name" vs "custom name" cases.
  if (language === "rust") return `src/bin/${fileName}`;
  return fileName;
}

function languageLabel(language) {
  return language.charAt(0).toUpperCase() + language.slice(1);
}
