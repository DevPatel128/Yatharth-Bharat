import { dict, fmtDate, pick, type Lang } from '@/lib/i18n';
import { getSource } from '@/lib/sources';
import type { Evidence } from '@/lib/schema';

/** Every source behind a page: publisher, link, retrieval date, method, and the exact evidence text. */
export function ReferenceList({ evidence, lang }: { evidence: Evidence[]; lang: Lang }) {
  const d = dict(lang);
  const unique = [...new Map(evidence.map((e) => [`${e.sourceId}|${e.url}`, e])).values()];
  return (
    <section aria-labelledby="refs" className="mt-10">
      <h2 id="refs" className="text-xl font-semibold mb-3">{d.references.heading}</h2>
      <ol className="space-y-4 list-decimal pl-5">
        {unique.map((e) => {
          const s = getSource(e.sourceId);
          return (
            <li key={`${e.sourceId}${e.url}`} className="pl-1">
              <p className="font-medium">{s.publisher}</p>
              <p><a href={e.url} rel="noopener noreferrer" className="break-all">{pick(s.name, lang).text}</a></p>
              <p className="text-sm text-ink-muted">
                {d.references.retrieved}: {fmtDate(e.retrievedAt, lang)} · {d.references.method[e.method]} · {d.sources.categories[s.category]}
              </p>
              <details className="mt-1 text-sm">
                <summary className="cursor-pointer text-ink-muted">{d.references.evidence}</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all bg-paper-raised border border-rule rounded-[var(--radius-control)] p-3 font-mono text-xs">{e.quote}</pre>
                <p className="text-xs text-ink-muted mt-1 num">SHA-256 {e.snapshotSha256}</p>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
