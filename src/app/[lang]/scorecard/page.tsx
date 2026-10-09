import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang } from '@/lib/i18n';
import { INDICATORS } from '@/lib/data';
import { Indicator } from '@/lib/schema';
import { IndicatorCard } from '@/components/IndicatorCard';
import { Disclaimer } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export async function generateMetadata({ params }: PageProps<'/[lang]/scorecard'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).scorecard.title } : {};
}

export default async function Scorecard({ params }: PageProps<'/[lang]/scorecard'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const categories = Indicator.shape.category.options;
  return (
    <div className="pt-8">
      <h1 className="text-4xl font-semibold">{d.scorecard.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{d.scorecard.lede}</p>
      {categories.map((c) => {
        const items = INDICATORS.filter((i) => i.category === c);
        return (
          <section key={c} aria-labelledby={`c-${c}`} className="mt-10">
            <h2 id={`c-${c}`} className="text-xl font-semibold border-b border-rule pb-2">{d.scorecard.categories[c]}</h2>
            {items.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <IndicatorCard key={i.id} ind={i} lang={lang} />)}</div>
            ) : (
              <p className="mt-3 text-ink-muted">{d.scorecard.noData}</p>
            )}
          </section>
        );
      })}
      <ReferenceList evidence={INDICATORS.flatMap((i) => i.observations.at(-1)?.evidence ?? [])} lang={lang} />
      <Disclaimer lang={lang} />
    </div>
  );
}
