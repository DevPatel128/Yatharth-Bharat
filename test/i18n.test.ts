import { expect, it } from 'vitest';
import { en } from '../src/lib/dict/en.ts';
import { hi } from '../src/lib/dict/hi.ts';
import { g7Legal } from '../pipeline/gates.ts';
import { fmtNumber, fmtPeriod, pick } from '../src/lib/i18n.ts';

const strings = (o: unknown): string[] => typeof o === 'string' ? [o] : typeof o === 'function' ? [] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : [];
const keys = (o: unknown, p = ''): string[] => o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => [`${p}${k}`, ...keys(v, `${p}${k}.`)]) : [];

it('Hindi dictionary has exactly the English keys', () => expect(keys(hi).sort()).toEqual(keys(en).sort()));
it('Hindi strings contain Devanagari (no untranslated copy)', () => {
  const untranslated = strings(hi).filter((s) => !/[ऀ-ॿ]/.test(s) && !/^[A-Z0-9 ·.,:()+-]+$/.test(s) && s !== 'English' && s !== 'Read in English');
  expect(untranslated).toEqual([]);
});
it('UI copy in both languages is neutral and free of hype words', () => expect(g7Legal([...strings(en), ...strings(hi)]).status).toBe('pass'));
it('the formal disclaimer is present in both languages', () => {
  expect(en.disclaimer).toMatch(/consult the cited originals/);
  expect(hi.disclaimer).toMatch(/उद्धृत मूल स्रोतों/);
});
it('numbers keep Western digits in Hindi', () => expect(fmtNumber(4.82, 'hi', 2)).toBe('4.82'));
it('months are localised', () => { expect(fmtPeriod('2026-08', 'en')).toBe('August 2026'); expect(fmtPeriod('2026-08', 'hi')).toBe('अगस्त 2026'); });
it('falls back to English and says so when Hindi is unverified', () => expect(pick({ en: 'Ladakh', hi: null }, 'hi')).toEqual({ text: 'Ladakh', fallback: true }));
