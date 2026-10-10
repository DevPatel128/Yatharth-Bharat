import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, fmtDate, fmtNumber, isLang } from '@/lib/i18n';
import { AGREEMENTS, TRADE } from '@/lib/data';
import { LineChart } from '@/components/LineChart';
import { Disclaimer, HindiPendingNote } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export async function generateMetadata({ params }: PageProps<'/[lang]/world'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).world.title } : {};
}

const bn = (m: number) => m / 1000; // published in US$ million; shown in billion

export default async function World({ params }: PageProps<'/[lang]/world'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const f = (v: number) => fmtNumber(bn(v), lang, 1);
  const series = 'RBI Direction of Foreign Trade, US$';
  const latest = TRADE.totals.at(-1)!;
  const partners = TRADE.partners.slice(0, 15);
  return (
    <div className="pt-8 max-w-5xl">
      <h1 className="text-4xl font-semibold">{d.world.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{d.world.lede}</p>

      <section className="mt-8" aria-labelledby="t-h">
        <h2 id="t-h" className="text-2xl font-semibold">{d.world.tradeHeading}</h2>
        <div className="mt-3 flex flex-wrap gap-x-10 gap-y-2">
          <p><span className="block text-sm text-ink-muted">{d.world.exports}, {latest.year}</span><span className="text-4xl num">{f(latest.exports)}</span></p>
          <p><span className="block text-sm text-ink-muted">{d.world.imports}, {latest.year}</span><span className="text-4xl num">{f(latest.imports)}</span></p>
          <p><span className="block text-sm text-ink-muted">{d.world.balance}</span><span className="text-4xl num">{f(latest.exports - latest.imports)}</span></p>
        </div>
        <p className="text-sm text-ink-muted mt-1">{d.world.unitBn}</p>
        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <div><h3 className="font-sans font-semibold">{d.world.exports}</h3><LineChart points={TRADE.totals.map((t) => ({ period: t.year, value: bn(t.exports), series }))} lang={lang} decimals={0} unit={d.world.unitBn} label={`${d.world.exports}: ${TRADE.totals[0].year}–${latest.year}`} height={150} /></div>
          <div><h3 className="font-sans font-semibold">{d.world.imports}</h3><LineChart points={TRADE.totals.map((t) => ({ period: t.year, value: bn(t.imports), series }))} lang={lang} decimals={0} unit={d.world.unitBn} label={`${d.world.imports}: ${TRADE.totals[0].year}–${latest.year}`} height={150} /></div>
        </div>
        <p className="mt-3 text-sm max-w-3xl">{d.world.limits}</p>
        <p className="mt-2 text-sm text-ink-muted max-w-3xl">{d.world.check(TRADE.crossCheck.year, f(TRADE.crossCheck.monthlySumExports), f(TRADE.crossCheck.monthlySumImports))}</p>
      </section>

      <section className="mt-10" aria-labelledby="p-h">
        <h2 id="p-h" className="text-2xl font-semibold">{d.world.partnersHeading(TRADE.latestYear)}</h2>
        <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={d.world.partnersHeading(TRADE.latestYear)}>
          <table className="w-full text-[0.95rem] border-collapse">
            <thead><tr className="border-b border-ink text-left">
              <th scope="col" className="py-1.5 pr-4">{d.world.partner}</th><th scope="col" className="py-1.5 pr-4 text-right">{d.world.exports}</th>
              <th scope="col" className="py-1.5 pr-4 text-right">{d.world.imports}</th><th scope="col" className="py-1.5 text-right">{d.world.balance}</th>
            </tr></thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.country} className="border-b border-rule">
                  <th scope="row" className="py-1.5 pr-4 font-normal text-left" lang="en">{p.country}</th>
                  <td className="py-1.5 pr-4 text-right num">{p.exports === null ? '—' : f(p.exports)}</td>
                  <td className="py-1.5 pr-4 text-right num">{p.imports === null ? '—' : f(p.imports)}</td>
                  <td className="py-1.5 text-right num">{p.exports === null || p.imports === null ? '—' : f(p.exports - p.imports)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-ink-muted">{d.world.unitBn}. {d.world.partnersNote}</p>
        <HindiPendingNote lang={lang} show={lang === 'hi'} />
      </section>

      <section className="mt-12" aria-labelledby="ag-h">
        <h2 id="ag-h" className="text-2xl font-semibold">{d.world.agreementsHeading}</h2>
        <p className="mt-2 max-w-3xl">{d.world.agreementsLede}</p>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">{d.world.agreementsDateNote}</p>
        {(['concluded', 'europe-economic', 'other'] as const).map((g) => {
          const rows = AGREEMENTS.agreements.filter((a) => a.group === g);
          return (
            <details key={g} className="mt-5" open={g === 'concluded'}>
              <summary className="cursor-pointer text-lg font-semibold">{d.world.agreementGroups[g]} <span className="text-sm font-normal text-ink-muted">({d.world.agreementCount(rows.length)})</span></summary>
              <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={d.world.agreementGroups[g]}>
                <table className="w-full text-[0.95rem] border-collapse">
                  <thead>
                    <tr className="border-b border-ink text-left">
                      <th scope="col" className="py-1.5 pr-4">{d.world.agreementCols.title}</th>
                      <th scope="col" className="py-1.5 pl-3 whitespace-nowrap">{d.world.agreementCols.date}</th>
                      <th scope="col" className="py-1.5 pl-3">{d.world.agreementCols.kind}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id} className="border-b border-rule align-top">
                        <th scope="row" className="py-1.5 pr-4 text-left font-normal" lang="en"><a href={a.url} rel="noopener noreferrer">{a.title}</a></th>
                        <td className="py-1.5 pl-3 num whitespace-nowrap">{a.listedOn ? fmtDate(`${a.listedOn}T12:00:00Z`, lang) : '—'}</td>
                        <td className="py-1.5 pl-3 text-sm text-ink-muted whitespace-nowrap">{d.world.agreementKind[a.kind]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </section>

      <p className="mt-8 text-sm text-ink-muted">{d.world.notYet}</p>
      <ReferenceList evidence={[...latest.evidence, ...partners[0].evidence.slice(0, 1), AGREEMENTS.agreements[0].evidence[0]]} lang={lang} />
      <Disclaimer lang={lang} />
    </div>
  );
}
