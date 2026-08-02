import React from "react";

const CONTACTS = [
  {
    id: "email",
    label: "Email",
    value: "ghulamnaseeruddin555@gmail.com",
    href: "mailto:ghulamnaseeruddin555@gmail.com",
    external: false,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    icon: EmailIcon,
    cta: "Send an email",
  },
  {
    id: "github",
    label: "GitHub",
    value: "github.com/ghulamnaseeruddin",
    href: "https://github.com/ghulamnaseeruddin",
    external: true,
    accent: "text-charcoal-900 dark:text-white",
    bg: "bg-charcoal-950/5 dark:bg-white/10",
    icon: GithubIcon,
    cta: "View GitHub profile",
  },
  {
    id: "instagram",
    label: "Instagram",
    value: "instagram.com/naseer_ludhiana",
    href: "https://instagram.com/naseer_ludhiana",
    external: true,
    accent: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-500/10",
    icon: InstagramIcon,
    cta: "View Instagram profile",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: "+92 349 6307015",
    href: "https://wa.me/923496307015",
    external: true,
    accent: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-500/10",
    icon: WhatsappIcon,
    cta: "Open WhatsApp chat",
  },
];

export default function Contact() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Get in touch
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold text-charcoal-950 dark:text-white">Contact us</h1>
        <p className="mx-auto mt-3 max-w-xl text-surface-muted dark:text-white/60">
          Questions, feedback, or a bug to report? Reach out on whichever channel is easiest for you — every link
          below opens the conversation directly.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {CONTACTS.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.id}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              className="panel group flex items-center gap-4 p-5 transition hover:border-emerald-400/60 dark:hover:border-emerald-400/40"
            >
              <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.accent}`}>
                <Icon />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-surface-muted dark:text-white/40">
                  {c.label}
                </p>
                <p className="mt-0.5 truncate font-medium text-charcoal-950 dark:text-white/90">{c.value}</p>
                <p className="mt-1 text-xs font-medium text-emerald-700 opacity-0 transition group-hover:opacity-100 dark:text-emerald-400">
                  {c.cta} →
                </p>
              </div>
            </a>
          );
        })}
      </div>

      <div className="mt-12 panel p-6 text-center">
        <p className="text-sm text-surface-muted dark:text-white/60">
          Atheris Online Compiler is built and maintained by{" "}
          <span className="font-semibold text-charcoal-900 dark:text-white/90">Ghulam Naseeruddin</span>, Software
          Engineer &amp; Full-Stack Python and Web Developer. We typically reply within 24–48 hours.
        </p>
      </div>
    </div>
  );
}

function EmailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3.5 6.5 12 12.5l8.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.73.5.98 5.24.98 11.52c0 4.94 3.2 9.13 7.65 10.6.56.1.76-.24.76-.54v-2c-3.11.68-3.77-1.5-3.77-1.5-.5-1.28-1.24-1.62-1.24-1.62-1.02-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15 1 1.71 2.63 1.22 3.27.93.1-.72.39-1.22.71-1.5-2.48-.28-5.1-1.24-5.1-5.53 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.1-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 015.6 0c2.14-1.45 3.08-1.15 3.08-1.15.6 1.54.22 2.68.1 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.62 5.24-5.12 5.52.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.03 11.03 0 0023 11.52C23 5.24 18.27.5 12 .5z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.02 2C6.5 2 2.04 6.46 2.04 11.98c0 1.9.5 3.66 1.44 5.2L2 22l4.96-1.44a9.9 9.9 0 004.96 1.34h.01c5.52 0 9.98-4.46 9.98-9.98A9.94 9.94 0 0012.02 2zm5.8 14.13c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.1.28-3.68-.77-3.1-1.28-5.08-4.42-5.24-4.63-.15-.2-1.24-1.65-1.24-3.15 0-1.5.79-2.24 1.06-2.55.27-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.68.52.25.6.85 2.08.92 2.24.08.15.13.33.03.53-.1.2-.16.33-.31.5-.15.18-.32.4-.46.54-.15.15-.31.31-.13.61.17.3.77 1.27 1.66 2.06 1.14 1.02 2.1 1.34 2.4 1.5.3.15.48.13.65-.07.18-.2.75-.87.95-1.17.2-.3.4-.25.66-.15.27.1 1.72.81 2.02.96.3.15.5.22.57.35.08.13.08.75-.16 1.43z" />
    </svg>
  );
}
