import { spawn } from "child_process";
import { promises as fsp } from "fs";
import path from "path";

const INSTALL_TIMEOUT_MS = Number(process.env.DEPENDENCY_INSTALL_TIMEOUT_MS || 120_000);
// Ceiling on how many distinct packages one run can trigger installs for.
// This is an abuse/DoS guard (so one snippet can't queue up hundreds of
// installs), not a content restriction — any package name that passes it
// is attempted, for every language below.
const MAX_PACKAGES_PER_RUN = Number(process.env.MAX_PACKAGES_PER_RUN || 10);

// Registry package/module names can contain letters, digits, `. _ -`, and
// (for npm) an `@scope/` prefix. This is just enough validation that a name
// can never be mistaken for a CLI flag or path segment — it does NOT limit
// *which* packages can be installed. spawn() is used everywhere below
// (never a shell), so there's no command-injection path regardless; this is
// a format check, not a safety allowlist.
const SAFE_NAME_RE = /^(@[a-z0-9][\w.-]*\/)?[A-Za-z0-9][\w.-]*$/;
function isSafeName(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 214 && SAFE_NAME_RE.test(name);
}

// `onChunk`, when given, is called synchronously with each raw stdout/
// stderr chunk as it arrives — this is what lets a caller stream install
// progress live instead of only seeing it after the process exits.
function run(cmd, args, opts = {}, onChunk) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { timeout: INSTALL_TIMEOUT_MS, ...opts });
    let log = "";
    const capture = (d) => {
      const s = d.toString();
      log += s;
      onChunk?.(s);
    };
    child.stdout?.on("data", capture);
    child.stderr?.on("data", capture);
    child.on("close", (code) => resolve({ ok: code === 0, log }));
    child.on("error", (err) => resolve({ ok: false, log: err.message }));
  });
}

/* ------------------------------------------------------------------ *
 * Python — pip
 * ------------------------------------------------------------------ */

let _stdlibCache = null;
async function pythonStdlibModules() {
  if (_stdlibCache) return _stdlibCache;
  const { ok, log } = await run("python3", [
    "-c",
    "import sys, json; print(json.dumps(sorted(sys.stdlib_module_names)))",
  ]);
  _stdlibCache = ok ? new Set(JSON.parse(log)) : new Set();
  return _stdlibCache;
}

// Import name -> real PyPI distribution name, for the well-known cases
// where they differ (e.g. `import cv2` but `pip install opencv-python`).
// This is a translation table, not a restriction: any import not listed
// here is simply installed under its own name, which is correct for the
// overwhelming majority of PyPI packages. Add to this list; don't treat it
// as a ceiling on what's installable.
const PY_IMPORT_TO_PACKAGE = {
  cv2: "opencv-python-headless",
  PIL: "Pillow",
  sklearn: "scikit-learn",
  bs4: "beautifulsoup4",
  yaml: "PyYAML",
  Crypto: "pycryptodome",
  dotenv: "python-dotenv",
  jwt: "PyJWT",
  serial: "pyserial",
  git: "GitPython",
  docx: "python-docx",
  pptx: "python-pptx",
  fitz: "PyMuPDF",
  telegram: "python-telegram-bot",
  discord: "discord.py",
  attr: "attrs",
  OpenSSL: "pyOpenSSL",
  websocket: "websocket-client",
  dateutil: "python-dateutil",
  Levenshtein: "python-Levenshtein",
  markdown: "Markdown",
};

function extractPythonImports(code) {
  const names = new Set();
  const importRe = /^\s*import\s+([^\n#]+)/gm;
  const fromRe = /^\s*from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import/gm;
  let m;
  while ((m = importRe.exec(code))) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.add(name.split(".")[0]);
    }
  }
  while ((m = fromRe.exec(code))) {
    names.add(m[1].split(".")[0]);
  }
  return [...names];
}

