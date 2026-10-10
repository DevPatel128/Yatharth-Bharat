import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, fmtNumber, fmtPeriod, isLang, pick } from '@/lib/i18n';
import { DISPLAY_DECIMALS, REGIONAL, getIndicator, getRegion } from '@/lib/data';
import type { Evidence } from '@/lib/schema';
import { PORTALS, type Portal } from '@/content/portals';
import { IndicatorCard } from '@/components/IndicatorCard';
import { Disclaimer, HindiPendingNote } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export async function generateMetadata({ params }: PageProps<'/[lang]/education'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).education.title, description: dict(lang).education.lede } : {};
}

/** Learning first, then work. */
const FIGURES = ['higher-education-ger', 'adult-literacy', 'education-expenditure', 'unemployment-rate', 'female-labour-participation'];

export default async function Education({ params }: PageProps<'/[lang]/education'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const e = d.education;
  const inds = FIGURES.map((id) => getIndicator(id)!).filter((i) => i.observations.length);
  const ger = REGIONAL.find((r) => r.indicatorId === 'higher-education-ger')!;
  const dec = DISPLAY_DECIMALS['higher-education-ger'] ?? 1;
  const rows = Object.entries(ger.regions)
    .map(([id, v]) => ({ region: getRegion(id)!, last: v.observations.at(-1) }))
    .filter((r) => r.last)
    .map((r) => ({ ...r, name: pick(r.region.name, lang) }))
    .sort((a, b) => a.name.text.localeCompare(b.name.text, lang === 'hi' ? 'hi' : 'en'));
  const groups = (['scholarships', 'study', 'jobs'] as const).map((g) => [g, PORTALS.filter((p) => p.group === g)] as const);
  const evidence: Evidence[] = [...inds.map((i) => i.observations.at(-1)!.evidence[0]), ...rows.slice(0, 1).map((r) => r.last!.evidence[0])];
  const hindiMissing = lang === 'hi' && rows.some((r) => r.name.fallback);

  return (
    <div className="pt-8 max-w-5xl">
      <h1 className="text-4xl font-semibold">{e.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{e.lede}</p>

      <section className="mt-10" aria-labelledby="fig-h">
        <h2 id="fig-h" className="text-2xl font-semibold">{e.figuresHeading}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inds.map((i) => <IndicatorCard key={i.id} ind={i} lang={lang} />)}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="ger-h">
        <h2 id="ger-h" className="text-2xl font-semibold">{e.statesHeading}</h2>
        <p className="mt-2 text-sm text-ink-muted max-w-3xl">{e.statesNote}</p>
        <div className="mt-3 overflow-x-auto max-w-2xl" tabIndex={0} role="region" aria-labelledby="ger-h">
          <table className="w-full text-[0.95rem] border-collapse">
            <thead>
              <tr className="border-b border-ink text-left">
                <th scope="col" className="py-1.5 pr-4">{e.regionCol}</th>
                <th scope="col" className="py-1.5 pl-3 text-right">{e.valueCol}</th>
                <th scope="col" className="py-1.5 pl-3 text-right">{e.yearCol}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ region, last, name }) => (
                <tr key={region.id} className="border-b border-rule">
                  <th scope="row" className="py-1.5 pr-4 text-left font-normal"><Link href={`/${lang}/states/${region.id}`} lang={name.fallback ? 'en' : undefined}>{name.text}</Link></th>
                  <td className="py-1.5 pl-3 text-right num">{fmtNumber(last!.value, lang, dec)}</td>
                  <td className="py-1.5 pl-3 text-right num whitespace-nowrap">{fmtPeriod(last!.period, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="portals-h">
        <h2 id="portals-h" className="text-2xl font-semibold">{e.portalsHeading}</h2>
        <p className="mt-2 text-sm text-ink-muted max-w-3xl">{e.portalsNote}</p>
        {groups.map(([g, ps]) => (
          <div key={g} className="mt-6">
            <h3 className="text-lg font-semibold">{e.groups[g]}</h3>
            <ul className="mt-2 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {ps.map((p: Portal) => (
                <li key={p.id} className="border-t border-rule pt-3">
                  <a href={p.url} rel="noopener noreferrer" className="font-medium">{pick(p.name, lang).text}</a>
                  <p className="text-sm text-ink-muted">{pick(p.body, lang).text}</p>
                  <p className="mt-1 text-[0.95rem]">{pick(p.what, lang).text}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="mt-10 text-sm text-ink-muted">{e.notYet}</p>
      <HindiPendingNote lang={lang} show={hindiMissing} />
      <ReferenceList evidence={evidence} lang={lang} />
      <Disclaimer lang={lang} />
    </div>
  );
}
