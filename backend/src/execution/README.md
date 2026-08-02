# Execution engine — architecture & production notes

## What ships in this scaffold
`runExecution.js` runs code as a local subprocess (Python/Node/GCC/G++/Java/
Go/Ruby/PHP/Rust/Bash — whichever toolchains are installed on the host) with
a wall-clock timeout and output truncation. This is enough to develop and
demo the product end-to-end, **but it is not an isolation boundary** — it
trusts whatever is installed on the machine running the backend and gives
submitted code the same OS-level permissions as the backend process.

## Do not run this subprocess runner directly against untrusted traffic in production

For a public "run any code" product, route `/api/execute` to an isolated
worker instead of running commands in-process. Two well-tested options:

1. **Self-hosted [Piston](https://github.com/engineer-man/piston)** — an
   open-source multi-language execution engine (the same one behind
   Emkc/other online compilers). It already ships a large language matrix,
   each running in a locked-down, network-disabled container with CPU/
   memory/PID caps. Point `EXECUTION_ENGINE_URL` at your Piston instance and
   swap `runExecution.js` for a thin HTTP client — the request/response
   shape used by `/api/execute` in this repo is intentionally Piston-
   compatible to make that swap small.
2. **Roll your own worker fleet**: one Docker image per language family,
   invoked per-run via a queue (e.g. a small job runner backed by Redis),
   each container started with `--network=none`, a non-root user, `--memory`
   / `--cpus` / `--pids-limit` caps, and a read-only root filesystem except
   for a scratch `/tmp`.

Either way, the execution worker should be a **separate service/host** from
the API and database, so a sandbox escape can't reach user data.

## Dependency auto-install — all supported languages
`dependencyInstaller.js` scans each script for the packages/crates/gems/jars
it references and installs whatever's missing before running it — any name
on the relevant registry, not a fixed shortlist. Coverage by language:

| Language | Registry | How | Scoped how |
|---|---|---|---|
| Python | PyPI | scan imports, `pip install --target` | per-run dir, `PYTHONPATH` |
| JS / TS | npm | scan `require`/`import`, `npm install` | per-run `node_modules` |
| Ruby | RubyGems | scan `require`, `gem install --install-dir` | per-run dir, `GEM_HOME`/`GEM_PATH` |
| Go | Go modules | scaffold `go.mod`, `GOFLAGS=-mod=mod` | Go's own toolchain fetches on `go run` |
| Rust | crates.io | scaffold `Cargo.toml`, `cargo build` | Cargo's own toolchain fetches on build |
| Java | Maven Central | curated import→coordinate table, jar download | per-run `.deps/*.jar` on classpath |
| PHP | Packagist | curated namespace→package table, `composer require` | per-run `vendor/`, auto-prepended autoload |
| C / C++ | apt (system) | curated `#include`→apt-package table | **not scoped** — see below, opt-in only |

**Why Python/JS/Ruby/Go/Rust/PHP are all safe to leave on by default:**
every one of them installs into a directory that belongs to that single
run's `workDir` (a fresh temp dir per execution, deleted in
`runExecution.js`'s `finally`). One request's install can never shadow or
persist into another request's run.

**Why Java is a curated table, not a general resolver:** there's no formula
from a Java `import` to a Maven `groupId:artifactId` the way there is from
a Python import to a PyPI name — `org.json.JSONObject` doesn't tell you
mechanically that the artifact is `org.json:json`. The table in
`JAVA_IMPORT_TO_MAVEN` covers common libraries and is meant to be extended,
not treated as a ceiling. It also only fetches the named jar, not its
transitive dependencies — real transitive resolution needs an actual Maven
project, not a single downloaded file.

**Why C/C++ is opt-in (`ENABLE_SYSTEM_PACKAGE_INSTALL=true` in `.env`) and
off by default:** `apt-get install` needs root and installs **system-wide**
— there's no per-run scratch directory to scope it to the way every other
row in the table above has. A package installed this way isn't cleaned up
with `workDir`, and is visible to every future run on the server, forever.
That's a genuinely different risk shape than the rest of this file (shared,
persistent server state vs. per-request scratch space), so it's a
one-line opt-in once you've decided that trade-off is fine for your
deployment, not a silent default.

**What's still out of scope, and why:** Bash has no package-manager-per-
import model at all — there's no reliable way to tell "the user typed the
word `jq`" from "the user's script legitimately uses the word `jq` as a
variable name," so auto-detecting Bash "requirements" would mostly produce
noise (or worse, apt-get installing English words). If you want Bash tool
installs, the `ENABLE_SYSTEM_PACKAGE_INSTALL` apt path above already
supports it in principle — it just needs a real signal (e.g. an explicit
`# needs: jq` comment convention) to trigger off, rather than guessing.

Every one of these installers is a plain function in
`dependencyInstaller.js` — read it top to bottom before extending it;
each section has a comment explaining its specific trade-offs.

## Adding a language
1. Add an entry to `runners/index.js` with the source file name and the
   compile/run commands.
2. Add the toolchain to whatever environment runs `runExecution.js` (or, in
   production, to the corresponding worker image).
3. Add the language to `frontend/src/lib/languages.js` (`LANGUAGES` +
   the right group in `LANGUAGE_GROUPS`) so it appears in the picker, with a
   Monaco `monacoId` for syntax highlighting.

## Languages named in the brief not yet wired up here
C#, Kotlin, Swift, Dart, R, Scala, Elixir, Haskell, Lua, Perl, Julia,
Assembly, Fortran, Ada, and the SQL/Mongo "database" runners all need either
a heavier toolchain (SDKs) or a stateful sandbox (a scratch DB instance per
run) and are best served by the Piston-style worker approach above rather
than the local subprocess runner. The frontend catalog already lists them so
the picker UI is final — only the backend runner needs to be added per
language as you bring the execution worker online.