// Installs every third-party import the script uses — not a curated list —
// into a scratch directory scoped to *this run* (`pip install --target`)
// rather than the shared interpreter's global site-packages. That's the
// important part: it means one user's install can never shadow or persist
// into another user's run, so opening this up to arbitrary package names
// doesn't create a way for one request to leave anything behind for the
// next one. Returns a log to prepend to the program's output, and the
// directory the caller should put on PYTHONPATH for the run.
export async function ensurePythonDependencies(code, workDir, onLog) {
  const stdlib = await pythonStdlibModules();
  const imports = extractPythonImports(code).filter((n) => n !== "__future__" && !stdlib.has(n));
  const candidates = imports.filter(isSafeName).slice(0, MAX_PACKAGES_PER_RUN);
  if (candidates.length === 0) return { log: "", depsDir: null };

  const depsDir = path.join(workDir, ".deps");
  const packages = candidates.map((name) => PY_IMPORT_TO_PACKAGE[name] || name);

  onLog?.(`[deps] pip install ${packages.join(" ")}\n`);
  const { ok, log } = await run(
    "python3",
    ["-m", "pip", "install", "--disable-pip-version-check", "--no-input", "--target", depsDir, ...packages],
    {},
    onLog
  );

  const summary = ok
    ? `[deps] pip install: ${packages.join(", ")}\n`
    : `[deps] pip install failed for one or more of: ${packages.join(", ")}\n${log.slice(-800)}\n`;

  return { log: summary, depsDir: ok ? depsDir : null };
}

/* ------------------------------------------------------------------ *
 * JavaScript / TypeScript — npm
 * ------------------------------------------------------------------ */

let _builtinsCache = null;
async function nodeBuiltinModules() {
  if (_builtinsCache) return _builtinsCache;
  const { ok, log } = await run("node", ["-e", "console.log(JSON.stringify(require('module').builtinModules))"]);
  _builtinsCache = ok ? new Set(JSON.parse(log)) : new Set();
  return _builtinsCache;
}

function extractNodeImports(code) {
  const names = new Set();
  const reqRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const importRe = /import(?:[\s\S]*?from)?\s*['"]([^'"]+)['"]/g;
  for (const re of [reqRe, importRe]) {
    let m;
    while ((m = re.exec(code))) {
      const spec = m[1];
      if (!spec || spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) continue;
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      names.add(pkg);
    }
  }
  return [...names];
}

// Installs missing packages straight into <workDir>/node_modules, which
// Node resolves automatically. Like the Python path above, this is scoped
// to the run's own scratch directory (deleted with everything else in
// runExecution's `finally`), never the shared server — so, again, no
// cross-request persistence regardless of what gets installed.
export async function ensureNodeDependencies(code, workDir, onLog) {
  const builtins = await nodeBuiltinModules();
  const imports = extractNodeImports(code).filter((n) => !builtins.has(n));
  const candidates = imports.filter(isSafeName).slice(0, MAX_PACKAGES_PER_RUN);
  if (candidates.length === 0) return { log: "" };

  onLog?.(`[deps] npm install ${candidates.join(" ")}\n`);
  const { ok, log } = await run(
    "npm",
    ["install", "--no-save", "--no-audit", "--no-fund", "--loglevel=notice", ...candidates],
    { cwd: workDir },
    onLog
  );

  const summary = ok
    ? `[deps] npm install: ${candidates.join(", ")}\n`
    : `[deps] npm install failed for one or more of: ${candidates.join(", ")}\n${log.slice(-800)}\n`;

  return { log: summary };
}

/* ------------------------------------------------------------------ *
 * Ruby — gem
 * ------------------------------------------------------------------ */

function extractRubyRequires(code) {
  const names = new Set();
  // `require 'x'`, not `require_relative` (that's always a local file).
  const re = /(?<!_)\brequire\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("/")) continue;
    names.add(spec.split("/")[0]);
  }
  return [...names];
}

async function rubyCanRequire(name, env) {
  const { ok } = await run("ruby", ["-e", `require '${name}'`], { env });
  return ok;
}

