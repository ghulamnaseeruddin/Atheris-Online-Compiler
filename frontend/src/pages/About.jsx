import React from "react";
import { Link } from "react-router-dom";

const HIGHLIGHTS = [
  {
    title: "Fast, cloud-based execution",
    desc: "Every run happens on our servers the instant you hit Run — no downloads, no waiting on a build toolchain to install on your machine.",
  },
  {
    title: "Every language, one editor",
    desc: "High-level and low-level languages, web stacks, databases, and shells, all in a single consistent workspace instead of a dozen local setups.",
  },
  {
    title: "Zero installation",
    desc: "No compilers, interpreters, or SDKs to install. Open a browser tab and you're writing and running real code within seconds.",
  },
  {
    title: "Secure, isolated execution",
    desc: "Runs are sandboxed and rate-limited so your code — and everyone else's — stays safe, whether you're experimenting or grading submissions.",
  },
  {
    title: "A modern, beautiful editor",
    desc: "Monaco-powered editing (the same engine behind VS Code) with syntax highlighting, light/dark themes, and a distraction-free layout.",
  },
  {
    title: "AI-assisted coding",
    desc: "A built-in AI assistant that can explain errors, suggest fixes, and insert code straight into your editor when you're stuck.",
  },
  {
    title: "Easy project management",
    desc: "Shareable links, forkable snippets, execution history, and an embeddable widget for docs, courses, and blog posts.",
  },
  {
    title: "Accessible from anywhere",
    desc: "Your account, snippets, and history follow you — pick up exactly where you left off on any device with a browser.",
  },
];

const AUDIENCES = [
  {
    label: "Students",
    desc: "Learn to code without fighting a local setup — run your first program in the same tab as the lesson.",
  },
  {
    label: "Developers",
    desc: "Prototype an idea, test a snippet, or debug an algorithm without spinning up a full local project.",
  },
  {
    label: "Professionals",
    desc: "Interview candidates, demo code in meetings, or share a reproducible bug report with a single link.",
  },
];

export default function About() {
  return (
    <div>
      <section className="border-b border-surface-border bg-surface bg-circuit-dark dark:border-white/5 dark:bg-charcoal-950">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            About Atheris
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-charcoal-950 dark:text-white sm:text-5xl">
            The online compiler built to get out of your way
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-surface-muted dark:text-white/60">
            Atheris Online Compiler gives you a fast, secure, and beautifully designed place to write, run, and share
            code — in practically any language — without ever touching a local toolchain.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/editor" className="btn-primary px-5 py-2.5 text-base">
              Start coding now
            </Link>
            <Link to="/contact" className="btn-ghost border border-surface-border px-5 py-2.5 text-base dark:border-white/15">
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">
          Why developers choose Atheris
        </h2>
        <p className="mt-2 max-w-2xl text-surface-muted dark:text-white/60">
          Every feature below is built into the product you're using right now — not a roadmap promise.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="panel p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <h3 className="font-semibold text-charcoal-950 dark:text-white">{h.title}</h3>
              <p className="mt-1.5 text-sm text-surface-muted dark:text-white/60">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-surface-border bg-white dark:border-white/5 dark:bg-charcoal-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-charcoal-950 dark:text-white">
            Built for students, developers, and professionals
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.label} className="panel p-5">
                <h3 className="font-display text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                  {a.label}
                </h3>
                <p className="mt-2 text-sm text-surface-muted dark:text-white/60">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-charcoal-950 bg-circuit-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Your next line of code is one click away
          </h2>
          <p className="mt-2 text-white/60">Free to use, no install required, ready whenever you are.</p>
          <Link to="/editor" className="btn-primary mt-6 inline-flex px-6 py-3 text-base">
            Open the editor
          </Link>
        </div>
      </section>
    </div>
  );
}
