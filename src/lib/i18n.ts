import { en, type Dict } from './dict/en.ts';
import { hi } from './dict/hi.ts';
import { LANGS, type Bilingual, type Lang } from './schema.ts';

export { LANGS, type Lang };
export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);
export const dict = (lang: Lang): Dict => (lang === 'hi' ? hi : en);
export { locale, fmtNumber, fmtPeriod, fmtDate } from './format.ts';

/** Pick the text for a language. `fallback` is true when Hindi is not verified and English is shown instead. */
export function pick(b: Bilingual, lang: Lang): { text: string; fallback: boolean } {
  if (lang === 'hi' && b.hi) return { text: b.hi, fallback: false };
  return { text: b.en, fallback: lang === 'hi' };
}
