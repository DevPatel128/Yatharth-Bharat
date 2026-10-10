import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, fmtNumber, fmtPeriod, isLang, LANGS, pick } from '@/lib/i18n';
import { DISPLAY_DECIMALS, INDICATORS, getIndicator } from '@/lib/data';
import { getSource } from '@/lib/sources';
import { Bi } from '@/components/Bi';
import { Freshness } from '@/components/Freshness';
import { LineChart } from '@/components/LineChart';
import { Disclaimer } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.flatMap((lang) => INDICATORS.map((i) => ({ lang, id: i.id })));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/scorecard/[id]'>): Promise<Metadata> {
  const { lang, id } = await params;
  const i = getIndicator(id);
  return i && isLang(lang) ? { title: pick(i.name, lang).text, description: pick(i.definition, lang).text } : {};
}

export default async function IndicatorPage({ params }: PageProps<'/[lang]/scorecard/[id]'>) {
  const { lang, id } = await params;
  const ind = getIndicator(id);
  if (!isLang(lang) || !ind) notFound();
  const d = dict(lang);
  const dec = DISPLAY_DECIMALS[ind.id] ?? 1;
  const obs = ind.observations;
  const last = obs.at(-1);
  const src = getSource(ind.sourceId);
  const name = pick(ind.name, lang).text;
  const revised = obs.filter((o) => o.revisions.length);
  const direction = { higher: d.scorecard.higherBetter, lower: d.scorecard.lowerBetter, neutral: d.scorecard.neutral }[ind.direction];

  return (
    <article className="pt-8 max-w-4xl">
      <p><Link href={`/${lang}/scorecard`}>← {d.scorecard.title}</Link></p>
      <p className="mt-4 text-sm uppercase tracking-wide text-ink-muted">{d.scorecard.categories[ind.category]}</p>
      <h1 className="text-4xl font-semibold mt-1"><Bi value={ind.name} lang={lang} /></h1>
      <Freshness indicator={ind} lang={lang} />
      {src.category === 'international-organisation' && <p className="mt-2 text-sm text-haldi font-medium">{d.scorecard.internationalSource}</p>}

      {last && (
        <section className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <p className="text-sm text-ink-muted">{d.scorecard.latest}</p>
            <p className="text-5xl num">{fmtNumber(last.value, lang, dec)}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
            <dt className="text-ink-muted">{d.scorecard.unit}</dt><dd><Bi value={ind.unit} lang={lang} /></dd>
            <dt className="text-ink-muted">{d.scorecard.period}</dt><dd>{fmtPeriod(last.period, lang)}</dd>
            <dt className="text-ink-muted">{d.scorecard.series}</dt><dd>{last.series}</dd>
            <dt className="text-ink-muted">{d.scorecard.status}</dt><dd>{last.status === 'unknown' ? d.scorecard.statusUnknown : last.status}</dd>
          </dl>
        </section>
      )}

      <LineChart points={obs} lang={lang} decimals={dec} unit={`${pick(ind.unit, lang).text} · ${src.publisher.split(',')[0]}`}
        label={d.scorecard.chartAlt(name, fmtPeriod(obs[0]?.period ?? '', lang), fmtPeriod(last?.period ?? '', lang))} />
      <p className="text-sm text-ink-muted">{direction}</p>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <div><h2 className="text-lg font-semibold">{d.scorecard.definition}</h2><p className="mt-1"><Bi value={ind.definition} lang={lang} /></p></div>
        <div><h2 className="text-lg font-semibold">{d.scorecard.methodology}</h2><p className="mt-1"><Bi value={ind.methodology} lang={lang} /></p></div>
        <div><h2 className="text-lg font-semibold">{d.scorecard.limitations}</h2><p className="mt-1"><Bi value={ind.limitations} lang={lang} /></p></div>
      </section>

      <section className="mt-8" aria-labelledby="tbl">
        <h2 id="tbl" className="text-lg font-semibold">{d.scorecard.table}</h2>
        <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={name}>
          <table className="w-full text-sm border-collapse">
            <caption className="sr-only">{name}</caption>
            <thead><tr className="border-b border-ink text-left"><th scope="col" className="py-1.5 pr-4">{d.scorecard.period}</th><th scope="col" className="py-1.5 pr-4 text-right">{d.scorecard.value}</th><th scope="col" className="py-1.5">{d.scorecard.series}</th></tr></thead>
            <tbody>
              {[...obs].reverse().map((o) => (
                <tr key={o.period} className="border-b border-rule">
                  <th scope="row" className="py-1.5 pr-4 font-normal text-left">{fmtPeriod(o.period, lang)}</th>
                  <td className="py-1.5 pr-4 text-right num">{fmtNumber(o.value, lang, dec)}</td>
                  <td className="py-1.5 text-ink-muted">{o.series}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{d.scorecard.revisions}</h2>
        {revised.length ? (
          <ul className="mt-2 text-sm">{revised.map((o) => <li key={o.period}>{fmtPeriod(o.period, lang)}: {fmtNumber(o.value, lang, dec)} ({d.scorecard.revisedFrom} {o.revisions.map((r) => fmtNumber(r.value, lang, dec)).join(', ')})</li>)}</ul>
        ) : <p className="mt-1 text-sm text-ink-muted">{d.scorecard.noRevisions}</p>}
      </section>

      <ReferenceList evidence={last?.evidence ?? []} lang={lang} />
      <Disclaimer lang={lang} />
    </article>
  );
}
