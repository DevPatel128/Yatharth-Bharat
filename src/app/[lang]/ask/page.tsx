import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang } from '@/lib/i18n';
import { AskBox } from '@/components/AskBox';
import { Disclaimer } from '@/components/Disclaimer';

export async function generateMetadata({ params }: PageProps<'/[lang]/ask'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).ask.title, description: dict(lang).ask.lede } : {};
}

export default async function Ask({ params }: PageProps<'/[lang]/ask'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const a = dict(lang).ask;
  return (
    <div className="pt-8 max-w-4xl">
      <h1 className="text-4xl font-semibold">{a.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{a.lede}</p>
      <AskBox
        lang={lang}
        labels={{ label: a.label, placeholder: a.placeholder, submit: a.submit, asking: a.asking, aiLabel: a.aiLabel, answerHeading: a.answerHeading, citedHeading: a.citedHeading, resultsHeading: a.resultsHeading, status: a.status, privacy: a.privacy }}
      />
      <section className="mt-10 max-w-3xl border-t border-rule pt-6" aria-labelledby="rules-h">
        <h2 id="rules-h" className="text-xl font-semibold">{a.rulesHeading}</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">{a.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
      <Disclaimer lang={lang} />
    </div>
  );
}