// Ruby (unlike Go/Cargo below) doesn't fetch anything on `require` by
// itself, so — same shape as Python/Node above — we scan for `require`
// calls, install whatever isn't already loadable, and point the run at it.
// gem's `--install-dir` puts everything under <workDir>/.gems, scoped to
// this run only; GEM_PATH/GEM_HOME point the interpreter at it without
// touching the system gem set.
export async function ensureRubyDependencies(code, workDir, onLog) {
  const gemsDir = path.join(workDir, ".gems");
  const baseEnv = { ...process.env, GEM_HOME: gemsDir, GEM_PATH: gemsDir };

  const required = extractRubyRequires(code).filter(isSafeName).slice(0, MAX_PACKAGES_PER_RUN);
  const missing = [];
  for (const name of required) {
    if (!(await rubyCanRequire(name, baseEnv))) missing.push(name);
  }
  if (missing.length === 0) return { log: "", extraEnv: {} };

  onLog?.(`[deps] gem install ${missing.join(" ")}\n`);
  const { ok, log } = await run(
    "gem",
    ["install", "--install-dir", gemsDir, "--no-document", "--conservative", ...missing],
    { env: baseEnv },
    onLog
  );

  const summary = ok
    ? `[deps] gem install: ${missing.join(", ")}\n`
    : `[deps] gem install failed for one or more of: ${missing.join(", ")}\n${log.slice(-800)}\n`;

  return { log: summary, extraEnv: { GEM_HOME: gemsDir, GEM_PATH: gemsDir } };
}

/* ------------------------------------------------------------------ *
 * Go — go modules
 * ------------------------------------------------------------------ */

// Go is different from the ecosystems above: since Go 1.16+, `go run`/`go
// build` resolves and downloads any import path it doesn't already have
// *by itself*, as long as a go.mod exists and GOFLAGS allows the module
// graph to be updated automatically — there's no separate "install step" to
// shell out to, and its own "go: downloading ..." progress lines land
// directly in the command's stdout/stderr, which the caller already
// captures. So this just scaffolds the one file (go.mod) Go needs in order
// to do that, scoped to the run's own workDir like everything else here.
export async function ensureGoModule(workDir) {
  const goModPath = path.join(workDir, "go.mod");
  await run("go", ["mod", "init", "run"], { cwd: workDir }).then(async ({ ok }) => {
    if (!ok) {
      // Fallback if `go mod init` isn't available for some reason: write a
      // minimal go.mod by hand.
      await fsp.writeFile(goModPath, "module run\n\ngo 1.21\n", "utf8");
    }
  });
  // -mod=mod lets `go run` add missing requirements to go.mod/go.sum and
  // fetch them, instead of erroring out with "missing go.sum entry".
  return { extraEnv: { GOFLAGS: "-mod=mod", GOPATH: path.join(workDir, ".gopath") } };
}

/* ------------------------------------------------------------------ *
 * Rust — cargo
 * ------------------------------------------------------------------ */

const RUST_KEYWORDS = new Set(["std", "core", "alloc", "crate", "self", "super"]);

function extractRustCrates(code) {
  const names = new Set();
  const useRe = /^\s*use\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  const externRe = /^\s*extern\s+crate\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  let m;
  while ((m = useRe.exec(code))) if (!RUST_KEYWORDS.has(m[1])) names.add(m[1]);
  while ((m = externRe.exec(code))) if (!RUST_KEYWORDS.has(m[1])) names.add(m[1]);
  return [...names];
}

// Same idea as Go: cargo resolves and downloads crates on its own once
// they're listed in Cargo.toml (from crates.io, which is on the network
// allowlist), and prints its own "Downloading/Compiling" progress to
// stdout/stderr as it goes. This just writes the Cargo.toml those crate
// names go into; the source file itself is written by the caller at
// src/bin/<name>.rs (see fileNaming.js and the "rust" entry in
// runners/index.js — the filename is user-configurable, not fixed).
export async function scaffoldRustProject(code, workDir) {
  const crates = extractRustCrates(code).filter(isSafeName).slice(0, MAX_PACKAGES_PER_RUN);

  const deps = crates.map((name) => `${name} = "*"`).join("\n");
  const cargoToml = `[package]\nname = "run"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\n${deps}\n`;

  await fsp.writeFile(path.join(workDir, "Cargo.toml"), cargoToml, "utf8");

  return { crates };
}

