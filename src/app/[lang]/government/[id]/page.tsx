import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, isLang, LANGS, pick } from '@/lib/i18n';
import { EXPLAINERS } from '@/content/explainers';
import { QUESTIONS } from '@/lib/schema';
import { Cite } from '@/components/Cite';
import { SelectButton } from '@/components/SelectButton';
import { explainerItem } from '@/lib/sel-items';
import { Disclaimer } from '@/components/Disclaimer';

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.flatMap((lang) => EXPLAINERS.map((e) => ({ lang, id: e.id })));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/government/[id]'>): Promise<Metadata> {
  const { lang, id } = await params;
  const e = EXPLAINERS.find((x) => x.id === id);
  return e && isLang(lang) ? { title: pick(e.title, lang).text, description: pick(e.summary, lang).text } : {};
}

export default async function ExplainerPage({ params }: PageProps<'/[lang]/government/[id]'>) {
  const { lang, id } = await params;
  const e = EXPLAINERS.find((x) => x.id === id);
  if (!isLang(lang) || !e) notFound();
  const d = dict(lang);
  return (
    <article className="pt-8 max-w-3xl">
      <p><Link href={`/${lang}/government`}>← {d.gov.all}</Link></p>
      <p className="mt-4 text-sm uppercase tracking-wide text-ink-muted">{d.gov.levels[e.level]}</p>
      <h1 className="text-4xl font-semibold mt-1">{pick(e.title, lang).text}</h1>
      <p className="mt-3 text-lg">{pick(e.summary, lang).text}</p>
      {lang === 'hi' && <p className="mt-3 text-sm text-ink-muted">{d.gov.hindiNote}</p>}
      <div className="mt-3"><SelectButton item={explainerItem(e, lang)} labels={{ add: d.sel.add, added: d.sel.added }} /></div>
      <dl className="mt-8 space-y-7">
        {QUESTIONS.map((q) => (
          <div key={q}>
            <dt className="text-lg font-semibold font-serif">{d.gov.questions[q]}</dt>
            <dd className="mt-1">
              <p>{pick(e.answers[q].text, lang).text}</p>
              {e.answers[q].cite.map((c) => <Cite key={`${c.ref}${c.quote ?? ''}`} c={c} lang={lang} label={d.gov.quote} />)}
            </dd>
          </div>
        ))}
      </dl>
      {e.links.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">{d.gov.officialLinks}</h2>
          <ul className="mt-2 list-disc pl-5">{e.links.map((l) => <li key={l.url}><a href={l.url} rel="noopener noreferrer">{pick(l.label, lang).text}</a></li>)}</ul>
        </section>
      )}
      <p className="mt-10 text-sm text-ink-muted">{d.gov.sourceNote}</p>
      <Disclaimer lang={lang} />
    </article>
  );
}
