import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, fmtNumber, fmtPeriod, isLang, LANGS, pick } from '@/lib/i18n';
import { DISPLAY_DECIMALS, REGIONS, getRegion, regionalFor } from '@/lib/data';
import { LineChart } from '@/components/LineChart';
import { buildMap, MAP_H, MAP_W } from '@/lib/geo';
import { Bi, anyFallback } from '@/components/Bi';
import { Disclaimer, HindiPendingNote } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.flatMap((lang) => REGIONS.map((r) => ({ lang, id: r.id })));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/states/[id]'>): Promise<Metadata> {
  const { lang, id } = await params;
  const r = getRegion(id);
  return r && isLang(lang) ? { title: pick(r.name, lang).text } : {};
}

export default async function RegionPage({ params }: PageProps<'/[lang]/states/[id]'>) {
  const { lang, id } = await params;
  const r = getRegion(id);
  if (!isLang(lang) || !r) notFound();
  const d = dict(lang);
  const { shapes } = buildMap();
  const series = regionalFor(r.id);
  const s = shapes.find((x) => x.id === r.id);
  const [[x0, y0], [x1, y1]] = s?.bounds ?? [[0, 0], [MAP_W, MAP_H]];
  const padX = (x1 - x0) * 0.15 + 4, padY = (y1 - y0) * 0.15 + 4;

  return (
    <article className="pt-8">
      <p><Link href={`/${lang}?region=${r.id}`}>← {d.region.back}</Link></p>
      <header className="mt-4 grid gap-6 md:grid-cols-[1fr_16rem] items-start">
        <div>
          <p className="text-sm uppercase tracking-wide text-ink-muted">{r.kind === 'state' ? d.region.state : d.region.ut}</p>
          <h1 className="text-4xl font-semibold mt-1"><Bi value={r.name} lang={lang} /></h1>
          {lang === 'hi' && r.name.hi && <p className="text-ink-muted mt-1" lang="en">{r.name.en}</p>}
          {r.capital && (
            <p className="mt-4 text-lg"><span className="text-ink-muted">{d.region.capital}: </span><Bi value={r.capital} lang={lang} /></p>
          )}
          {r.id === 'jammu-and-kashmir' && <p className="text-sm text-ink-muted mt-1">{d.region.jkCapitalNote}</p>}
          <HindiPendingNote lang={lang} show={anyFallback([r.name, r.capital], lang)} />
        </div>
        <svg viewBox={`${x0 - padX} ${y0 - padY} ${x1 - x0 + 2 * padX} ${y1 - y0 + 2 * padY}`} className="w-full h-auto max-h-64 reveal" aria-hidden="true">
          {/* Only the selected region is drawn here; the full map lives on the home page. */}
          {s && <path d={s.d} fill="var(--sindoor)" stroke="var(--ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
      </header>

      <section className="mt-10" aria-labelledby="data-h">
        <h2 id="data-h" className="text-xl font-semibold">{d.region.dataHeading}</h2>
        {series.length === 0 && <p className="mt-2 text-ink-muted max-w-2xl">{d.region.noRegionalData} <Link href={`/${lang}/scorecard`}>{d.nav.scorecard}</Link></p>}
        {series.map(({ indicator, series: s }) => {
          const last = s.observations.at(-1);
          const dec = DISPLAY_DECIMALS[indicator.id] ?? 1;
          const national = indicator.observations.find((o) => o.period === last?.period);
          const name = pick(indicator.name, lang).text;
          return (
            <article key={indicator.id} className="mt-4 max-w-3xl">
              <h3 className="text-lg font-sans font-semibold"><Link href={`/${lang}/scorecard/${indicator.id}`}>{name}</Link></h3>
              {last && (
                <p className="mt-1">
                  <span className="text-3xl num">{fmtNumber(last.value, lang, dec)}</span>{' '}
                  <span className="text-sm text-ink-muted">{pick(indicator.unit, lang).text} · {fmtPeriod(last.period, lang)}</span>
                </p>
              )}
              {national && <p className="text-sm text-ink-muted">{d.region.allIndiaSameMonth}: <span className="num">{fmtNumber(national.value, lang, dec)}</span></p>}
              {s.state !== 'verified' && <p className="text-sm text-sindoor">{d.freshness.stale}</p>}
              <LineChart points={s.observations} lang={lang} decimals={dec} height={140} unit={`${pick(indicator.unit, lang).text}`}
                label={d.scorecard.chartAlt(`${name}, ${pick(r.name, lang).text}`, fmtPeriod(s.observations[0]?.period ?? '', lang), fmtPeriod(last?.period ?? '', lang))} />
            </article>
          );
        })}
      </section>

      <ReferenceList evidence={[...r.evidence, ...series.flatMap(({ series: s }) => s.observations.at(-1)?.evidence ?? [])]} lang={lang} />
      <Disclaimer lang={lang} />
    </article>
  );
}
