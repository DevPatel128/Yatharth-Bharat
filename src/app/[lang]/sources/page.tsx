import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, fmtDate, isLang, pick } from '@/lib/i18n';
import { SOURCES } from '@/lib/sources';
import { INDICATORS } from '@/lib/data';
import { Disclaimer } from '@/components/Disclaimer';
import run from '../../../../data/runs/latest.json';

export async function generateMetadata({ params }: PageProps<'/[lang]/sources'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).sources.title } : {};
}

export default async function SourcesPage({ params }: PageProps<'/[lang]/sources'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const outcomes = run.outcomes as { id: string; result: string }[];
  return (
    <div className="pt-8 max-w-4xl">
      <h1 className="text-4xl font-semibold">{d.sources.title}</h1>
      <p className="mt-3 text-ink-muted">{d.sources.lede}</p>

      <section className="mt-10" aria-labelledby="gates-h">
        <h2 id="gates-h" className="text-2xl font-semibold">{d.sources.gatesHeading}</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {d.sources.gates.map(([t, body]) => (
            <div key={t} className="border-t border-rule pt-3"><dt className="font-semibold">{t}</dt><dd className="mt-1 text-[0.95rem]">{body}</dd></div>
          ))}
        </dl>
      </section>

      <section className="mt-12" aria-labelledby="run-h">
        <h2 id="run-h" className="text-2xl font-semibold">{d.sources.lastRun}</h2>
        <p className="mt-1 text-sm text-ink-muted">{fmtDate(run.ranAt, lang)}</p>
        <table className="mt-3 w-full text-sm border-collapse">
          <thead><tr className="border-b border-ink text-left"><th scope="col" className="py-1.5">{d.nav.scorecard}</th><th scope="col" className="py-1.5">{d.sources.runResult}</th></tr></thead>
          <tbody>
            {outcomes.map((o) => {
              const ind = INDICATORS.find((i) => i.id === o.id);
              return <tr key={o.id} className="border-b border-rule"><td className="py-1.5">{ind ? pick(ind.name, lang).text : o.id}</td><td className="py-1.5 num">{o.result}</td></tr>;
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-12" aria-labelledby="src-h">
        <h2 id="src-h" className="text-2xl font-semibold">{d.references.heading}</h2>
        <div className="mt-4 space-y-6">
          {[...SOURCES.values()].map((s) => (
            <article key={s.id} className="border-t border-rule pt-4">
              <h3 className="text-lg font-semibold font-sans">{pick(s.name, lang).text}</h3>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.95rem]">
                <dt className="text-ink-muted">{d.sources.publisher}</dt><dd>{s.publisher}</dd>
                <dt className="text-ink-muted">{d.sources.category}</dt><dd>{d.sources.categories[s.category]}</dd>
                <dt className="text-ink-muted">{d.sources.licence}</dt><dd>{s.licence}</dd>
                <dt className="text-ink-muted">{d.sources.frequency}</dt><dd>{s.updateFrequency}</dd>
                <dt className="text-ink-muted">{d.sources.limitations}</dt><dd lang="en">{s.limitations}</dd>
              </dl>
              <p className="mt-2"><a href={s.homepage} rel="noopener noreferrer" className="break-all">{s.homepage}</a></p>
            </article>
          ))}
        </div>
      </section>
      <Disclaimer lang={lang} />
    </div>
  );
}
