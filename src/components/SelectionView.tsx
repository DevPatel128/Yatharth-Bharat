'use client';
import { useEffect, useState } from 'react';
import { citations, clearSelection, EVENT, readSelection, removeItem, toCsv, toMarkdown, toText, type SelItem } from '@/lib/selection';

type L = { empty: string; copyText: string; copyMd: string; csv: string; pdf: string; clear: string; remove: string; copied: string; citations: string; sources: string; page: string };

/** The selection tray: review, remove, export. Everything happens in the browser. */
export function SelectionView({ labels, disclaimer }: { labels: L; disclaimer: string }) {
  const [items, setItems] = useState<SelItem[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const sync = () => setItems(readSelection());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); setMsg(labels.copied); } catch { setMsg(''); } };
  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(items)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `yatharth-bharat-selection-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  if (!items.length) return <p className="mt-6 text-ink-muted">{labels.empty}</p>;
  const btn = 'text-sm border border-rule rounded-[var(--radius-control)] px-3 py-1.5 hover:border-ink';
  return (
    <div>
      <div className="no-print mt-6 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => copy(toText(items, disclaimer))}>{labels.copyText}</button>
        <button type="button" className={btn} onClick={() => copy(toMarkdown(items, disclaimer))}>{labels.copyMd}</button>
        {items.some((i) => i.table) && <button type="button" className={btn} onClick={download}>{labels.csv}</button>}
        <button type="button" className={btn} onClick={() => window.print()}>{labels.pdf}</button>
        <button type="button" className={`${btn} text-sindoor`} onClick={clearSelection}>{labels.clear}</button>
      </div>
      <p aria-live="polite" className="no-print mt-2 text-sm text-peacock min-h-5">{msg}</p>
      <ol className="mt-4 space-y-8">
        {items.map((i) => {
          const c = citations(i);
          return (
            <li key={i.id} className="border-t border-rule pt-4 break-inside-avoid">
              <div className="flex justify-between gap-4">
                <div><p className="text-xs uppercase tracking-wide text-ink-muted">{i.kind}</p><h2 className="text-xl font-semibold">{i.title}</h2></div>
                <button type="button" className="no-print text-sm underline text-ink-muted self-start" onClick={() => removeItem(i.id)}>{labels.remove}</button>
              </div>
              {i.lines.map((l) => <p key={l} className="mt-1">{l}</p>)}
              {i.table && (
                <table className="mt-2 text-sm border-collapse">
                  <thead><tr className="border-b border-ink text-left">{i.table.head.map((h) => <th key={h} scope="col" className="pr-4 py-1">{h}</th>)}</tr></thead>
                  <tbody>{i.table.rows.map((r) => <tr key={r.join('|')} className="border-b border-rule">{r.map((v, k) => <td key={k} className="pr-4 py-1 num">{v}</td>)}</tr>)}</tbody>
                </table>
              )}
              <p className="mt-2 text-sm font-medium">{labels.sources}</p>
              <ul className="text-sm list-disc pl-5">
                {i.sources.map((s) => <li key={s.url + (s.ref ?? '')}>{s.publisher}, {s.title}{s.ref ? `, ${s.ref}` : ''}. <a href={s.url} className="break-all">{s.url}</a> ({s.retrieved.slice(0, 10)})</li>)}
                <li>{labels.page}: <a href={i.page} className="break-all">{i.page}</a></li>
              </ul>
              {i.sources.length > 0 && (
                <details className="mt-2 text-sm"><summary className="cursor-pointer">{labels.citations}</summary>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt>APA</dt><dd className="break-all">{c.apa}</dd><dt>MLA</dt><dd className="break-all">{c.mla}</dd>
                    <dt>Chicago</dt><dd className="break-all">{c.chicago}</dd><dt>BibTeX</dt><dd><pre className="whitespace-pre-wrap font-mono text-xs">{c.bibtex}</pre></dd>
                  </dl>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
