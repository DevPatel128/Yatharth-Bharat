import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, isLang, pick } from '@/lib/i18n';
import { HEADLINE, INDICATORS, REGIONS, getIndicator } from '@/lib/data';
import { MAP_H, MAP_W } from '@/lib/geo';
import { IndiaMap, type MapRegion } from '@/components/IndiaMap';
import { Search, type SearchItem } from '@/components/Search';
import { IndicatorCard } from '@/components/IndicatorCard';
import { Disclaimer, HindiPendingNote } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const regions: Record<string, MapRegion> = Object.fromEntries(REGIONS.map((r) => {
    const n = pick(r.name, lang), c = r.capital ? pick(r.capital, lang) : null;
    return [r.id, { id: r.id, name: n.text, nameLang: n.fallback ? 'en' : lang, kindLabel: r.kind === 'state' ? d.region.state : d.region.ut, capital: c?.text ?? null, capitalLang: c?.fallback ? 'en' : lang }];
  }));
  const searchItems: SearchItem[] = [
    ...REGIONS.map((r) => ({ href: `/${lang}/states/${r.id}`, title: pick(r.name, lang).text, kind: r.kind === 'state' ? d.region.state : d.region.ut, terms: `${r.name.en} ${r.name.hi ?? ''}`.toLowerCase() })),
    ...INDICATORS.map((i) => ({ href: `/${lang}/scorecard/${i.id}`, title: pick(i.name, lang).text, kind: d.scorecard.categories[i.category], terms: `${i.name.en} ${i.name.hi ?? ''} ${i.definition.en}`.toLowerCase() })),
  ];
  const headline = HEADLINE.map(getIndicator).filter((i) => i !== undefined);
  const byKind = (k: 'state' | 'union-territory') => REGIONS.filter((r) => r.kind === k).sort((a, b) => pick(a.name, lang).text.localeCompare(pick(b.name, lang).text, lang));

  return (
    <>
      <section className="pt-8 pb-4 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold max-w-2xl">{d.tagline}</h1>
          <p className="mt-3 max-w-2xl text-ink-muted">{d.home.lede}</p>
        </div>
        <Search items={searchItems} label={d.home.searchLabel} placeholder={d.home.searchPlaceholder} noResults={d.home.noResults} />
      </section>

      <section aria-labelledby="map-h" className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <h2 id="map-h" className="sr-only">{d.home.mapHeading}</h2>
          <IndiaMap regions={regions} width={MAP_W} height={MAP_H} lang={lang}
            labels={{ hint: d.home.mapHint, capital: d.region.capital, viewDetails: d.region.viewDetails, close: d.region.close, back: d.region.back, skipMap: d.skipMap }} />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-3">{d.home.indicatorsHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {headline.map((i) => <IndicatorCard key={i.id} ind={i} lang={lang} />)}
          </div>
          <p className="mt-3"><Link href={`/${lang}/scorecard`}>{d.home.allIndicators}</Link></p>
        </div>
      </section>

      <section id="region-list" aria-labelledby="list-h" className="mt-10" tabIndex={-1}>
        <h2 id="list-h" className="text-xl font-semibold">{d.home.listHeading}</h2>
        <HindiPendingNote lang={lang} show={lang === 'hi' && REGIONS.some((r) => !r.name.hi)} />
        {(['state', 'union-territory'] as const).map((k) => (
          <div key={k} className="mt-4">
            <h3 className="font-sans text-sm uppercase tracking-wide text-ink-muted mb-2">{k === 'state' ? d.home.states : d.home.uts} ({byKind(k).length})</h3>
            <ul className="columns-2 sm:columns-3 lg:columns-4 gap-6">
              {byKind(k).map((r) => {
                const n = pick(r.name, lang);
                return <li key={r.id} className="break-inside-avoid py-0.5"><Link href={`/${lang}/states/${r.id}`} lang={n.fallback ? 'en' : undefined}>{n.text}</Link></li>;
              })}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="how-h" className="mt-12 border-t border-rule pt-8">
        <h2 id="how-h" className="text-xl font-semibold">{d.home.howHeading}</h2>
        <ol className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2 list-decimal pl-5 max-w-4xl">
          {d.home.how.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <p className="mt-4"><Link href={`/${lang}/sources`}>{d.home.readMethod}</Link></p>
      </section>

      <ReferenceList evidence={[...REGIONS.flatMap((r) => r.evidence).slice(0, 1), ...headline.flatMap((i) => i.observations.at(-1)?.evidence ?? [])]} lang={lang} />
      <Disclaimer lang={lang} />
    </>
  );
}
