import React from "react";

function WindowsLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
      <path
        fill="#00A4EF"
        d="M3 5.5L10 4.5V11.5H3V5.5ZM11 4.4L21 3V11.5H11V4.4ZM3 12.5H10V19.5L3 18.5V12.5ZM11 12.5H21V21L11 19.6V12.5Z"
      />
    </svg>
  );
}

function LinuxLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
      <path
        fill="currentColor"
        className="text-charcoal-900 dark:text-white"
        d="M12 2C9.5 2 8 4 8 6.5C8 7.5 8.3 8.3 8 9C7.5 10 6 11 6 13.5C6 15 6.5 16 6 17C5.5 18 5 18.5 5 19.5C5 21 7 22 12 22C17 22 19 21 19 19.5C19 18.5 18.5 18 18 17C17.5 16 18 15 18 13.5C18 11 16.5 10 16 9C15.7 8.3 16 7.5 16 6.5C16 4 14.5 2 12 2ZM10 7C10.6 7 11 7.4 11 8C11 8.6 10.6 9 10 9C9.4 9 9 8.6 9 8C9 7.4 9.4 7 10 7ZM14 7C14.6 7 15 7.4 15 8C15 8.6 14.6 9 14 9C13.4 9 13 8.6 13 8C13 7.4 13.4 7 14 7Z"
      />
    </svg>
  );
}

export default function Download() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Download <span className="text-emerald-500">Atheris</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-charcoal-600 dark:text-white/60">
          Get the full Atheris Online Compiler experience as a native desktop app.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-surface-border bg-white p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <WindowsLogo />
          <h3 className="mt-4 text-lg font-semibold">Windows</h3>
          <p className="mt-1 text-sm text-charcoal-600 dark:text-white/60">
            Windows 10 and 11
          </p>
          <a
            href="https://github.com/ghulamnaseeruddin/Atheris-Online-Compiler/releases/download/v1.0.0/Atheris.Online.Compiler.Setup.1.0.0.exe"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Download for Windows
          </a>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <LinuxLogo />
          <h3 className="mt-4 text-lg font-semibold">Linux</h3>
          <p className="mt-1 text-sm text-charcoal-600 dark:text-white/60">
            AppImage — works on most distributions
          </p>
          
           <span className="mt-6 inline-flex items-center justify-center rounded-lg bg-charcoal-200 px-5 py-2.5 text-sm font-semibold text-charcoal-500 dark:bg-white/10 dark:text-white/40">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}