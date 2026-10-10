import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dict, isLang, pick } from '@/lib/i18n';
import { RESPONSIBILITIES } from '@/content/who-fixes';
import { Cite } from '@/components/Cite';
import { SelectButton } from '@/components/SelectButton';
import { responsibilityItem } from '@/lib/sel-items';
import { Disclaimer } from '@/components/Disclaimer';

export async function generateMetadata({ params }: PageProps<'/[lang]/who-fixes-this'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).who.title } : {};
}

export default async function WhoFixes({ params }: PageProps<'/[lang]/who-fixes-this'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  return (
    <div className="pt-8 max-w-4xl">
      <h1 className="text-4xl font-semibold">{d.who.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{d.who.lede}</p>
      <nav aria-label={d.who.title} className="mt-6 flex flex-wrap gap-2">
        {RESPONSIBILITIES.map((r) => <a key={r.id} href={`#${r.id}`} className="no-underline border border-rule rounded-[var(--radius-control)] px-2.5 py-1 text-sm hover:border-ink">{pick(r.issue, lang).text}</a>)}
      </nav>
      <div className="mt-8 space-y-6">
        {RESPONSIBILITIES.map((r) => (
          <section key={r.id} id={r.id} aria-labelledby={`h-${r.id}`} className="border-t border-rule pt-5 scroll-mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`h-${r.id}`} className="text-2xl font-semibold">{pick(r.issue, lang).text}</h2>
              <SelectButton item={responsibilityItem(r, lang)} labels={{ add: d.sel.add, added: d.sel.added }} />
            </div>
            <ul className="mt-3 space-y-4">
              {r.levels.map((l) => (
                <li key={l.where + l.cite.ref}>
                  <p><span className="text-sm uppercase tracking-wide text-ink-muted">{d.who.levels[l.where]}</span><br /><span className="font-medium">{pick(l.who, lang).text}</span></p>
                  <Cite c={l.cite} lang={lang} label={d.who.basis} />
                </li>
              ))}
            </ul>
            <p className="mt-3"><span className="font-medium">{d.who.raise}: </span>{pick(r.where, lang).text}</p>
            {r.explainer && <p className="mt-1 text-sm"><Link href={`/${lang}/government/${r.explainer}`}>{d.who.learnMore}</Link></p>}
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-ink-muted">{d.gov.sourceNote}</p>
      <Disclaimer lang={lang} />
    </div>
  );
}
