// Published data integrity: these run against the committed records, so a bad data PR fails CI.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AGREEMENTS, INDICATORS, REGIONS, DISPLAY_DECIMALS, HEADLINE, REGIONAL } from '../src/lib/data.ts';
import { SOURCES } from '../src/lib/sources.ts';
import { g7Legal, g8Hindi } from '../pipeline/gates.ts';
import { parsePortal } from '../pipeline/portal.ts';

describe('regions', () => {
  it('has exactly 28 states and 8 Union Territories', () => {
    expect(REGIONS.filter((r) => r.kind === 'state')).toHaveLength(28);
    expect(REGIONS.filter((r) => r.kind === 'union-territory')).toHaveLength(8);
  });
  it('has unique ids that match the boundary file', () => {
    const topo = JSON.parse(readFileSync(new URL('../public/geo/india-states.topo.json', import.meta.url), 'utf8'));
    const geoIds = topo.objects.states.geometries.map((g: { id: string }) => g.id).sort();
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(36);
    expect(geoIds).toEqual(REGIONS.map((r) => r.id).sort());
  });
  it('every published Hindi name passes the Hindi gate', () => {
    for (const r of REGIONS) if (r.name.hi) expect(g8Hindi(r.name.en, r.name.hi).status, r.id).toBe('pass');
  });
  it('the portal parser refuses a snapshot without 28 + 8 entries', () => {
    expect(() => parsePortal('States\n\nAP\nAndhra Pradesh\n\nCapital :\nAmaravati\n\nUnion Territories (UTs)\n')).toThrow();
  });
});

describe('indicators', () => {
  it('every indicator cites a registered source and has display precision', () => {
    for (const i of INDICATORS) {
      expect(SOURCES.has(i.sourceId), i.id).toBe(true);
      expect(DISPLAY_DECIMALS[i.id], i.id).toBeTypeOf('number');
    }
  });
  it('every observation carries evidence with a quote', () => {
    for (const i of INDICATORS) for (const o of i.observations) expect(o.evidence[0].quote.length, `${i.id} ${o.period}`).toBeGreaterThan(0);
  });
  it('never joins two series in one record without saying so', () => {
    for (const i of INDICATORS) expect(new Set(i.observations.map((o) => o.series)).size, i.id).toBe(1);
  });
  it('headline indicators exist', () => { for (const id of HEADLINE) expect(INDICATORS.some((i) => i.id === id), id).toBe(true); });
  it('all indicator text is neutral and Hindi is well-formed', () => {
    for (const i of INDICATORS) {
      const fields = [i.name, i.definition, i.unit, i.methodology, i.limitations];
      expect(g7Legal(fields.flatMap((f) => [f.en, f.hi ?? ''])).status, i.id).toBe('pass');
      for (const f of fields) expect(g8Hindi(f.en, f.hi).status, `${i.id}: ${f.en}`).toBe('pass');
    }
  });
});

describe('regional series', () => {
  it('only uses known region ids and the national definition exists', () => {
    const ids = new Set(REGIONS.map((r) => r.id));
    for (const r of REGIONAL) {
      expect(INDICATORS.some((i) => i.id === r.indicatorId), r.indicatorId).toBe(true);
      for (const k of Object.keys(r.regions)) expect(ids.has(k), k).toBe(true);
    }
  });
  it('state GER covers all 36 states and UTs', () => {
    expect(Object.keys(REGIONAL.find((r) => r.indicatorId === 'higher-education-ger')!.regions)).toHaveLength(36);
  });
  it('state CPI covers all 36 states and UTs, each value with evidence', () => {
    const cpi = REGIONAL.find((r) => r.indicatorId === 'cpi-inflation')!;
    expect(Object.keys(cpi.regions)).toHaveLength(36);
    for (const [k, v] of Object.entries(cpi.regions)) for (const o of v.observations) expect(o.evidence[0].quote, `${k} ${o.period}`).toContain(o.period.slice(0, 4));
  });
});

describe('Lok Sabha members', async () => {
  const { LOK_SABHA } = await import('../src/lib/data.ts');
  it('accounts for all 543 seats', () => expect(LOK_SABHA.members.length + LOK_SABHA.noSittingMember.length).toBe(543));
  it('stores no contact or personal details in evidence', () => {
    for (const m of LOK_SABHA.members) for (const e of m.evidence) expect(e.quote, m.id).not.toMatch(/Phone|phone|email|Addr|dob|maritalStatus|numberOf/);
  });
  it('every member belongs to a known region', () => {
    const ids = new Set(REGIONS.map((r) => r.id));
    for (const m of LOK_SABHA.members) expect(ids.has(m.regionId), m.id).toBe(true);
  });
  it('member Hindi text passes the Hindi gate', () => {
    for (const m of LOK_SABHA.members) for (const f of [m.name, m.party, m.constituency]) if (f.hi) expect(g8Hindi(f.en, f.hi).status, `${m.id} ${f.en}`).toBe('pass');
  });
});

