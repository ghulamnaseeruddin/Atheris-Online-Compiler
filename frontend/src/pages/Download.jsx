import React from "react";

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
          <h3 className="mt-4 text-lg font-semibold">Linux</h3>
          <p className="mt-1 text-sm text-charcoal-600 dark:text-white/60">
            AppImage — works on most distributions
          </p>
          
            href="#"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          
            Download for Linux
          </div>
        </div>
      
    </div>
  );
}