import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, fmtNumber, isLang, LANGS, pick } from '@/lib/i18n';
import { getRegion } from '@/lib/data';
import { DISTRICTS, districtsOf, getDistrict, nicEvidence } from '@/lib/districts';
import { districtMap } from '@/lib/geo-local';
import { PlaceMap } from '@/components/PlaceMap';
import { Disclaimer } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.flatMap((lang) => DISTRICTS.districts.map((d) => ({ lang, id: d.regionId, district: d.id })));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/states/[id]/[district]'>): Promise<Metadata> {
  const { lang, id, district } = await params;
  const d = getDistrict(id, district);
  const r = getRegion(id);
  return d && r && isLang(lang) ? { title: `${d.name.en}, ${pick(r.name, lang).text}` } : {};
}

export default async function DistrictPage({ params }: PageProps<'/[lang]/states/[id]/[district]'>) {
  const { lang, id, district } = await params;
  const r = getRegion(id);
  const dist = getDistrict(id, district);
  if (!isLang(lang) || !r || !dist) notFound();
  const d = dict(lang);
  const p = d.places;
  const state = pick(r.name, lang).text;
  const map = districtMap(id, dist.id, dist.cities.map((c) => c.id));
  const names = Object.fromEntries([...districtsOf(id).map((x) => [x.id, x.name.en]), ...dist.cities.map((c) => [c.id, c.name])]);
  const others = (ids: string[]) => ids.map((x) => getDistrict(id, x)).filter((x) => !!x);

  return (
    <article className="pt-8">
      <p><Link href={`/${lang}/states/${id}`}>← {p.back(state)}</Link></p>
      <header className="mt-4">
        <p className="text-sm uppercase tracking-wide text-ink-muted">{p.district} · {state}</p>
        <h1 className="text-4xl font-semibold mt-1" lang="en">{dist.name.en}</h1>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
          <div><dt className="text-sm text-ink-muted">{p.area}</dt><dd className="text-2xl num">{fmtNumber(dist.areaKm2, lang, 0)} <span className="text-sm text-ink-muted">km²</span></dd></div>
          <div><dt className="text-sm text-ink-muted">{p.colBlocks}</dt><dd className="text-2xl num">{dist.blocks.length}</dd></div>
          <div><dt className="text-sm text-ink-muted">{p.colCities}</dt><dd className="text-2xl num">{dist.cities.length}</dd></div>
          {dist.lgd && <div><dt className="text-sm text-ink-muted">{p.lgd}</dt><dd className="text-2xl num">{dist.lgd}</dd></div>}
        </dl>
        <p className="mt-2 text-sm text-ink-muted">{p.areaNote}</p>
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] items-start" aria-labelledby="map-h">
        <h2 id="map-h" className="sr-only">{p.heading}</h2>
        <PlaceMap
          map={map} names={names} focus={dist.id} label={p.mapLabel(dist.name.en)}
          districtHref={(x) => `/${lang}/states/${id}/${x}`} cityHref={(c) => `/${lang}/states/${id}/${dist.id}/${c}`}
          legend={{ district: p.legendDistrict, city: p.legendCity, block: p.legendBlock }}
        />
        <div>
          <h2 className="text-xl font-semibold">{p.citiesHeading}</h2>
          {dist.cities.length === 0 && <p className="mt-2 text-ink-muted">{p.noCities}</p>}
          <ul className="mt-2 space-y-2">
            {dist.cities.map((c) => (
              <li key={c.id}>
                <a href={`/${lang}/states/${id}/${dist.id}/${c.id}`} lang="en" className="font-medium">{c.name}</a>
                <span className="block text-sm text-ink-muted">
                  {c.kind ?? p.kindUnknown}{c.wards > 0 && ` · ${p.wards(c.wards)}`}
                  {c.alsoIn.length > 0 && <> · {p.alsoIn}: {others(c.alsoIn).map((o, i) => <span key={o.id}>{i > 0 && ', '}<a href={`/${lang}/states/${id}/${o.id}`} lang="en">{o.name.en}</a></span>)}</>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="blocks-h">
        <h2 id="blocks-h" className="text-xl font-semibold">{p.blocksHeading} ({dist.blocks.length})</h2>
        <p className="mt-1 text-sm text-ink-muted max-w-3xl">{p.blocksNote}</p>
        {dist.blocks.length === 0 ? <p className="mt-2 text-ink-muted">{p.noBlocks}</p> : (
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4" lang="en">
            {dist.blocks.map((b) => <li key={b.id}>{b.name}{b.lgd && <span className="text-xs text-ink-muted num"> · {b.lgd}</span>}</li>)}
          </ul>
        )}
      </section>

      <p className="mt-10 text-sm text-ink-muted max-w-3xl">{p.notYetDistrict}</p>
      <p className="mt-2 text-sm text-ink-muted max-w-3xl">{p.sourceNote}</p>
      {lang === 'hi' && <p className="mt-2 text-sm text-ink-muted">{p.englishNames}</p>}
      <ReferenceList evidence={[nicEvidence('districts'), nicEvidence('blocks'), ...(dist.cities.length ? [nicEvidence('cities')] : [])]} lang={lang} />
      <Disclaimer lang={lang} />
    </article>
  );
}
