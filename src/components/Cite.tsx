import { pick, type Lang } from '@/lib/i18n';
import { getSource } from '@/lib/sources';
import type { z } from 'zod';
import type { Citation } from '@/lib/schema';

/** A citation: the article reference and, for the Constitution, the exact quoted words (official English). */
export function Cite({ c, lang, label }: { c: z.infer<typeof Citation>; lang: Lang; label: string }) {
  if (c.quote) {
    return (
      <figure className="mt-2 border-l-0 pl-0">
        <blockquote lang="en" className="text-[0.95rem] bg-paper-raised border border-rule rounded-[var(--radius-control)] px-3 py-2">“{c.quote}”</blockquote>
        <figcaption className="text-xs text-ink-muted mt-1">{label}, {c.ref}</figcaption>
      </figure>
    );
  }
  return <p className="mt-2 text-xs text-ink-muted">{pick(getSource(c.sourceId).name, lang).text}: {c.ref}</p>;
}