/* ------------------------------------------------------------------ *
 * Java — Maven Central
 * ------------------------------------------------------------------ *
 * Unlike pip/npm/gem/crates.io, there's no reliable formula from a Java
 * `import` statement to a Maven groupId:artifactId — e.g. `import
 * org.json.JSONObject;` tells you nothing machine-derivable about the
 * artifact being "org.json:json". So this is a curated import -> Maven
 * coordinate table (same shape as PY_IMPORT_TO_PACKAGE above): expandable,
 * not a restriction on what Java itself can do, but it only covers
 * packages that are listed. Anything not listed here simply isn't
 * resolvable from a bare import and is left alone (the program will fail
 * to compile with a normal "cannot find symbol", same as it would today).
 * Also note: this fetches the *named* jar only, no transitive dependency
 * resolution (that needs a real Maven/Gradle project, not a single file).
 */

const JAVA_IMPORT_TO_MAVEN = {
  "org.json": "org.json:json",
  "com.google.gson": "com.google.code.gson:gson",
  "com.fasterxml.jackson": "com.fasterxml.jackson.core:jackson-databind",
  "org.apache.commons.lang3": "org.apache.commons:commons-lang3",
  "org.apache.commons.io": "commons-io:commons-io",
  "org.apache.commons.collections4": "org.apache.commons:commons-collections4",
  "okhttp3": "com.squareup.okhttp3:okhttp",
  "retrofit2": "com.squareup.retrofit2:retrofit",
  "org.slf4j": "org.slf4j:slf4j-api",
  "com.google.guava": "com.google.guava:guava",
  "org.junit": "org.junit.jupiter:junit-jupiter",
  "com.opencsv": "com.opencsv:opencsv",
  "org.yaml.snakeyaml": "org.yaml:snakeyaml",
};

function extractJavaImports(code) {
  const names = new Set();
  const re = /^\s*import\s+(?:static\s+)?([a-zA-Z_][\w.]*)\s*;/gm;
  let m;
  while ((m = re.exec(code))) {
    const full = m[1].replace(/\.\*$/, "");
    // Match the longest known prefix (e.g. "com.fasterxml.jackson.databind.ObjectMapper" -> "com.fasterxml.jackson").
    const parts = full.split(".");
    for (let i = parts.length; i > 0; i--) {
      const prefix = parts.slice(0, i).join(".");
      if (JAVA_IMPORT_TO_MAVEN[prefix]) {
        names.add(prefix);
        break;
      }
    }
  }
  return [...names];
}

async function mavenLatestVersion(groupId, artifactId) {
  const groupPath = groupId.replace(/\./g, "/");
  const metaUrl = `https://repo1.maven.org/maven2/${groupPath}/${artifactId}/maven-metadata.xml`;
  const res = await fetch(metaUrl).catch(() => null);
  if (!res || !res.ok) return null;
  const xml = await res.text();
  const release = xml.match(/<release>([^<]+)<\/release>/)?.[1];
  const latest = xml.match(/<latest>([^<]+)<\/latest>/)?.[1];
  return release || latest || null;
}

