// Published data integrity: these run against the committed records, so a bad data PR fails CI.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INDICATORS, REGIONS, DISPLAY_DECIMALS, HEADLINE } from '../src/lib/data.ts';
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
