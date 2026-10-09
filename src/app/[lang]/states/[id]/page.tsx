import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, isLang, LANGS, pick } from '@/lib/i18n';
import { REGIONS, getRegion } from '@/lib/data';
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
        <p className="mt-2 text-ink-muted max-w-2xl">{d.region.noRegionalData} <Link href={`/${lang}/scorecard`}>{d.nav.scorecard}</Link></p>
      </section>

      <ReferenceList evidence={r.evidence} lang={lang} />
      <Disclaimer lang={lang} />
    </article>
  );
}
