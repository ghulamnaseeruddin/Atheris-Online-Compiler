import React, { useMemo, useState, useRef, useEffect } from "react";
import { LANGUAGE_GROUPS, LANGUAGES } from "../lib/languages";

export default function LanguagePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return LANGUAGE_GROUPS;
    const q = query.toLowerCase();
    return LANGUAGE_GROUPS.map((group) => ({
      ...group,
      languages: group.languages.filter((key) => LANGUAGES[key].name.toLowerCase().includes(q)),
    })).filter((group) => group.languages.length > 0);
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-surface-border bg-white px-3 py-1.5 text-sm font-medium text-charcoal-900 hover:border-emerald-400 dark:border-white/10 dark:bg-charcoal-900 dark:text-white/80 dark:hover:border-emerald-400/60"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {LANGUAGES[value]?.name || "Select language"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-72 max-h-96 overflow-y-auto rounded-lg border border-surface-border bg-white shadow-panel dark:border-white/10 dark:bg-charcoal-900">
          <div className="sticky top-0 border-b border-surface-border bg-white p-2 dark:border-white/10 dark:bg-charcoal-900">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search languages…"
              className="input-field text-sm"
            />
          </div>
          <div className="p-2">
            {filteredGroups.map((group) => (
              <div key={group.id} className="mb-2">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-surface-muted dark:text-white/40">
                  {group.label}
                </p>
                {group.languages.map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-500/10 ${
                      value === key
                        ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "text-charcoal-900 dark:text-white/80"
                    }`}
                  >
                    {LANGUAGES[key].name}
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-surface-muted dark:text-white/40">No languages found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
