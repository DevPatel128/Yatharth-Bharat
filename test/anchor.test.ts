import { expect, it } from 'vitest';
import { enclosingRecord, quoteContainsValue } from '../pipeline/anchor.ts';

const json = '{"data":[{"year":"2026","month":"July","value":"5.1"},{"year":"2026","month":"August","value":"5"}]}';

it('cuts the exact JSON record that contains the locator', () => {
  expect(enclosingRecord(json, '"month":"August"')).toBe('{"year":"2026","month":"August","value":"5"}');
});
it('refuses an ambiguous locator', () => expect(enclosingRecord(json, '"year":"2026"')).toBeNull());
it('returns null for a locator that is not present', () => expect(enclosingRecord(json, '"month":"May"')).toBeNull());
it('cuts a CSV line', () => expect(enclosingRecord('a,b\n2026,August,5\n2026,July,5.1\n', '2026,July,')).toBe('2026,July,5.1'));
it('cuts a World Bank XML record', () => {
  const xml = '<wb:data><wb:date>2025</wb:date><wb:value>7.56</wb:value></wb:data><wb:data><wb:date>2024</wb:date><wb:value>7.1</wb:value></wb:data>';
  expect(enclosingRecord(xml, '<wb:date>2024</wb:date>')).toBe('<wb:data><wb:date>2024</wb:date><wb:value>7.1</wb:value></wb:data>');
});
it('checks the value at its own precision', () => {
  expect(quoteContainsValue('"value":7.56666179284244', 7.567)).toBe(true);
  expect(quoteContainsValue('"value":"5.1"', 5.2)).toBe(false);
});
