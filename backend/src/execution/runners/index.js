// Runner registry for the built-in subprocess execution engine.
//
// Every entry's compile/run functions receive `ctx`, which always includes
// `fileName` (e.g. "app.py") and `base` (e.g. "app" — fileName without its
// extension), resolved by fileNaming.js from whatever name the user typed
// in the editor (or "main.<ext>" if they didn't customize it). Some
// languages also get extra ctx fields from the dependency installer
// (ctx.classpath for Java, ctx.autoloadPath for PHP).
//
// fileName: the DEFAULT source filename — only used when the user hasn't
//           specified one; see fileNaming.js for how a custom one resolves.
// compile:  optional command(s) run before `run` (array of {cmd, args})
// run:      the command used to execute the program, receives stdin

export const RUNNERS = {
  python: {
    fileName: "main.py",
    // -u = unbuffered stdout/stderr. Without it, Python buffers output in
    // ~4-8KB chunks whenever stdout isn't a real terminal (which it never is
    // here) — a SIGKILL on timeout never gives it the chance to flush that
    // buffer, so a program that printed 50 lines over 8 seconds can come
    // back with zero output. This is what "times out and shows nothing"
    // usually means.
    run: (ctx) => ({ cmd: "python3", args: ["-u", ctx.fileName] }),
  },
  javascript: {
    fileName: "main.js",
    run: (ctx) => ({ cmd: "node", args: [ctx.fileName] }),
  },
  typescript: {
    fileName: "main.ts",
    compile: (ctx) => [{ cmd: "npx", args: ["-y", "tsc", ctx.fileName, "--outFile", `${ctx.base}.js`] }],
    run: (ctx) => ({ cmd: "node", args: [`${ctx.base}.js`] }),
  },
  c: {
    fileName: "main.c",
    compile: (ctx) => [{ cmd: "gcc", args: [ctx.fileName, "-O2", "-o", "app.out"] }],
    run: () => ({ cmd: "./app.out", args: [] }),
  },
  cpp: {
    fileName: "main.cpp",
    compile: (ctx) => [{ cmd: "g++", args: [ctx.fileName, "-O2", "-o", "app.out"] }],
    run: () => ({ cmd: "./app.out", args: [] }),
  },
  java: {
    fileName: "Main.java",
    // The filename (minus .java) must equal the public class name — a hard
    // Java rule, not something this server adds. fileNaming.js already
    // rejects filenames that can't be valid Java identifiers; if the
    // *class* name inside the code still doesn't match what was typed,
    // javac will say so directly in the compile error, same as it would on
    // any machine.
    compile: (ctx) => [{
      cmd: "javac",
      args: ctx.classpath ? ["-cp", ctx.classpath, ctx.fileName] : [ctx.fileName],
    }],
    run: (ctx) => ({
      cmd: "java",
      args: ctx.classpath ? ["-cp", `.:${ctx.classpath}`, ctx.base] : [ctx.base],
    }),
  },
  go: {
    fileName: "main.go",
    run: (ctx) => ({ cmd: "go", args: ["run", ctx.fileName] }),
  },
  bash: {
    fileName: "main.sh",
    run: (ctx) => ({ cmd: "bash", args: [ctx.fileName] }),
  },
  ruby: {
    fileName: "main.rb",
    // Same buffering problem as Python — Ruby's $stdout isn't sync'd to a
    // pipe by default. Forcing sync=true via -e wraps the actual file load
    // instead of needing a shell (args are passed directly to the process,
    // so no shell-quoting concerns on any OS).
    run: (ctx) => ({ cmd: "ruby", args: ["-e", `STDOUT.sync = true; STDERR.sync = true; load('${ctx.fileName}')`] }),
  },
  php: {
    fileName: "main.php",
    // If composer deps were installed for this run, auto_prepend_file loads
    // vendor/autoload.php before the script runs — so the snippet itself
    // never needs its own `require 'vendor/autoload.php';` line.
    run: (ctx) => ({
      cmd: "php",
      args: ctx.autoloadPath ? ["-d", `auto_prepend_file=${ctx.autoloadPath}`, ctx.fileName] : [ctx.fileName],
    }),
  },
  rust: {
    fileName: "src/main.rs",
    // Cargo (not plain rustc) so external crates declared in Cargo.toml —
    // written per run by dependencyInstaller.js's scaffoldRustProject —
    // actually get resolved and fetched from crates.io before building.
    // The source always lives at src/bin/<base>.rs (see fileNaming.js),
    // never the Cargo-default src/main.rs — Cargo turns each file under
    // src/bin/ into its own binary named after the file, so a custom
    // filename and the default "main" both work through the same path,
    // with no separate-case logic needed here.
    compile: () => [{ cmd: "cargo", args: ["build", "--release", "--quiet"] }],
    run: (ctx) => ({ cmd: `./target/release/${ctx.base}`, args: [] }),
  },
};

export function isSupported(runnerKey) {
  return Object.prototype.hasOwnProperty.call(RUNNERS, runnerKey);
}