describe('trade', async () => {
  const { TRADE } = await import('../src/lib/data.ts');
  it('latest totals agree with the independent monthly table within tolerance', () => {
    const t = TRADE.totals.find((x) => x.year === TRADE.crossCheck.year)!;
    expect(Math.abs(t.exports - TRADE.crossCheck.monthlySumExports) / t.exports * 100).toBeLessThanOrEqual(TRADE.crossCheck.tolerancePct);
    expect(Math.abs(t.imports - TRADE.crossCheck.monthlySumImports) / t.imports * 100).toBeLessThanOrEqual(TRADE.crossCheck.tolerancePct);
  });
  it('every partner value is quoted from its record', () => {
    for (const p of TRADE.partners) for (const e of p.evidence) expect(e.quote, p.country).toContain(JSON.stringify(p.country));
  });
});

describe('Union Budget', async () => {
  const { BUDGET } = await import('../src/lib/data.ts');
  const snap = (doc: string) => readFileSync(new URL(`../data/snapshots/budget/${doc}.txt`, import.meta.url), 'utf8');
  const row = (t: string, k: string) => BUDGET.tables.find((x) => x.id === t)!.rows.find((r) => r.key === k)!.values;
  it('every row quote is found verbatim in the stored PDF text and contains its values', () => {
    for (const t of BUDGET.tables) for (const r of t.rows) {
      const q = r.evidence[0].quote;
      expect(snap(t.doc), `${t.id}/${r.key}`).toContain(q);
      for (const v of r.values) if (v !== null) expect(q.replace('(-)', '-'), `${t.id}/${r.key}`).toContain(String(v));
    }
  });
  it('rows have one value per column', () => {
    for (const t of BUDGET.tables) for (const r of t.rows) expect(r.values.length, `${t.id}/${r.key}`).toBe(t.columns.length);
  });
  it('receipts equal expenditure, and the fiscal deficit equals its financing', () => {
    expect(row('summary', 'total-receipts')).toEqual(row('summary', 'total-expenditure'));
    expect(row('deficit-financing', 'total')).toEqual(row('summary', 'fiscal-deficit'));
  });
  it('every recorded check passed within its tolerance', () => {
    expect(BUDGET.checks.length).toBeGreaterThanOrEqual(30);
    for (const c of BUDGET.checks) expect(c.maxDiff, c.name).toBeLessThanOrEqual(10);
  });
  it('Hindi labels pass the Hindi gate', () => {
    for (const t of BUDGET.tables) for (const r of t.rows) if (r.label.hi) expect(g8Hindi(r.label.en, r.label.hi).status, r.key).toBe('pass');
  });
});

describe('Trade agreements (Department of Commerce list)', () => {
  const capture = readFileSync(new URL('../data/manual-inbox/agreements/commerce-trade-agreements.json', import.meta.url));
  const sha = createHash('sha256').update(capture).digest('hex');
  it('every record is pinned to the stored capture and its title decodes from the quoted fragment', () => {
    expect(AGREEMENTS.agreements.length).toBeGreaterThanOrEqual(50);
    const text = capture.toString('utf8');
    for (const a of AGREEMENTS.agreements) {
      const e = a.evidence[0];
      expect(e.snapshotSha256).toBe(sha);
      expect(text.includes(e.quote), a.id).toBe(true);
      expect(JSON.parse(`{${e.quote}}`).title.replace(/\s+/g, ' ').trim()).toBe(a.title);
    }
  });
  it('links stay on the Department of Commerce site', () => {
    for (const a of AGREEMENTS.agreements) expect(new URL(a.url).hostname, a.url).toBe('www.commerce.gov.in');
  });
  it('ids are unique and titles pass the neutral-language lint', () => {
    expect(new Set(AGREEMENTS.agreements.map((a) => a.id)).size).toBe(AGREEMENTS.agreements.length);
    expect(g7Legal(AGREEMENTS.agreements.map((a) => a.title)).status).toBe('pass');
  });
});
