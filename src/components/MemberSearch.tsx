'use client';
import { useId, useMemo, useState } from 'react';

type Row = { id: string; constituency: string; name: string; party: string; state: string; terms: string; constLang: string; nameLang: string; partyLang: string };

/** Filters the members table in the browser; nothing typed here is sent anywhere. */
export function MemberSearch({ rows, labels }: { rows: Row[]; labels: { search: string; placeholder: string; constituency: string; member: string; party: string; state: string; count: string } }) {
  const [q, setQ] = useState('');
  const id = useId();
  const shown = useMemo(() => { const s = q.trim().toLowerCase(); return s.length < 2 ? rows : rows.filter((r) => r.terms.includes(s)); }, [q, rows]);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">{labels.search}</label>
      <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.placeholder} maxLength={80} autoComplete="off"
        className="w-full max-w-xl bg-paper-raised border border-rule rounded-[var(--radius-control)] px-3 py-2.5 text-base focus:border-ink" />
      <p className="mt-2 text-sm text-ink-muted" aria-live="polite">{labels.count.replace('{n}', String(shown.length))}</p>
      <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={labels.member}>
        <table className="w-full text-[0.95rem] border-collapse">
          <thead><tr className="border-b border-ink text-left">
            <th scope="col" className="py-1.5 pr-4">{labels.constituency}</th><th scope="col" className="py-1.5 pr-4">{labels.member}</th>
            <th scope="col" className="py-1.5 pr-4">{labels.party}</th><th scope="col" className="py-1.5">{labels.state}</th>
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-rule align-top">
                <th scope="row" className="py-1.5 pr-4 font-normal text-left" lang={r.constLang}>{r.constituency}</th>
                <td className="py-1.5 pr-4" lang={r.nameLang}>{r.name}</td>
                <td className="py-1.5 pr-4 text-ink-muted" lang={r.partyLang}>{r.party}</td>
                <td className="py-1.5 text-ink-muted">{r.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
