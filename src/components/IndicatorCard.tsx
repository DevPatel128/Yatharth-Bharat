import Link from 'next/link';
import { dict, fmtNumber, fmtPeriod, type Lang } from '@/lib/i18n';
import { DISPLAY_DECIMALS } from '@/lib/data';
import { getSource } from '@/lib/sources';
import type { Indicator } from '@/lib/schema';
import { Bi } from './Bi';

/** One indicator: latest value with its unit, period and source always visible. */
export function IndicatorCard({ ind, lang }: { ind: Indicator; lang: Lang }) {
  const d = dict(lang);
  const last = ind.observations.at(-1);
  const src = getSource(ind.sourceId);
  return (
    <article className="border border-rule rounded-[var(--radius-card)] bg-paper-raised p-4 flex flex-col">
      <h3 className="text-base font-sans font-semibold leading-snug">
        <Link href={`/${lang}/scorecard/${ind.id}`} className="no-underline hover:underline"><Bi value={ind.name} lang={lang} /></Link>
      </h3>
      {last ? (
        <>
          <p className="mt-3 text-3xl num">{fmtNumber(last.value, lang, DISPLAY_DECIMALS[ind.id] ?? 1)}</p>
          <p className="text-sm text-ink-muted"><Bi value={ind.unit} lang={lang} /> · {fmtPeriod(last.period, lang)}</p>
        </>
      ) : (
        <p className="mt-3 text-ink-muted">{d.freshness.unavailable}</p>
      )}
      <p className="mt-auto pt-3 text-xs text-ink-muted">
        {src.publisher.split(',')[0]}
        {src.category === 'international-organisation' && <> · {d.scorecard.internationalSource}</>}
      </p>
    </article>
  );
}
