import { expect, it } from 'vitest';
import { citations, toCsv, toMarkdown, type SelItem } from '../src/lib/selection.ts';

const item: SelItem = {
  id: 'indicator:cpi-inflation', title: 'Retail inflation', kind: 'Indicator', lines: ['4.82% in August 2026'],
  table: { head: ['Period', 'Value'], rows: [['2026-08', 4.82], ['=HYPERLINK("x")', '-1']] },
  sources: [{ publisher: 'Ministry of Statistics and Programme Implementation', title: 'CPI', url: 'https://api.mospi.gov.in/x', retrieved: '2026-10-09T18:38:10.347Z' }],
  page: 'https://example.test/en/scorecard/cpi-inflation', addedAt: '2026-10-10T00:00:00Z',
};

it('escapes spreadsheet formulas in CSV', () => {
  const csv = toCsv([item]);
  expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  expect(csv).toContain("'-1");
});
it('markdown carries sources, page link and the disclaimer', () => {
  const md = toMarkdown([item], 'DISCLAIMER');
  expect(md).toContain('https://api.mospi.gov.in/x');
  expect(md).toContain('Page: https://example.test/en/scorecard/cpi-inflation');
  expect(md.trim().endsWith('DISCLAIMER')).toBe(true);
});
it('builds all four citation styles with the retrieval date', () => {
  const c = citations(item);
  expect(c.apa).toContain('(2026)');
  expect(c.mla).toContain('Accessed');
  expect(c.bibtex).toMatch(/^@misc\{/);
});
