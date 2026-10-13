import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, fmtNumber, isLang, LANGS, pick } from '@/lib/i18n';
import { getRegion } from '@/lib/data';
import { DISTRICTS, getCity, getDistrict, nicEvidence } from '@/lib/districts';
import { cityMap } from '@/lib/geo-local';
import { Disclaimer } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export const dynamicParams = false;
export function generateStaticParams() {
  // One page per city, under the district where most of it lies.
  return LANGS.flatMap((lang) => DISTRICTS.districts.flatMap((d) => d.cities.filter((c) => c.main === d.id).map((c) => ({ lang, id: d.regionId, district: d.id, city: c.id }))));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/states/[id]/[district]/[city]'>): Promise<Metadata> {
  const { lang, id, district, city } = await params;
  const c = getCity(id, district, city);
  const r = getRegion(id);
  return c && r && isLang(lang) ? { title: `${c.name}, ${pick(r.name, lang).text}` } : {};
}

export default async function CityPage({ params }: PageProps<'/[lang]/states/[id]/[district]/[city]'>) {
  const { lang, id, district, city } = await params;
  const r = getRegion(id);
  const dist = getDistrict(id, district);
  const c = getCity(id, district, city);
  if (!isLang(lang) || !r || !dist || !c) notFound();
  const d = dict(lang);
  const p = d.places;
  const state = pick(r.name, lang).text;
  const map = cityMap(id, c.id);
  const also = c.alsoIn.map((x) => getDistrict(id, x)).filter((x) => !!x);

  return (
    <article className="pt-8">
      <p><a href={`/${lang}/states/${id}/${dist.id}`}>← {p.back(dist.name.en)}</a></p>
      <header className="mt-4">
        <p className="text-sm uppercase tracking-wide text-ink-muted">{c.kind ?? p.kindUnknown} · <span lang="en">{dist.name.en}</span> · {state}</p>
        <h1 className="text-4xl font-semibold mt-1" lang="en">{c.name}</h1>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
          <div><dt className="text-sm text-ink-muted">{p.area}</dt><dd className="text-2xl num">{fmtNumber(c.areaKm2, lang, 0)} <span className="text-sm text-ink-muted">km²</span></dd></div>
          <div><dt className="text-sm text-ink-muted">{p.wardsHeading}</dt><dd className="text-2xl num">{c.wards || '—'}</dd></div>
          <div><dt className="text-sm text-ink-muted">{p.inDistrict}</dt><dd className="text-lg" lang="en"><a href={`/${lang}/states/${id}/${dist.id}`}>{dist.name.en}</a></dd></div>
        </dl>
        {also.length > 0 && <p className="mt-2">{p.alsoIn}: {also.map((o, i) => <span key={o.id}>{i > 0 && ', '}<a href={`/${lang}/states/${id}/${o.id}`} lang="en">{o.name.en}</a></span>)}</p>}
        <p className="mt-2 text-sm text-ink-muted">{p.areaNote}</p>
      </header>

      {map && (
        <section className="mt-8 max-w-4xl" aria-labelledby="wards-h">
          <h2 id="wards-h" className="text-xl font-semibold">{map.wards.length ? p.wardsHeading : p.city}</h2>
          {!map.wards.length && <p className="mt-1 text-sm text-ink-muted">{p.noWards}</p>}
          <svg viewBox={`0 0 ${map.w} ${map.h}`} className="mt-3 w-full h-auto max-h-[78vh] reveal" role="img" aria-label={p.wardMapLabel(c.name)}>
            {map.outline && <path d={map.outline} fill={map.wards.length ? 'none' : 'var(--peacock)'} fillOpacity="0.25" stroke="var(--ink)" strokeWidth="1.4" />}
            {map.wards.map((w, i) => (
              <g key={`${w.n}-${i}`}>
                <title>{`${p.ward} ${w.n}`}</title>
                <path d={w.d} className="fill-[var(--paper-raised)] hover:fill-[color-mix(in_srgb,var(--peacock)_30%,var(--paper-raised))] transition-[fill] duration-150" stroke="var(--peacock)" strokeWidth="0.7" />
              </g>
            ))}
            {map.wards.length <= 260 && map.wards.map((w, i) => (
              <text key={`t-${i}`} x={w.label[0]} y={w.label[1]} textAnchor="middle" dominantBaseline="central" className="fill-[var(--ink)] text-[8px] num pointer-events-none">{w.n}</text>
            ))}
          </svg>
          {map.wards.length > 0 && <p className="mt-2 text-sm text-ink-muted">{p.wardListNote}</p>}
        </section>
      )}

      <p className="mt-10 text-sm text-ink-muted max-w-3xl">{p.notYetDistrict}</p>
      <p className="mt-2 text-sm text-ink-muted max-w-3xl">{p.sourceNote}</p>
      {lang === 'hi' && <p className="mt-2 text-sm text-ink-muted">{p.englishNames}</p>}
      <ReferenceList evidence={[nicEvidence('cities'), ...(c.wards ? [nicEvidence('wards')] : [])]} lang={lang} />
      <Disclaimer lang={lang} />
    </article>
  );
}
