// Number and date formatting with no other imports, so client components can use it without pulling in
// the dictionaries or schemas.
type Lang = 'en' | 'hi';

export const locale = (lang: Lang) => (lang === 'hi' ? 'hi-IN' : 'en-IN');

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
