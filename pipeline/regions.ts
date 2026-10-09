// Build data/records/geo/regions.json: the 28 states and 8 Union Territories.
// English names, state/UT status and capitals: National Portal of India (manual capture, see snapshot header).
// Hindi names: Lok Sabha member records (sansad.in), paired with the English record of the same member.
// Every Hindi name must pass G8; names that fail stay null and pages show English with a notice.
// Usage: node pipeline/regions.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { RegionsFile, type Region, type Evidence } from '../src/lib/schema.ts';
import { safeFetch, sha256 } from './lib/safe-fetch.ts';
import { g1Provenance, g4Quote, g8Hindi } from './gates.ts';
import { parsePortal } from './portal.ts';

const ROOT = new URL('../', import.meta.url);
const SNAP = 'data/snapshots/india-portal/states-ut-districts.txt';
const PORTAL_URL = 'https://www.india.gov.in/explore-india/facts-of-india/states-ut-districts';

/** Portal name → name used by the boundary file (DataMeet) and by Lok Sabha records, where they differ. */
const BOUNDARY_NAME: Record<string, string> = { 'Andaman and Nicobar Islands': 'Andaman & Nicobar', 'Jammu and Kashmir': 'Jammu & Kashmir' };
const SANSAD_NAME: Record<string, string> = { Delhi: 'NCT of Delhi' };

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clean = (s: string) => s.replace(/[‌‍]/g, '').trim();

type Member = { mpsno: number; stateName: string };
async function sansad(locale: 'en' | 'hi') {
  const r = await safeFetch(`https://sansad.in/api_ls/member?loksabha=18&page=1&size=600&locale=${locale}`, { allowedHosts: ['sansad.in'] });
  const g1 = g1Provenance(r, ['sansad.in'], 'json');
  if (g1.status !== 'pass') throw new Error(`sansad ${locale}: ${g1.detail}`);
  const body = JSON.parse(r.body.toString('utf8')) as { membersDtoList?: Member[] };
  if (!Array.isArray(body.membersDtoList) || body.membersDtoList.length < 500) throw new Error(`sansad ${locale}: unexpected member list`);
  return { r, members: body.membersDtoList };
}

const snapText = readFileSync(new URL(SNAP, ROOT), 'utf8');
const snapSha = sha256(snapText);
const entries = parsePortal(snapText);
const [en, hi] = await Promise.all([sansad('en'), sansad('hi')]);
const hiByMp = new Map(hi.members.map((m) => [m.mpsno, clean(m.stateName)]));
const hiNames = new Map<string, Set<string>>();
for (const m of en.members) {
  const h = hiByMp.get(m.mpsno);
  if (h) hiNames.set(m.stateName.trim(), (hiNames.get(m.stateName.trim()) ?? new Set()).add(h));
}
const hiText = hi.r.body.toString('utf8');

const report: string[] = [];
const regions: Region[] = entries.map((e) => {
  const g4 = g4Quote(e.block, snapText);
  if (g4.status !== 'pass') throw new Error(`${e.name}: ${g4.detail}`);
  const portalEv: Evidence = { sourceId: 'india-portal', url: PORTAL_URL, retrievedAt: '2026-10-09T18:25:00Z', snapshotSha256: snapSha, quote: e.block, method: 'browser-capture' };
  const variants = hiNames.get(SANSAD_NAME[e.name] ?? e.name);
  let hiName: string | null = null;
  const evidence = [portalEv];
  if (!variants) report.push(`${e.name}: no Lok Sabha record found; Hindi pending`);
  else if (variants.size > 1) report.push(`${e.name}: conflicting Hindi spellings ${[...variants].join(' / ')}; Hindi pending`);
  else {
    const candidate = [...variants][0];
    const g8 = g8Hindi(e.name, candidate);
    // Each "and" joining parts of an official name must have its "और" ("दादर और नागर हवेली" for the merged UT is incomplete).
    const joins = (s: string, w: string) => s.split(/\s+/).filter((x) => x === w).length;
    const incomplete = joins(e.name, 'and') !== joins(candidate, 'और') ? `Hindi "${candidate}" does not cover every part of "${e.name}"` : null;
    const truncatedDelhi = /दिल्ल$/.test(candidate) ? `Hindi "${candidate}" ends mid-word` : null;
    const problem = g8.status !== 'pass' ? g8.detail : incomplete ?? truncatedDelhi;
    if (problem) report.push(`${e.name}: rejected official Hindi: ${problem}; Hindi pending`);
    else {
      // Quote the raw JSON text exactly as served (it may contain zero-width joiners we removed for display).
      const esc = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const raw = hiText.match(new RegExp(`"stateName":"${candidate.split('').map((c) => `${esc(c)}[\u200c\u200d]?`).join('')}"`))?.[0];
      if (!raw || g4Quote(raw, hiText).status !== 'pass') report.push(`${e.name}: Hindi name not locatable in the Lok Sabha response; Hindi pending`);
      else {
        hiName = candidate;
        evidence.push({ sourceId: 'sansad-lok-sabha', url: 'https://sansad.in/api_ls/member?loksabha=18&locale=hi', retrievedAt: hi.r.retrievedAt, snapshotSha256: hi.r.sha256, quote: raw, method: 'pipeline' });
      }
    }
  }
  return {
    id: slug(e.name),
    kind: e.kind,
    name: { en: e.name, hi: hiName },
    capital: { en: e.capital, hi: null },
    boundaryName: BOUNDARY_NAME[e.name] ?? e.name,
    evidence,
  };
});

const file = RegionsFile.parse({ schemaVersion: 1, regions });
mkdirSync(new URL('data/records/geo/', ROOT), { recursive: true });
writeFileSync(new URL('data/records/geo/regions.json', ROOT), JSON.stringify(file, null, 2) + '\n');
console.log(`regions: ${regions.length} (${regions.filter((r) => r.kind === 'state').length} states, ${regions.filter((r) => r.kind === 'union-territory').length} UTs); Hindi verified for ${regions.filter((r) => r.name.hi).length}`);
for (const l of report) console.log(`  ${l}`);
