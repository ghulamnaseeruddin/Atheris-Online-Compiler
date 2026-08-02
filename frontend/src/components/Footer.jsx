import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/atheris-logo.png";

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-white bg-circuit-dark text-surface-muted dark:border-white/5 dark:bg-charcoal-950 dark:text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Atheris" className="h-8 w-8 rounded-full" />
              <span className="font-display text-base font-semibold text-charcoal-950 dark:text-white">Atheris</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-surface-muted dark:text-white/50">
              A single online editor to write, run, and share code in every practical language —
              high-level and low-level, always on the latest stable release.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Product</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/editor" className="hover:text-charcoal-950 dark:hover:text-white">Editor</Link></li>
              <li><a href="/#languages" className="hover:text-charcoal-950 dark:hover:text-white">Languages</a></li>
              <li><a href="/#features" className="hover:text-charcoal-950 dark:hover:text-white">Features</a></li>
              <li><Link to="/settings" className="hover:text-charcoal-950 dark:hover:text-white">Settings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-charcoal-950 dark:hover:text-white">About</Link></li>
              <li><Link to="/contact" className="hover:text-charcoal-950 dark:hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-surface-border pt-6 text-xs text-surface-muted dark:border-white/5 dark:text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Atheris Online Compiler. All rights reserved.</p>
          <p>
            This website is built by{" "}
            <a
              href="https://github.com/ghulamnaseeruddin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-charcoal-700 hover:text-emerald-700 hover:underline dark:text-white/60 dark:hover:text-emerald-400"
            >
              Ghulam Naseeruddin
            </a>
            , Software Engineer &amp; Full-Stack Python and Web Developer.
          </p>
        </div>
      </div>
    </footer>
  );
}
