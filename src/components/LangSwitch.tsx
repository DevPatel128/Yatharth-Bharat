'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Lang } from '@/lib/i18n';

/** Switches language while staying on the same page. */
export function LangSwitch({ lang, label, aria }: { lang: Lang; label: string; aria: string }) {
  const path = usePathname() ?? `/${lang}`;
  const other: Lang = lang === 'en' ? 'hi' : 'en';
  const href = path.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);
  return (
    <Link href={href} hrefLang={other} lang={other} aria-label={aria} className="no-underline border border-rule rounded-[var(--radius-control)] px-2 py-0.5 hover:border-ink">
      {label}
    </Link>
  );
}
