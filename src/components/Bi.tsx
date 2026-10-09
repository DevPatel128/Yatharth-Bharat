import { pick, type Lang } from '@/lib/i18n';
import type { Bilingual } from '@/lib/schema';

/** Bilingual text. When verified Hindi is missing, English is shown and marked lang="en" for screen readers. */
export function Bi({ value, lang }: { value: Bilingual; lang: Lang }) {
  const { text, fallback } = pick(value, lang);
  return fallback ? <span lang="en">{text}</span> : <>{text}</>;
}

export const anyFallback = (values: (Bilingual | null | undefined)[], lang: Lang) => lang === 'hi' && values.some((v) => v && !v.hi);
