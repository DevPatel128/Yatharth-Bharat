import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, isLang, pick } from '@/lib/i18n';
import { EXPLAINERS } from '@/content/explainers';
import { Explainer } from '@/lib/schema';
import { Disclaimer } from '@/components/Disclaimer';

export async function generateMetadata({ params }: PageProps<'/[lang]/government'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).gov.title } : {};
}

export default async function Government({ params }: PageProps<'/[lang]/government'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const order = Explainer.shape.level.options;
  return (
    <div className="pt-8 max-w-5xl">
      <h1 className="text-4xl font-semibold">{d.gov.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{d.gov.lede}</p>
      <p className="mt-4"><Link href={`/${lang}/who-fixes-this`} className="font-medium">{d.who.title} →</Link></p>
      {order.map((level) => {
        const items = EXPLAINERS.filter((e) => e.level === level);
        if (!items.length) return null;
        return (
          <section key={level} className="mt-10" aria-labelledby={`l-${level}`}>
            <h2 id={`l-${level}`} className="text-xl font-semibold border-b border-rule pb-2">{d.gov.levels[level]}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {items.map((e) => (
                <li key={e.id} className="border border-rule rounded-[var(--radius-card)] bg-paper-raised p-4">
                  <Link href={`/${lang}/government/${e.id}`} className="font-semibold no-underline hover:underline">{pick(e.title, lang).text}</Link>
                  <p className="mt-1 text-[0.95rem] text-ink-muted">{pick(e.summary, lang).text}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="mt-10 text-sm text-ink-muted">{d.gov.sourceNote}</p>
      <Disclaimer lang={lang} />
    </div>
  );
}
