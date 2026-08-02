import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="font-display text-6xl font-bold text-emerald-500">404</span>
      <h1 className="mt-3 font-display text-xl font-semibold text-charcoal-950 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-surface-muted dark:text-white/50">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/editor" className="btn-primary mt-6">
        Back to the editor
      </Link>
    </div>
  );
}
