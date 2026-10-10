import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, fmtDate, isLang, pick } from '@/lib/i18n';
import { TIMELINE } from '@/content/timeline';
import { EXPLAINERS } from '@/content/explainers';
import { getSource } from '@/lib/sources';
import { timelineItem } from '@/lib/sel-items';
import { SelectButton } from '@/components/SelectButton';
import { Disclaimer } from '@/components/Disclaimer';

export async function generateMetadata({ params }: PageProps<'/[lang]/history'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).history.title } : {};
}

export default async function History({ params }: PageProps<'/[lang]/history'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const coi = getSource('constitution');
  return (
    <div className="pt-8 max-w-4xl">
      <h1 className="text-4xl font-semibold">{d.history.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{d.history.lede}</p>
      {lang === 'hi' && <p className="mt-2 text-sm text-ink-muted">{d.gov.hindiNote}</p>}

      <ol className="mt-10 border-l border-rule">
        {TIMELINE.map((t) => {
          const ex = t.explainer ? EXPLAINERS.find((e) => e.id === t.explainer) : undefined;
          return (
            <li key={t.id} id={t.id} className="relative pl-6 pb-10 last:pb-0">
              <span className="absolute -left-[5px] top-2 h-[9px] w-[9px] rounded-full bg-sindoor" aria-hidden="true" />
              <time dateTime={t.date} className="block text-sm text-ink-muted num">{fmtDate(t.date, lang)}</time>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-xl font-semibold mt-1">{pick(t.title, lang).text}</h2>
                <SelectButton item={timelineItem(t, lang)} labels={{ add: d.sel.add, added: d.sel.added }} />
              </div>
              <p className="mt-2 max-w-3xl">{pick(t.summary, lang).text}</p>
              <div className="mt-3 space-y-2">
                {t.cite.map((c) => (
                  <figure key={c.quote} className="border-l-2 border-rule pl-3 text-sm">
                    <blockquote lang="en" className="italic">“{c.quote}”</blockquote>
                    <figcaption className="text-ink-muted mt-0.5">{d.history.fromText}, {c.ref}</figcaption>
                  </figure>
                ))}
              </div>
              {ex && <p className="mt-2 text-sm"><Link href={`/${lang}/government/${ex.id}`}>{d.history.learnMore}: {pick(ex.title, lang).text}</Link></p>}
            </li>
          );
        })}
      </ol>

      <p className="mt-10 text-sm text-ink-muted max-w-3xl">{d.history.scope}</p>
      <section aria-labelledby="refs" className="mt-10">
        <h2 id="refs" className="text-xl font-semibold mb-3">{d.references.heading}</h2>
        <p className="font-medium">{coi.publisher}</p>
        <p><a href={coi.homepage} rel="noopener noreferrer">{pick(coi.name, lang).text}</a></p>
        <p className="text-sm text-ink-muted">{d.gov.sourceNote}</p>
      </section>
      <Disclaimer lang={lang} />
    </div>
  );
}
