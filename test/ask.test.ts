import { describe, expect, it } from 'vitest';
import { ANSWER_SYSTEM, answerPrompt, corpus, guardAnswer, retrieve, tokens, type Doc } from '../src/lib/ask.ts';

describe('Ask: retrieval over the verified corpus', () => {
  it('builds the same records in both languages, each linking to a page on this site', () => {
    expect(corpus('en').length).toBe(corpus('hi').length);
    for (const d of corpus('hi')) expect(d.href.startsWith('/hi/')).toBe(true);
  });
  it.each([
    ['What is the inflation rate?', 'en', 'indicator:cpi-inflation'],
    ['Who is the MP of Varanasi?', 'en', 'mp:'],
    ['fiscal deficit 2026-27', 'en', 'budget:summary:fiscal-deficit'],
    ['Kerala inflation', 'en', 'regional:cpi-inflation:kerala'],
    ['who fixes potholes', 'en', 'who:local-roads'],
    ['महंगाई दर क्या है', 'hi', 'indicator:cpi-inflation'],
    ['GST amendment', 'en', 'history:gst'],
    ['What does the CAG do?', 'en', 'explainer:cag'],
  ] as const)('%s → %s', (q, lang, id) => expect(retrieve(q, lang)[0].id.startsWith(id)).toBe(true));
  it('caps one family of records at two', () => {
    const r = retrieve('inflation', 'en', 6);
    expect(r.filter((d) => d.id.startsWith('regional:cpi-inflation')).length).toBeLessThanOrEqual(2);
  });
  it('returns nothing for a question with no meaningful words', () => expect(retrieve('what is the', 'en')).toEqual([]));
  it('drops stop words in both languages', () => expect(tokens('What is the GDP of भारत का')).toEqual(['gdp']));
});

describe('Ask: answer guard', () => {
  const docs: Doc[] = [
    { id: 'a', title: 'Retail inflation', text: 'Retail inflation (per cent). August 2026: 4.82.', href: '/en/scorecard/cpi-inflation', source: 'MoSPI', terms: '' },
    { id: 'b', title: 'Fiscal deficit', text: 'Union Budget 2026-27, Fiscal deficit: 2026-27 BE: ₹16,95,768 crore (4.3% GDP).', href: '/en/money', source: 'MoF', terms: '' },
  ];
  const q = 'What is inflation?';
  it('accepts a cited answer whose numbers are in the cited records', () =>
    expect(guardAnswer('Retail inflation was 4.82 per cent in August 2026 [1].', q, docs).status).toBe('answered'));
  it('treats grouped digits as the same number', () =>
    expect(guardAnswer('The fiscal deficit for 2026-27 (BE) is ₹1695768 crore [2].', q, docs).status).toBe('answered'));
  it('rejects a number that is not in the cited record', () =>
    expect(guardAnswer('Retail inflation was 5.1 per cent in August 2026 [1].', q, docs)).toMatchObject({ status: 'unverified' }));
  it('rejects a number taken from a record that was not cited', () =>
    expect(guardAnswer('Inflation was 4.82 and the deficit 4.3% [1].', q, docs).status).toBe('unverified'));
  it('rejects an answer with no citations', () => expect(guardAnswer('Inflation is moderate.', q, docs).status).toBe('unverified'));
  it('rejects a citation to a record that was not supplied', () => expect(guardAnswer('Inflation was 4.82 [3].', q, docs).status).toBe('unverified'));
  it('rejects evaluative wording', () => expect(guardAnswer('The policy failed; inflation was 4.82 [1].', q, docs).status).toBe('unverified'));
  it('passes NO_ANSWER through as no answer', () => expect(guardAnswer('NO_ANSWER', q, docs).status).toBe('no-answer'));
  it('marks documents as untrusted data in the prompt', () => {
    expect(ANSWER_SYSTEM('en')).toMatch(/untrusted data/);
    expect(answerPrompt('q', docs)).toContain('<document n="2" title="Fiscal deficit">');
  });
});
