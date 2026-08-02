import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { RUNNERS, isSupported } from "./runners/index.js";
import { resolveFileName } from "./fileNaming.js";
import {
  ensurePythonDependencies,
  ensureNodeDependencies,
  ensureRubyDependencies,
  ensureGoModule,
  scaffoldRustProject,
  ensureJavaDependencies,
  ensurePhpDependencies,
  ensureSystemPackages,
} from "./dependencyInstaller.js";

const MAX_OUTPUT_CHARS = 20_000;
const DEFAULT_TIMEOUT_MS = Number(process.env.EXECUTION_TIMEOUT_MS || 8000);

function truncate(str) {
  if (!str) return str;
  return str.length > MAX_OUTPUT_CHARS ? str.slice(0, MAX_OUTPUT_CHARS) + "\n…output truncated" : str;
}

// `onChunk(streamName, text)`, when given, fires synchronously as each
// stdout/stderr chunk arrives from the child process — this is the hook
// that lets a caller (the /execute/stream route) forward output to the
// client live instead of only after the process exits.
function runCommand({ cmd, args, cwd, stdin, timeoutMs, extraEnv = {}, onChunk }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      // NOTE on isolation: this scaffold relies on OS-level process limits for
      // local development. In production, this call should instead be routed
      // to an isolated worker (a locked-down Docker container / microVM per
      // run, no network, capped CPU+memory, non-root UID) — see
      // execution/README.md for the recommended architecture.
      env: { ...process.env, PATH: process.env.PATH, PYTHONUNBUFFERED: "1", ...extraEnv },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      onChunk?.("stdout", s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      onChunk?.("stderr", s);
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        code,
        stdout: truncate(stdout),
        stderr: timedOut ? truncate(stderr) + "\nExecution timed out." : truncate(stderr),
        timedOut,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout: "", stderr: err.message, timedOut: false });
    });
  });
}

// `onOutput(type, chunk)` — type is "deps" | "build" | "stdout" | "stderr" —
// is optional and, when provided, is called in real time as install
// progress, compiler/build output, and the program's own stdout/stderr
// happen. The final return value (stdout/stderr/status/executionTimeMs) is
// unchanged either way, so existing non-streaming callers keep working.
export async function runExecution({ language, code, stdin = "", fileName, onOutput }) {
  if (!isSupported(language)) {
    return {
      status: "error",
      stdout: "",
      stderr: `"${language}" is not yet enabled on this execution worker. See execution/README.md to add it.`,
      executionTimeMs: 0,
    };
  }

  const resolved = resolveFileName(language, fileName);
  if (!resolved.ok) {
    return { status: "error", stdout: "", stderr: resolved.error, executionTimeMs: 0 };
  }

  const emit = (type, chunk) => {
    if (chunk) onOutput?.(type, chunk);
  };

  const runner = RUNNERS[language];
  const workDir = path.join(os.tmpdir(), "atheris-run-" + randomUUID());
  const sourcePath = path.join(workDir, resolved.relativePath);
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });

  const start = Date.now();
  try {
    await fs.writeFile(sourcePath, code, "utf8");

    // Auto-install whatever third-party packages/crates/gems/jars the
    // script actually references — any name on the relevant registry, not
    // a fixed shortlist — before running it. Everything lands in this
    // run's own scratch workDir, never shared server state (except the
    // opt-in C/C++ apt path — see its own comment in dependencyInstaller.js
    // for why that one's different).
    let depsLog = "";
    let depsExtraEnv = {};
    let depsContext = { fileName: resolved.fileName, base: resolved.base };
    const onDepsLog = (chunk) => emit("deps", chunk);

    if (language === "python") {
      const { log, depsDir } = await ensurePythonDependencies(code, workDir, onDepsLog);
      depsLog = log;
      if (depsDir) depsExtraEnv.PYTHONPATH = depsDir;
    } else if (language === "javascript" || language === "typescript") {
      const { log } = await ensureNodeDependencies(code, workDir, onDepsLog);
      depsLog = log;
    } else if (language === "ruby") {
      const { log, extraEnv } = await ensureRubyDependencies(code, workDir, onDepsLog);
      depsLog = log;
      depsExtraEnv = extraEnv;
    } else if (language === "go") {
      const { extraEnv } = await ensureGoModule(workDir);
      depsExtraEnv = extraEnv;
    } else if (language === "rust") {
      await scaffoldRustProject(code, workDir);
    } else if (language === "java") {
      const { log, classpath } = await ensureJavaDependencies(code, workDir, onDepsLog);
      depsLog = log;
      depsContext.classpath = classpath;
    } else if (language === "php") {
      const { log, autoloadPath } = await ensurePhpDependencies(code, workDir, onDepsLog);
      depsLog = log;
      depsContext.autoloadPath = autoloadPath;
    } else if (language === "c" || language === "cpp") {
      const { log } = await ensureSystemPackages(code, onDepsLog);
      depsLog = log;
    }

    // For languages with a build step (C/C++/Java/Rust/TypeScript/Go),
    // surface whatever the compiler/build tool printed even on success —
    // for Go and Rust in particular, this is where "go: downloading ..."
    // / "Downloading crate ..." / "Compiling ..." actually shows up live,
    // since neither has a separate pre-install step the way pip/npm/gem do.
    let buildLog = "";
    if (runner.compile) {
      for (const step of runner.compile(depsContext)) {
        const result = await runCommand({
          ...step,
          cwd: workDir,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          extraEnv: depsExtraEnv,
          onChunk: (_streamName, s) => emit("build", s),
        });
        buildLog += result.stdout + result.stderr;
        if (result.code !== 0) {
          return {
            status: "error",
            stdout: depsLog ? depsLog + buildLog : buildLog,
            stderr: result.stderr || "Compilation failed.",
            executionTimeMs: Date.now() - start,
          };
        }
      }
    }

    const { cmd, args } = runner.run(depsContext);
    const result = await runCommand({
      cmd,
      args,
      cwd: workDir,
      stdin,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      extraEnv: depsExtraEnv,
      onChunk: (streamName, s) => emit(streamName, s),
    });

    const prefix = depsLog + buildLog;
    return {
      status: result.timedOut ? "timeout" : result.code === 0 ? "success" : "error",
      stdout: prefix ? prefix + result.stdout : result.stdout,
      stderr: result.stderr,
      executionTimeMs: Date.now() - start,
    };
  } finally {
    fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
