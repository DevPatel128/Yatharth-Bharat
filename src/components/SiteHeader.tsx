import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';
import { LangSwitch } from './LangSwitch';
import { SelectionLink } from './SelectionLink';

export function SiteHeader({ lang }: { lang: Lang }) {
  const d = dict(lang);
  return (
    <header className="border-b border-rule">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href={`/${lang}`} className="no-underline flex items-baseline gap-2 mr-auto">
          <span className="font-serif text-xl font-semibold tracking-tight">{d.siteName}</span>
          <span className="hidden md:inline text-sm text-ink-muted">{d.tagline}</span>
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.95rem]">
          <Link href={`/${lang}`} className="no-underline hover:underline">{d.nav.map}</Link>
          <Link href={`/${lang}/scorecard`} className="no-underline hover:underline">{d.nav.scorecard}</Link>
          <Link href={`/${lang}/government`} className="no-underline hover:underline">{d.nav.gov}</Link>
          <Link href={`/${lang}/who-fixes-this`} className="no-underline hover:underline">{d.nav.who}</Link>
          <Link href={`/${lang}/money`} className="no-underline hover:underline">{d.nav.money}</Link>
          <Link href={`/${lang}/world`} className="no-underline hover:underline">{d.nav.world}</Link>
          <Link href={`/${lang}/representatives`} className="no-underline hover:underline">{d.nav.reps}</Link>
          <Link href={`/${lang}/history`} className="no-underline hover:underline">{d.nav.history}</Link>
          <Link href={`/${lang}/sources`} className="no-underline hover:underline">{d.nav.sources}</Link>
          <SelectionLink lang={lang} label={d.sel.nav} />
          <LangSwitch lang={lang} label={d.nav.language} aria={d.langSwitchLabel} />
        </nav>
      </div>
    </header>
  );
}
