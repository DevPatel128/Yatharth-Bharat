import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';

export function SiteFooter({ lang }: { lang: Lang }) {
  const d = dict(lang);
  return (
    <footer className="mt-16 border-t border-rule text-sm text-ink-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <p>{d.footer.independent}</p>
          <p>{d.footer.mapNote}</p>
        </div>
        <nav aria-label="Legal" className="flex flex-col gap-1 md:items-end">
          <Link href={`/${lang}/privacy`}>{d.footer.privacy}</Link>
          <Link href={`/${lang}/terms`}>{d.footer.terms}</Link>
          <Link href={`/${lang}/corrections`}>{d.footer.corrections}</Link>
          <Link href={`/${lang}/sources`}>{d.footer.attribution}</Link>
        </nav>
      </div>
    </footer>
  );
}
