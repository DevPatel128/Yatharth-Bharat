// Editorial content is held to the same evidence rule as data: every Constitution quote must exist verbatim
// in the stored official text, every answer must cite something, and all text passes G7 and G8.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXPLAINERS } from '../src/content/explainers.ts';
import { RESPONSIBILITIES } from '../src/content/who-fixes.ts';
import { TIMELINE } from '../src/content/timeline.ts';
import { QUESTIONS, Explainer, TimelineEntry } from '../src/lib/schema.ts';
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

describe('constitutional timeline', () => {
  it('entries parse, ids are unique, dates are in order', () => {
    for (const t of TIMELINE) TimelineEntry.parse(t);
    expect(new Set(TIMELINE.map((t) => t.id)).size).toBe(TIMELINE.length);
    expect(TIMELINE.map((t) => t.date)).toEqual([...TIMELINE.map((t) => t.date)].sort());
  });
  for (const t of TIMELINE) {
    it(`${t.id}: every quote is verbatim in the official text; text is neutral and Hindi well-formed`, () => {
      for (const c of t.cite) expect(g4Quote(c.quote!, COI).status, `${t.id} ${c.ref}: "${c.quote}"`).toBe('pass');
      expect(g7Legal([t.title.en, t.title.hi ?? '', t.summary.en, t.summary.hi ?? '']).status).toBe('pass');
      for (const x of [t.title, t.summary]) expect(g8Hindi(x.en, x.hi).status, x.en).toBe('pass');
      if (t.explainer) expect(EXPLAINERS.some((e) => e.id === t.explainer), t.explainer).toBe(true);
    });
  }
  it('each entry date matches a "w.e.f." date or a date written in its quotes', () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (const t of TIMELINE) {
      const [y, m, d] = t.date.split('-').map(Number);
      const q = t.cite.map((c) => c.quote).join(' ');
      const ok = q.includes(`w.e.f. ${d}-${m}-${y}`) || q.includes(`${months[m - 1]}, ${y}`) || q.includes(`${d}th ${months[m - 1]}, ${y}`);
      expect(ok, `${t.id} ${t.date}`).toBe(true);
    }
  });
});
