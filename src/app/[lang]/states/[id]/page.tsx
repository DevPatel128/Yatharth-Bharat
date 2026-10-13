import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, fmtNumber, fmtPeriod, isLang, LANGS, pick } from '@/lib/i18n';
import { DISPLAY_DECIMALS, LOK_SABHA, REGIONS, getRegion, mpsFor, regionalFor } from '@/lib/data';
import { MemberTable } from '@/components/MemberTable';
import { SelectButton } from '@/components/SelectButton';
import { indicatorItem } from '@/lib/sel-items';
import { LineChart } from '@/components/LineChart';
import { buildMap, MAP_H, MAP_W } from '@/lib/geo';
import { Bi, anyFallback } from '@/components/Bi';
import { Disclaimer, HindiPendingNote } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';
import { citiesOf, districtsOf, nicEvidence } from '@/lib/districts';
import { stateMap } from '@/lib/geo-local';
import { PlaceMap } from '@/components/PlaceMap';
import { Search, type SearchItem } from '@/components/Search';

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
  const mps = mpsFor(r.id);
  const vacant = LOK_SABHA.noSittingMember.filter((v) => v.regionId === r.id);
  const s = shapes.find((x) => x.id === r.id);
  const [[x0, y0], [x1, y1]] = s?.bounds ?? [[0, 0], [MAP_W, MAP_H]];
  const padX = (x1 - x0) * 0.15 + 4, padY = (y1 - y0) * 0.15 + 4;
  const districts = districtsOf(r.id);
  const cities = citiesOf(r.id);
  const p = d.places;
  const placeNames = Object.fromEntries([...districts.map((x) => [x.id, x.name.en]), ...cities.map((c) => [c.id, c.name])]);
  const places: SearchItem[] = [
    ...districts.map((x) => ({ href: `/${lang}/states/${r.id}/${x.id}`, title: x.name.en, kind: p.district, terms: x.name.en.toLowerCase() })),
    ...cities.map((c) => ({ href: `/${lang}/states/${r.id}/${c.district.id}/${c.id}`, title: c.name, kind: `${p.city} · ${c.district.name.en}`, terms: c.name.toLowerCase() })),
    ...districts.flatMap((x) => x.blocks.map((b) => ({ href: `/${lang}/states/${r.id}/${x.id}#blocks-h`, title: b.name, kind: `${p.legendBlock} · ${x.name.en}`, terms: b.name.toLowerCase() }))),
  ];

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

      {districts.length > 0 && (
        <section className="mt-10" aria-labelledby="places-h">
          <h2 id="places-h" className="text-2xl font-semibold">{p.heading}</h2>
          <p className="mt-1 text-ink-muted max-w-3xl">{p.lede(districts.length, cities.length)}</p>
          <div className="mt-4 max-w-xl">
            <Search items={places} label={d.home.findLabel} placeholder={d.home.findPlaceholder} noResults={d.home.noResults} />
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
            <PlaceMap
              map={stateMap(r.id)} names={placeNames} label={p.mapLabel(pick(r.name, lang).text)} showLabels={districts.length <= 40}
              districtHref={(x) => `/${lang}/states/${r.id}/${x}`}
              cityHref={(c) => `/${lang}/states/${r.id}/${cities.find((x) => x.id === c)?.district.id ?? ''}/${c}`}
              legend={{ district: p.legendDistrict, city: p.legendCity, block: p.legendBlock }}
            />
            <div className="overflow-x-auto max-h-[78vh] overflow-y-auto" tabIndex={0} role="region" aria-label={p.districtsHeading}>
              <table className="w-full text-[0.95rem] border-collapse">
                <thead className="sticky top-0 bg-paper">
                  <tr className="border-b border-ink text-left">
                    <th scope="col" className="py-1.5 pr-3">{p.colDistrict}</th>
                    <th scope="col" className="py-1.5 pl-2 text-right">{p.colBlocks}</th>
                    <th scope="col" className="py-1.5 pl-2 text-right">{p.colCities}</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map((x) => (
                    <tr key={x.id} className="border-b border-rule">
                      <th scope="row" className="py-1.5 pr-3 text-left font-normal"><a href={`/${lang}/states/${r.id}/${x.id}`} lang="en">{x.name.en}</a></th>
                      <td className="py-1.5 pl-2 text-right num">{x.blocks.length}</td>
                      <td className="py-1.5 pl-2 text-right num">{x.cities.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-muted max-w-3xl">{p.sourceNote}</p>
          {lang === 'hi' && <p className="mt-1 text-sm text-ink-muted">{p.englishNames}</p>}
        </section>
      )}

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
              <div className="mt-2"><SelectButton item={indicatorItem(indicator, s.observations, lang, dec, r.name.en)} labels={{ add: d.sel.add, added: d.sel.added }} /></div>
              <LineChart points={s.observations} lang={lang} decimals={dec} height={140} unit={`${pick(indicator.unit, lang).text}`}
                label={d.scorecard.chartAlt(`${name}, ${pick(r.name, lang).text}`, fmtPeriod(s.observations[0]?.period ?? '', lang), fmtPeriod(last?.period ?? '', lang))} />
            </article>
          );
        })}
      </section>

      <section className="mt-10" aria-labelledby="mps-h">
        <h2 id="mps-h" className="text-xl font-semibold">{d.reps.mpsHeading} ({mps.length})</h2>
        <p className="mt-1 text-sm text-ink-muted max-w-3xl">{d.reps.whatMpDoesBody}</p>
        <div className="mt-3 max-w-4xl">
          <MemberTable rows={mps.map((m) => ({ ...m, regionName: '' }))} lang={lang} showState={false} labels={{ constituency: d.reps.constituency, member: d.reps.member, party: d.reps.party, state: d.reps.state }} />
        </div>
        {vacant.map((v) => <p key={v.constituency.en} className="mt-2 text-sm text-ink-muted">{pick(v.constituency, lang).text}: {d.reps.noSitting}</p>)}
        <p className="mt-2 text-sm"><Link href={`/${lang}/representatives`}>{d.nav.reps}</Link></p>
      </section>

      <ReferenceList evidence={[...r.evidence, ...(districts.length ? [nicEvidence('districts')] : []), ...(mps[0]?.evidence.slice(0, 1) ?? []), ...series.flatMap(({ series: s }) => s.observations.at(-1)?.evidence ?? [])]} lang={lang} />
      <Disclaimer lang={lang} />
    </article>
  );
}
