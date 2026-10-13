'use client';
import { useId, useMemo, useState } from 'react';

export type SearchItem = { href: string; title: string; kind: string; terms: string };

/** Instant search over states, Union Territories and indicators. Runs in the browser; nothing is sent anywhere. */
export function Search({ items, label, placeholder, noResults }: { items: SearchItem[]; label: string; placeholder: string; noResults: string }) {
  const [q, setQ] = useState('');
  const id = useId();
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return items.filter((i) => i.terms.includes(s)).slice(0, 8);
  }, [q, items]);
  return (
    <div role="search" className="relative">
      <label htmlFor={id} className="block text-sm font-medium mb-1">{label}</label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={80}
        className="w-full bg-paper-raised border border-rule rounded-[var(--radius-control)] px-3 py-2.5 text-base focus:border-ink"
        aria-controls={`${id}-results`}
      />
      <div id={`${id}-results`} aria-live="polite">
        {q.trim().length >= 2 && (
          results.length ? (
            <ul className="mt-2 border border-rule rounded-[var(--radius-control)] bg-paper-raised divide-y divide-rule">
              {results.map((r) => (
                <li key={r.href}>
                  {/* Plain links: district and city pages are static HTML without client-navigation data. */}
                  <a href={r.href} className="flex justify-between gap-4 px-3 py-2 no-underline hover:bg-paper">
                    <span>{r.title}</span>
                    <span className="text-sm text-ink-muted">{r.kind}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-ink-muted">{noResults}</p>
        )}
      </div>
    </div>
  );
}