// Downloads each resolved coordinate's jar straight into
// <workDir>/.deps/*.jar, scoped to this run like everything above, and
// returns the classpath argument (`-cp .deps/*`) both `javac` and `java`
// should be invoked with.
export async function ensureJavaDependencies(code, workDir, onLog) {
  const imports = extractJavaImports(code).slice(0, MAX_PACKAGES_PER_RUN);
  if (imports.length === 0) return { log: "", classpath: null };

  const depsDir = path.join(workDir, ".deps");
  await fsp.mkdir(depsDir, { recursive: true });

  const resolved = [];
  const failed = [];
  for (const importPrefix of imports) {
    const [groupId, artifactId] = JAVA_IMPORT_TO_MAVEN[importPrefix].split(":");
    onLog?.(`[deps] Resolving ${groupId}:${artifactId} on Maven Central...\n`);
    const version = await mavenLatestVersion(groupId, artifactId);
    if (!version) {
      onLog?.(`[deps] Could not resolve ${groupId}:${artifactId}\n`);
      failed.push(importPrefix);
      continue;
    }
    const jarUrl = `https://repo1.maven.org/maven2/${groupId.replace(/\./g, "/")}/${artifactId}/${version}/${artifactId}-${version}.jar`;
    onLog?.(`[deps] Downloading ${groupId}:${artifactId}:${version}\n`);
    const res = await fetch(jarUrl).catch(() => null);
    if (!res || !res.ok) {
      onLog?.(`[deps] Download failed for ${groupId}:${artifactId}:${version}\n`);
      failed.push(importPrefix);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fsp.writeFile(path.join(depsDir, `${artifactId}-${version}.jar`), buf);
    onLog?.(`[deps] Installed ${groupId}:${artifactId}:${version}\n`);
    resolved.push(`${groupId}:${artifactId}:${version}`);
  }

  let summary = resolved.length ? `[deps] Maven: ${resolved.join(", ")}\n` : "";
  if (failed.length) {
    summary += `[deps] Could not resolve a known Maven coordinate for: ${failed.join(", ")} (import not in the known-package table, or Maven Central lookup failed)\n`;
  }
  return { log: summary, classpath: resolved.length ? path.join(depsDir, "*") : null };
}

/* ------------------------------------------------------------------ *
 * PHP — Composer
 * ------------------------------------------------------------------ *
 * Same limitation as Java: PHP namespaces don't map to Packagist package
 * names by any fixed rule, so this is a curated `use` namespace ->
 * vendor/package table. Composer itself *does* handle transitive deps
 * correctly (unlike the Java path above), since we hand it off to a real
 * `composer require` rather than downloading a single file.
 */

const PHP_NAMESPACE_TO_PACKAGE = {
  "GuzzleHttp": "guzzlehttp/guzzle",
  "PHPMailer\\PHPMailer": "phpmailer/phpmailer",
  "Symfony\\Component\\HttpFoundation": "symfony/http-foundation",
  "Symfony\\Component\\Console": "symfony/console",
  "Ramsey\\Uuid": "ramsey/uuid",
  "Carbon": "nesbot/carbon",
  "Monolog": "monolog/monolog",
  "Faker": "fakerphp/faker",
  "Firebase\\JWT": "firebase/php-jwt",
  "Dotenv": "vlucas/phpdotenv",
};

function extractPhpNamespaces(code) {
  const names = new Set();
  const re = /^\s*use\s+([A-Za-z_][\w\\]*)/gm;
  let m;
  while ((m = re.exec(code))) {
    const full = m[1].replace(/\\[A-Za-z_]\w*$/, ""); // drop the trailing class name
    const parts = full.split("\\");
    for (let i = parts.length; i > 0; i--) {
      const prefix = parts.slice(0, i).join("\\");
      if (PHP_NAMESPACE_TO_PACKAGE[prefix]) {
        names.add(prefix);
        break;
      }
    }
  }
  return [...names];
}

// Runs `composer require` in the run's own workDir (its vendor/ directory
// is scoped there like every other ecosystem above), and returns the
// autoload.php path to prepend so user code doesn't need its own `require
// 'vendor/autoload.php';` line — see the `-d auto_prepend_file=` wiring in
// runExecution.js.
export async function ensurePhpDependencies(code, workDir, onLog) {
  const namespaces = extractPhpNamespaces(code).slice(0, MAX_PACKAGES_PER_RUN);
  if (namespaces.length === 0) return { log: "", autoloadPath: null };

  const packages = namespaces.map((ns) => PHP_NAMESPACE_TO_PACKAGE[ns]);
  onLog?.(`[deps] composer require ${packages.join(" ")}\n`);
  const { ok, log } = await run(
    "composer",
    ["require", "--no-interaction", "--no-progress", ...packages],
    { cwd: workDir },
    onLog
  );

  const autoloadPath = path.join(workDir, "vendor", "autoload.php");
  const hasAutoload = ok && (await fsp.access(autoloadPath).then(() => true).catch(() => false));

  const summary = ok
    ? `[deps] composer require: ${packages.join(", ")}\n`
    : `[deps] composer require failed for one or more of: ${packages.join(", ")}\n${log.slice(-800)}\n`;

  return { log: summary, autoloadPath: hasAutoload ? autoloadPath : null };
}

/* ------------------------------------------------------------------ *
 * C / C++ — system libraries via apt (opt-in, off by default)
 * ------------------------------------------------------------------ *
 * This one is fundamentally different from everything above, and it's
 * worth being explicit about why: C/C++ "dependencies" for headers like
 * <curl/curl.h> are OS packages, not per-run artifacts. `apt-get install`
 * needs root and installs *system-wide* — there's no per-run scratch
 * directory to scope it to the way pip/npm/gem/cargo/composer/Maven all
 * allow above. That means, unlike every other installer in this file, a
 * package installed here is NOT cleaned up with the rest of workDir, and
 * IS visible to every future run on this server. That's a real operational
 * trade-off (disk growth, one run's install affecting another's build
 * environment), not just a formality, so this stays opt-in:
 * ENABLE_SYSTEM_PACKAGE_INSTALL=true in .env turns it on.
 */

const CPP_HEADER_TO_APT = {
  "curl/curl.h": "libcurl4-openssl-dev",
  "openssl/": "libssl-dev",
  "zlib.h": "zlib1g-dev",
  "boost/": "libboost-all-dev",
  "sqlite3.h": "libsqlite3-dev",
  "png.h": "libpng-dev",
  "jpeglib.h": "libjpeg-dev",
  "gtk/gtk.h": "libgtk-3-dev",
  "SDL2/SDL.h": "libsdl2-dev",
  "opencv2/": "libopencv-dev",
  "mysql/mysql.h": "libmysqlclient-dev",
  "pqxx/": "libpqxx-dev",
  "X11/Xlib.h": "libx11-dev",
  "gmp.h": "libgmp-dev",
  "gsl/": "libgsl-dev",
  "eigen3/": "libeigen3-dev",
  "yaml-cpp/": "libyaml-cpp-dev",
  "ncurses.h": "libncurses-dev",
  "readline/readline.h": "libreadline-dev",
  "zmq.h": "libzmq3-dev",
};

function extractCppHeaders(code) {
  const found = new Set();
  const re = /#include\s*<([^>]+)>/g;
  let m;
  while ((m = re.exec(code))) {
    for (const [prefix, aptPkg] of Object.entries(CPP_HEADER_TO_APT)) {
      if (m[1].startsWith(prefix)) found.add(aptPkg);
    }
  }
  return [...found];
}

let _aptUpdated = false;

// Installs the apt-dev packages needed for any recognized `#include`, once
// per package per server (apt naturally no-ops on an already-installed
// package, so repeat runs across users are cheap after the first). Returns
// nothing to scope per-run — see the note above on why this can't be
// scoped the way the rest of this file is.
export async function ensureSystemPackages(code, onLog) {
  if (process.env.ENABLE_SYSTEM_PACKAGE_INSTALL !== "true") return { log: "" };

  const packages = extractCppHeaders(code).slice(0, MAX_PACKAGES_PER_RUN);
  if (packages.length === 0) return { log: "" };

  if (!_aptUpdated) {
    onLog?.("[deps] apt-get update\n");
    await run("apt-get", ["update"], {}, onLog);
    _aptUpdated = true;
  }

  onLog?.(`[deps] apt-get install ${packages.join(" ")}\n`);
  const { ok, log } = await run("apt-get", ["install", "-y", ...packages], {}, onLog);

  const summary = ok
    ? `[deps] apt-get install: ${packages.join(", ")}\n`
    : `[deps] apt-get install failed for one or more of: ${packages.join(", ")} (needs root — see execution/README.md)\n${log.slice(-800)}\n`;

  return { log: summary };
}
