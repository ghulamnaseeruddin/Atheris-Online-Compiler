import React from "react";
import { Link } from "react-router-dom";

const FEATURE_SECTIONS = [
  {
    title: "Code Editor & Execution",
    items: [
      "Monaco-based editor — the same engine behind VS Code",
      "Real cloud execution across a wide range of languages",
      "Live preview mode for HTML/CSS/JS snippets",
      "Standard input (stdin) support for interactive programs",
      "Custom file naming per run",
      "Download code as a local file",
      "Streaming output — install/build/run logs appear live",
      "Command palette (Ctrl/Cmd + K) for fast navigation",
    ],
  },
  {
    title: "Sharing & Collaboration",
    items: [
      "One-click shareable snippet links",
      "Fork any shared snippet into your own copy",
      "Embeddable widget (<iframe>) for blogs, docs, and READMEs",
      "Public snippet listing on user profiles",
    ],
  },
  {
    title: "AI-Assisted Coding",
    items: [
      "Built-in AI assistant panel",
      "Explain errors and suggest fixes",
      "Insert AI-generated code directly into the editor",
    ],
  },
  {
    title: "Accounts & Authentication",
    items: [
      "Email/password sign-up and login",
      "GitHub and Google OAuth sign-in",
      "Forgot-password / reset-password flow",
      "Optional two-factor authentication (TOTP)",
      "JWT-based session security",
      "Whole-app authentication gating — no page reachable without an account",
    ],
  },
  {
    title: "Settings",
    items: [
      "Profile tab — photo upload/remove, full name, username, bio",
      "Account tab — change email, change password, 2FA status & link, logout, delete account",
      "Appearance tab — Light / Dark / System theme, synced to your account",
      "Editor Preferences tab — font size, font family, theme, tab size, word wrap, auto save, auto complete, line numbers, minimap",
      "Notifications tab — email notifications, security alerts, compiler updates",
      "All settings saved per-user and restored on every device",
    ],
  },
  {
    title: "Developer Platform",
    items: [
      "Personal API keys for programmatic access",
      "Webhook configuration for execution events",
      "Execution history log per account",
      "Personal activity / analytics dashboard",
    ],
  },
  {
    title: "Community",
    items: [
      "Public developer profiles (/u/username)",
      "Leaderboard of platform activity",
    ],
  },
];

const ROADMAP = [
  {
    timeline: "Near-term",
    items: [
      { name: "Account linking", desc: "Connect GitHub or Google to an existing email/password account instead of treating them as separate sign-in methods." },
      { name: "Transactional email delivery", desc: "A real email provider so password resets, security alerts, and notifications actually send mail." },
      { name: "Snippet version history", desc: "Keep previous versions of a saved snippet so you can review or roll back changes." },
      { name: "Custom keybinding profiles", desc: "Vim and Emacs keybinding modes inside Editor Preferences." },
    ],
  },
  {
    timeline: "Mid-term",
    items: [
      { name: "Real-time collaborative editing", desc: "Multiple people editing the same snippet at once, with live cursors." },
      { name: "In-editor AI chat with project context", desc: "The AI assistant references your current file and execution history, not just selected code." },
      { name: "Team / organization workspaces", desc: "Shared snippet libraries, roles, and permissions for classrooms or small dev teams." },
      { name: "Expanded language & package support", desc: "More runtimes, plus the ability to install extra packages per snippet." },
    ],
  },
  {
    timeline: "Long-term",
    items: [
      { name: "Premium / Pro tier", desc: "Higher execution limits, priority AI access, and advanced developer-platform features." },
      { name: "Mobile app / installable PWA", desc: "An installable, offline-friendly version of Atheris for phones and tablets." },
      { name: "Classroom / grading mode", desc: "Assignment templates, auto-graded test cases, and instructor dashboards." },
    ],
  },
];

const TIMELINE_STYLES = {
  "Near-term": "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Mid-term": "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Long-term": "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

export default function Docs() {
  return (
    <div>
      <section className="border-b border-surface-border bg-surface bg-circuit-dark dark:border-white/5 dark:bg-charcoal-950">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Documentation
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Atheris <span className="text-emerald-500">Docs</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-charcoal-600 dark:text-white/60">
            A complete feature inventory and product roadmap for Atheris
            Online Compiler — a cloud-based code editor and execution
            platform.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold">Feature Inventory</h2>
        <p className="mt-2 text-sm text-charcoal-600 dark:text-white/60">
          Every feature below is organized by area.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {FEATURE_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-surface-border bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {section.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-charcoal-700 dark:text-white/70">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-surface-border bg-white py-16 dark:border-white/5 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Roadmap</h2>
          <p className="mt-2 text-sm text-charcoal-600 dark:text-white/60">
            What we're tackling next, grouped by how soon it's realistic to
            ship. Nothing here is built yet.
          </p>

          <div className="mt-8 space-y-10">
            {ROADMAP.map((group) => (
              <div key={group.timeline}>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${TIMELINE_STYLES[group.timeline]}`}
                >
                  {group.timeline}
                </span>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-surface-border bg-surface p-4 dark:border-white/10 dark:bg-charcoal-950"
                    >
                      <h4 className="text-sm font-semibold">{item.name}</h4>
                      <p className="mt-1 text-sm text-charcoal-600 dark:text-white/60">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold">Have a question we didn't cover?</h2>
        <p className="mt-2 text-sm text-charcoal-600 dark:text-white/60">
          Reach out and we'll help you out directly.
        </p>
        <Link
          to="/contact"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Contact Us
        </Link>
      </section>
    </div>
  );
}