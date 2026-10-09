// Lok Sabha members (18th Lok Sabha) from the official Digital Sansad records, English and Hindi.
// Only office facts are kept: name, party, constituency, state. Hindi text is the Lok Sabha's own Hindi record
// and must pass the deterministic Hindi gate; otherwise English is shown. A run that changes more than 10% of
// members at once is held as suspicious (by-elections change one or two at a time).
// Usage: node pipeline/people.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { LegislatureFile, RegionsFile, type Member } from '../src/lib/schema.ts';
import { safeFetch } from './lib/safe-fetch.ts';
import { g1Provenance, g4Quote, g8Hindi } from './gates.ts';
import { normName } from './regional.ts';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('data/records/people/lok-sabha-18.json', ROOT);
const API = 'https://sansad.in/api_ls/member?loksabha=18&page=1&size=600';
const MAX_CHURN = 0.1;

type Raw = { mpsno: number; mpFirstLastName: string; partyFname: string; stateName: string; constName: string; status: string };
const clean = (s: string) => s.replace(/[‌‍]/g, '').replace(/\s+/g, ' ').trim();
const SANSAD_TO_PORTAL: Record<string, string> = { 'nct of delhi': 'delhi' };

async function fetchLocale(locale: 'en' | 'hi') {
  const r = await safeFetch(`${API}&locale=${locale}`, { allowedHosts: ['sansad.in'] });
  const g1 = g1Provenance(r, ['sansad.in'], 'json');
  if (g1.status !== 'pass') throw new Error(`sansad ${locale}: ${g1.detail}`);
  const list = (JSON.parse(r.body.toString('utf8')) as { membersDtoList?: Raw[] }).membersDtoList;
  if (!Array.isArray(list) || list.length < 500) throw new Error(`sansad ${locale}: expected at least 500 member records, got ${list?.length}`);
  return { r, text: r.body.toString('utf8'), list };
}

/** Verbatim slice of the raw record from "mpsno" through "constName": office facts only, no contact details. */
function officeQuote(text: string, mpsno: number): string | null {
  const start = text.indexOf(`"mpsno":${mpsno},`);
  if (start < 0) return null;
  const c = text.indexOf('"constName":"', start);
  const end = c < 0 ? -1 : text.indexOf('"', c + '"constName":"'.length);
  return end < 0 ? null : text.slice(start, end + 1);
}

const regions = RegionsFile.parse(JSON.parse(readFileSync(new URL('data/records/geo/regions.json', ROOT), 'utf8'))).regions;
const regionByName = new Map(regions.map((r) => [normName(r.name.en), r.id]));
const [en, hi] = await Promise.all([fetchLocale('en'), fetchLocale('hi')]);
const hiById = new Map(hi.list.map((m) => [m.mpsno, m]));
const issues: string[] = [];
const hiOk = (enText: string, hiText: string | undefined) => {
  if (!hiText) return null;
  const v = clean(hiText);
  return g8Hindi(enText, v).status === 'pass' ? v : null;
};

const members: Member[] = [];
for (const m of en.list.filter((x) => x.status === 'Sitting')) {
  const state = clean(m.stateName);
  const regionId = regionByName.get(SANSAD_TO_PORTAL[normName(state)] ?? normName(state));
  if (!regionId) { issues.push(`unmatched state "${state}" for member ${m.mpsno}`); continue; }
  const qEn = officeQuote(en.text, m.mpsno);
  if (!qEn || g4Quote(qEn, en.text).status !== 'pass' || !qEn.includes(m.constName)) { issues.push(`member ${m.mpsno}: record not locatable`); continue; }
  const h = hiById.get(m.mpsno);
  const qHi = h ? officeQuote(hi.text, m.mpsno) : null;
  const evidence = [{ sourceId: 'sansad-lok-sabha', url: `${API}&locale=en`, retrievedAt: en.r.retrievedAt, snapshotSha256: en.r.sha256, quote: qEn, method: 'pipeline' as const }];
  if (qHi) evidence.push({ sourceId: 'sansad-lok-sabha', url: `${API}&locale=hi`, retrievedAt: hi.r.retrievedAt, snapshotSha256: hi.r.sha256, quote: qHi, method: 'pipeline' as const });
  members.push({
    id: String(m.mpsno),
    name: { en: clean(m.mpFirstLastName), hi: hiOk(m.mpFirstLastName, h?.mpFirstLastName) },
    party: { en: clean(m.partyFname), hi: hiOk(m.partyFname, h?.partyFname) },
    constituency: { en: clean(m.constName), hi: hiOk(m.constName, h?.constName) },
    regionId,
    evidence,
  });
}

// Constituencies whose only records are non-sitting (died/resigned) and not yet refilled.
const sittingSeats = new Set(members.map((m) => `${m.regionId}|${m.constituency.en}`));
const noSitting = new Map<string, { regionId: string; constituency: { en: string; hi: string | null } }>();
for (const m of en.list.filter((x) => x.status !== 'Sitting')) {
  const state = clean(m.stateName);
  const regionId = regionByName.get(SANSAD_TO_PORTAL[normName(state)] ?? normName(state));
  const key = `${regionId}|${clean(m.constName)}`;
  if (regionId && !sittingSeats.has(key)) noSitting.set(key, { regionId, constituency: { en: clean(m.constName), hi: hiOk(m.constName, hiById.get(m.mpsno)?.constName) } });
}

if (issues.length) { console.error(`people: held, ${issues.length} problem(s):\n  ${issues.slice(0, 10).join('\n  ')}`); process.exit(2); }
if (members.length + noSitting.size !== 543) { console.error(`people: held, ${members.length} sitting + ${noSitting.size} without a sitting member ≠ 543 seats`); process.exit(2); }

if (existsSync(OUT)) {
  const prev = LegislatureFile.parse(JSON.parse(readFileSync(OUT, 'utf8')));
  const prevIds = new Set(prev.members.map((m) => m.id)), nextIds = new Set(members.map((m) => m.id));
  const churn = [...nextIds].filter((i) => !prevIds.has(i)).length + [...prevIds].filter((i) => !nextIds.has(i)).length;
  if (churn / 543 > MAX_CHURN) { console.error(`people: held, ${churn} member changes in one run exceeds ${MAX_CHURN * 100}%`); process.exit(2); }
}

const file = LegislatureFile.parse({ schemaVersion: 1, house: 'lok-sabha', term: 18, lastVerifiedAt: en.r.retrievedAt, sourceUrl: 'https://sansad.in/ls/members', members, noSittingMember: [...noSitting.values()] });
mkdirSync(new URL('data/records/people/', ROOT), { recursive: true });
writeFileSync(OUT, JSON.stringify(file, null, 2) + '\n');
const hiCount = (k: 'name' | 'party' | 'constituency') => members.filter((m) => m[k].hi).length;
console.log(`people: ${members.length} sitting members, ${noSitting.size} seats without a sitting member; verified Hindi: names ${hiCount('name')}, parties ${hiCount('party')}, constituencies ${hiCount('constituency')}`);
