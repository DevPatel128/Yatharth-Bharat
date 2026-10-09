import { en, type Dict } from './dict/en.ts';
import { hi } from './dict/hi.ts';
import { LANGS, type Bilingual, type Lang } from './schema.ts';

export { LANGS, type Lang };
export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);
export const dict = (lang: Lang): Dict => (lang === 'hi' ? hi : en);
export const locale = (lang: Lang) => (lang === 'hi' ? 'hi-IN' : 'en-IN');

/** Pick the text for a language. `fallback` is true when Hindi is not verified and English is shown instead. */
export function pick(b: Bilingual, lang: Lang): { text: string; fallback: boolean } {
  if (lang === 'hi' && b.hi) return { text: b.hi, fallback: false };
  return { text: b.en, fallback: lang === 'hi' };
}

/** Numbers keep Western digits in both languages, so figures match the English exactly (G8). */
export function fmtNumber(v: number, lang: Lang, decimals: number) {
  return new Intl.NumberFormat(locale(lang), { minimumFractionDigits: decimals, maximumFractionDigits: decimals, numberingSystem: 'latn' }).format(v);
}

/** "2026-08" → "August 2026"; "2025" → "2025". */
export function fmtPeriod(period: string, lang: Lang) {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  return new Intl.DateTimeFormat(locale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC', numberingSystem: 'latn' }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
}

export function fmtDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata', numberingSystem: 'latn' }).format(new Date(iso));
}
