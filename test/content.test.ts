// Editorial content is held to the same evidence rule as data: every Constitution quote must exist verbatim
// in the stored official text, every answer must cite something, and all text passes G7 and G8.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXPLAINERS } from '../src/content/explainers.ts';
import { RESPONSIBILITIES } from '../src/content/who-fixes.ts';
import { QUESTIONS, Explainer } from '../src/lib/schema.ts';
import { SOURCES } from '../src/lib/sources.ts';
import { g4Quote, g7Legal, g8Hindi } from '../pipeline/gates.ts';

const COI = readFileSync(new URL('../data/snapshots/constitution/coi-en.txt', import.meta.url), 'utf8');
const OFFICIAL_HOST = /(\.gov\.in|\.nic\.in|^sansad\.in)$/;

describe('government explainers', () => {
  it('ids are unique and records parse', () => {
    expect(new Set(EXPLAINERS.map((e) => e.id)).size).toBe(EXPLAINERS.length);
    for (const e of EXPLAINERS) Explainer.parse(e);
  });
  for (const e of EXPLAINERS) {
    it(`${e.id}: answers all eight questions with citations`, () => {
      for (const q of QUESTIONS) expect(e.answers[q]?.cite.length, `${e.id}.${q}`).toBeGreaterThan(0);
    });
    it(`${e.id}: every Constitution quote is verbatim in the official text`, () => {
      for (const q of QUESTIONS) for (const c of e.answers[q].cite) {
        expect(SOURCES.has(c.sourceId), `${e.id}.${q} source ${c.sourceId}`).toBe(true);
        if (c.sourceId === 'constitution') {
          expect(c.quote, `${e.id}.${q} ${c.ref} needs a quote`).toBeTruthy();
          expect(g4Quote(c.quote!, COI).status, `${e.id}.${q} ${c.ref}: "${c.quote}"`).toBe('pass');
        }
      }
    });
    it(`${e.id}: text is neutral, Hindi well-formed, links official`, () => {
      const texts = [e.title, e.summary, ...QUESTIONS.map((q) => e.answers[q].text)];
      expect(g7Legal(texts.flatMap((t) => [t.en, t.hi ?? ''])).status).toBe('pass');
      for (const t of texts) expect(g8Hindi(t.en, t.hi).status, t.en).toBe('pass');
      for (const l of e.links) expect(new URL(l.url).hostname, l.url).toMatch(OFFICIAL_HOST);
    });
  }
});

describe('who fixes this', () => {
  it('every responsibility cites a verbatim Constitution entry and links a real explainer', () => {
    const ids = new Set(EXPLAINERS.map((e) => e.id));
    for (const r of RESPONSIBILITIES) {
      if (r.explainer) expect(ids.has(r.explainer), r.id).toBe(true);
      for (const l of r.levels) expect(g4Quote(l.cite.quote!, COI).status, `${r.id}: ${l.cite.ref}`).toBe('pass');
      const texts = [r.issue, r.where, ...r.levels.map((l) => l.who)];
      expect(g7Legal(texts.flatMap((t) => [t.en, t.hi ?? ''])).status, r.id).toBe('pass');
      for (const t of texts) expect(g8Hindi(t.en, t.hi).status, t.en).toBe('pass');
    }
  });
});
