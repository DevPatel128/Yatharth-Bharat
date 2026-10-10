'use client';
import Link from 'next/link';
import { useId, useState } from 'react';

type Result = { title: string; href: string; source: string; snippet: string };
type Reply = { status: string; answer?: string; citations?: (Result & { n: number })[]; results?: Result[] };
type L = {
  label: string; placeholder: string; submit: string; asking: string; aiLabel: string; answerHeading: string;
  citedHeading: string; resultsHeading: string; status: Record<string, string>; privacy: string;
};

/** Sends the question to /api/ask and shows the checked answer (if any) and the matching records. */
export function AskBox({ lang, labels }: { lang: 'en' | 'hi'; labels: L }) {
  const id = useId();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (question.length < 3 || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: question, lang }) });
      const body = (await res.json()) as Reply;
      setReply(body.status ? body : { status: 'failed' });
    } catch {
      setReply({ status: 'failed' });
    } finally {
      setBusy(false);
    }
  }

  const list = (items: Result[], numbered = false) => (
    <ol className={`mt-2 space-y-3 ${numbered ? 'list-decimal pl-5' : ''}`}>
      {items.map((r) => (
        <li key={r.href + r.title}>
          <Link href={r.href} className="font-medium">{r.title}</Link>
          <p className="text-sm text-ink-muted">{r.source}</p>
          <p className="text-[0.95rem]">{r.snippet}</p>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="mt-8 max-w-3xl">
      <form onSubmit={submit} role="search">
        <label htmlFor={id} className="block text-sm font-medium mb-1">{labels.label}</label>
        <div className="flex gap-2">
          <input
            id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.placeholder}
            maxLength={300} minLength={3} required autoComplete="off" aria-describedby={`${id}-p`}
            className="flex-1 min-w-0 bg-paper-raised border border-rule rounded-[var(--radius-control)] px-3 py-2.5 text-base focus:border-ink"
          />
          <button type="submit" disabled={busy} className="border border-ink rounded-[var(--radius-control)] px-4 py-2 font-medium hover:bg-ink hover:text-paper disabled:opacity-60">{labels.submit}</button>
        </div>
        <p id={`${id}-p`} className="mt-2 text-sm text-ink-muted">{labels.privacy}</p>
      </form>

      <div aria-live="polite" aria-busy={busy} className="mt-6">
        {busy && <p className="text-ink-muted">{labels.asking}</p>}
        {!busy && reply && (
          <>
            {reply.status === 'answered' && reply.answer ? (
              <section aria-labelledby={`${id}-a`} className="border border-rule rounded-[var(--radius-card)] bg-paper-raised p-4">
                <h2 id={`${id}-a`} className="text-xl font-semibold">{labels.answerHeading}</h2>
                <p className="mt-1 text-sm font-medium text-haldi">{labels.aiLabel}</p>
                <p className="mt-3 text-[1.05rem] leading-relaxed">{reply.answer}</p>
                <h3 className="mt-4 font-semibold">{labels.citedHeading}</h3>
                {list(reply.citations ?? [], true)}
              </section>
            ) : (
              <p>{labels.status[reply.status] ?? labels.status.failed}</p>
            )}
            {!!reply.results?.length && (
              <section aria-labelledby={`${id}-r`} className="mt-8">
                <h2 id={`${id}-r`} className="text-xl font-semibold">{labels.resultsHeading}</h2>
                {list(reply.results)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
