import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';
import { LangSwitch } from './LangSwitch';
import { MobileMenu } from './MobileMenu';
import { SelectionLink } from './SelectionLink';

export function SiteHeader({ lang }: { lang: Lang }) {
  const d = dict(lang);
  const links: [string, string][] = [
    ['', d.nav.map],
    ['/scorecard', d.nav.scorecard],
    ['/government', d.nav.gov],
    ['/who-fixes-this', d.nav.who],
    ['/money', d.nav.money],
    ['/check', d.nav.check],
    ['/education', d.nav.education],
    ['/world', d.nav.world],
    ['/representatives', d.nav.reps],
    ['/history', d.nav.history],
    ['/ask', d.nav.ask],
    ['/sources', d.nav.sources],
  ];
  const items = (cls: string) => links.map(([href, label]) => <Link key={href} href={`/${lang}${href}`} className={cls}>{label}</Link>);
  return (
    <header className="border-b border-rule">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href={`/${lang}`} className="no-underline flex items-baseline gap-2 mr-auto">
          <span className="font-serif text-xl font-semibold tracking-tight">{d.siteName}</span>
          <span className="hidden md:inline text-sm text-ink-muted">{d.tagline}</span>
        </Link>
        <nav aria-label={d.nav.primary} className="hidden lg:flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.95rem] order-last w-full">
          {items('no-underline hover:underline')}
        </nav>
        <SelectionLink lang={lang} label={d.sel.nav} />
        <LangSwitch lang={lang} label={d.nav.language} aria={d.langSwitchLabel} />
        <MobileMenu label={d.nav.menu}>
          <nav aria-label={d.nav.primary} className="grid gap-1 text-[0.95rem]">{items('no-underline hover:underline py-1')}</nav>
        </MobileMenu>
      </div>
    </header>
  );
}
