import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { LANGUAGE_GROUPS, LANGUAGES } from "../lib/languages";

const FEATURES = [
  {
    title: "Every language, one editor",
    desc: "High-level and low-level languages side by side, each always on its latest stable release — no version clutter in the UI.",
  },
  {
    title: "Real stdin / stdout / stderr",
    desc: "Feed interactive programs live input and see exactly what they print, including runtime errors.",
  },
  {
    title: "Share & download",
    desc: "Generate a persistent link to any snippet, or download your file — great for teaching, interviews, and bug reports.",
  },
  {
    title: "Live web preview",
    desc: "HTML, CSS, and JavaScript render instantly in an embedded preview pane as you type.",
  },
  {
    title: "Sandboxed & secure",
    desc: "Every run is isolated and rate-limited so your code — and everyone else's — stays safe.",
  },
  {
    title: "Built to grow",
    desc: "Teams, coding challenges, an AI assistant, and an embeddable editor API are on the roadmap.",
  },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div>
      {/* Hero band */}
      <section className="border-b border-surface-border bg-surface bg-circuit-dark dark:border-white/5 dark:bg-charcoal-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Free, instant, in your browser
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-charcoal-950 dark:text-white sm:text-5xl">
              Write, run, and share code in{" "}
              <span className="text-emerald-600 dark:text-emerald-400">any language.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-surface-muted dark:text-white/60">
              Atheris Online Compiler is a single editor for every practical programming
              language — high-level and low-level — with real execution, stdin support, and
              shareable links.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/editor" className="btn-primary px-5 py-2.5 text-base">
                Start coding — it's free
              </Link>
              {!user && (
                <Link to="/signup" className="btn-ghost border border-surface-border px-5 py-2.5 text-base dark:border-white/15">
                  Create an account
                </Link>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e] shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#252526] px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 font-mono text-xs text-white/40">main.py</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-white/90">
{`def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
        yield a

print(list(fibonacci(10)))`}
            </pre>
            <div className="border-t border-white/5 bg-[#161a18] p-4 font-mono text-sm text-emerald-400">
              [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
            </div>
          </div>
        </div>
      </section>

      {/* Languages */}
      <section id="languages" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">
          Every language you need, grouped the way you think about them
        </h2>
        <p className="mt-2 max-w-2xl text-surface-muted dark:text-white/60">
          High-level and low-level languages are kept clearly separate, alongside popular, web,
          database, and shell groupings.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {LANGUAGE_GROUPS.map((group) => (
            <div key={group.id} className="panel p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {group.label}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.languages.map((key) => (
                  <Link
                    key={key}
                    to={`/editor?lang=${key}`}
                    className="rounded-md border border-surface-border bg-surface px-2.5 py-1 text-sm text-charcoal-900 hover:border-emerald-400 hover:text-emerald-700 dark:border-white/10 dark:bg-charcoal-800 dark:text-white/80 dark:hover:border-emerald-400/60 dark:hover:text-emerald-300"
                  >
                    {LANGUAGES[key].name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-surface-border bg-white dark:border-white/5 dark:bg-charcoal-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">
            Built for real work, not just demos
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="panel p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <h3 className="font-semibold text-charcoal-950 dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-surface-muted dark:text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 bg-charcoal-950 bg-circuit-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Ready to run your first program?
          </h2>
          <p className="mt-2 text-white/60">No install, no setup — just open the editor.</p>
          <Link to="/editor" className="btn-primary mt-6 inline-flex px-6 py-3 text-base">
            Open the editor
          </Link>
        </div>
      </section>
    </div>
  );
}
