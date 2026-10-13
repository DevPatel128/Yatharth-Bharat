// Members elected to each state/UT legislative assembly at its latest general election, from the Election
// Commission of India's statistical reports ("2 - List of Successful Candidates"). Every winner is checked against
// a second ECI file of the same election ("10 - Detailed Results"): the winner must be the candidate with the most
// votes in that constituency, with the same party (G3). Office facts only: constituency, name, party, votes and
// margin; age, sex and caste category in the source are not kept (G7).
// Constituencies are placed in districts using DataMeet assembly-constituency boundaries (2008 delimitation) where
// at least 90% of names match ECI's for that state; otherwise members are listed without districts.
// Later by-elections, resignations and deaths are not reflected; the page says so.
// Usage: node pipeline/mlas.ts   (needs mapshaper; run pipeline/districts.ts first)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoContains, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { AssembliesFile, DistrictsFile } from '../src/lib/schema.ts';
import { safeFetch, type FetchResult } from './lib/safe-fetch.ts';
import { readXlsx } from './lib/xlsx.ts';
import { g7Legal } from './gates.ts';

const ROOT = new URL('../', import.meta.url);
const RAW = fileURLToPath(new URL('data/raw/eci/', ROOT));
const OUT = new URL('data/records/people/assemblies.json', ROOT);
const API = 'https://www.eci.gov.in/eci-backend/public/api/election-result?category_id=';
const HOSTS = ['www.eci.gov.in', 'old.eci.gov.in'];
const AC_COMMIT = '7a1c21c2e3f059a19aba1023f64ed7e174462ca4'; // datameet/maps, last change to assembly-constituencies/ (2018-01-28)
const AC_SHA: Record<string, string> = {}; // filled on first run and pinned below
mkdirSync(RAW, { recursive: true });

/** Latest general election per legislature: a report category on eci.gov.in, or a file page on old.eci.gov.in. */
const ELECTIONS: { regionId: string; year: number; title: string; category?: number; oldPage?: string }[] = [
  { regionId: 'andhra-pradesh', year: 2024, title: 'Andhra Pradesh Legislative Assembly Election 2024', category: 2 },
  { regionId: 'arunachal-pradesh', year: 2024, title: 'Arunachal Pradesh Legislative Assembly Election 2024', category: 3 },
  { regionId: 'odisha', year: 2024, title: 'Odisha Legislative Assembly Election 2024', category: 4 },
  { regionId: 'sikkim', year: 2024, title: 'Sikkim Legislative Assembly Election 2024', category: 5 },
  { regionId: 'haryana', year: 2024, title: 'Haryana Legislative Assembly Election 2024', category: 6 },
  { regionId: 'jammu-and-kashmir', year: 2024, title: 'Jammu and Kashmir Legislative Assembly Election 2024', category: 7 },
  { regionId: 'maharashtra', year: 2024, title: 'Maharashtra Legislative Assembly Election 2024', category: 8 },
  { regionId: 'jharkhand', year: 2024, title: 'Jharkhand Legislative Assembly Election 2024', category: 9 },
  { regionId: 'delhi', year: 2025, title: 'NCT of Delhi Legislative Assembly Election 2025', category: 10 },
  { regionId: 'bihar', year: 2025, title: 'Bihar Legislative Assembly Election 2025', category: 16 },
  { regionId: 'assam', year: 2026, title: 'Assam Legislative Assembly Election 2026', category: 23 },
  { regionId: 'kerala', year: 2026, title: 'Kerala Legislative Assembly Election 2026', category: 24 },
  { regionId: 'puducherry', year: 2026, title: 'Puducherry Legislative Assembly Election 2026', category: 25 },
  { regionId: 'tamil-nadu', year: 2026, title: 'Tamil Nadu Legislative Assembly Election 2026', category: 26 },
  { regionId: 'west-bengal', year: 2026, title: 'West Bengal Legislative Assembly Election 2026 (including AC 144)', category: 28 },
  { regionId: 'mizoram', year: 2023, title: 'Mizoram Legislative Assembly Election 2023', category: 32 },
  { regionId: 'madhya-pradesh', year: 2023, title: 'Madhya Pradesh Legislative Assembly Election 2023', category: 33 },
  { regionId: 'rajasthan', year: 2023, title: 'Rajasthan Legislative Assembly Election 2023 (including AC 03)', category: 34 },
  { regionId: 'telangana', year: 2023, title: 'Telangana Legislative Assembly Election 2023', category: 35 },
  { regionId: 'goa', year: 2022, title: 'Goa Legislative Assembly Election 2022', oldPage: 'https://old.eci.gov.in/files/file/14168-goa-general-legislative-election-2022/' },
  { regionId: 'gujarat', year: 2022, title: 'Gujarat Legislative Assembly Election 2022', oldPage: 'https://old.eci.gov.in/files/file/14750-gujarat-general-legislative-election-2022/' },
  { regionId: 'himachal-pradesh', year: 2022, title: 'Himachal Pradesh Legislative Assembly Election 2022', oldPage: 'https://old.eci.gov.in/files/file/14751-himachal-pradesh-general-legislative-election-2022/' },
  { regionId: 'karnataka', year: 2023, title: 'Karnataka Legislative Assembly Election 2023', oldPage: 'https://old.eci.gov.in/files/file/15163-karnataka-2023/' },
  { regionId: 'manipur', year: 2022, title: 'Manipur Legislative Assembly Election 2022', oldPage: 'https://old.eci.gov.in/files/file/14166-manipur-general-legislative-election-2022/' },
  { regionId: 'meghalaya', year: 2023, title: 'Meghalaya Legislative Assembly Election 2023 (including AC 23)', oldPage: 'https://old.eci.gov.in/files/file/15053-meghalaya-general-legislative-election-2023-including-ac-23/' },
  { regionId: 'nagaland', year: 2023, title: 'Nagaland Legislative Assembly Election 2023', oldPage: 'https://old.eci.gov.in/files/file/14874-nagaland-general-legislative-election-2023/' },
  { regionId: 'punjab', year: 2022, title: 'Punjab Legislative Assembly Election 2022', oldPage: 'https://old.eci.gov.in/files/file/14165-punjab-general-legislative-election-2022/' },
  { regionId: 'tripura', year: 2023, title: 'Tripura Legislative Assembly Election 2023', oldPage: 'https://old.eci.gov.in/files/file/14875-tripura-general-legislative-election-2023/' },
  { regionId: 'uttar-pradesh', year: 2022, title: 'Uttar Pradesh Legislative Assembly Election 2022', oldPage: 'https://old.eci.gov.in/files/file/14185-uttar-pradesh-general-legislative-election-2022/' },
  { regionId: 'uttarakhand', year: 2022, title: 'Uttarakhand Legislative Assembly Election 2022', oldPage: 'https://old.eci.gov.in/files/file/14169-uttarakhand-general-legislative-election-2022/' },
];
/** Legislatures with no usable report, and why (shown on the site). */
const MISSING: Record<string, string> = {
  chhattisgarh: 'ECI has not published the 2023 statistical report on its website (the report page is empty).',
};
/** DataMeet boundaries for these states predate the current delimitation, so districts are not assigned. */
const STALE_AC = new Set(['arunachal-pradesh', 'assam', 'jammu-and-kashmir', 'jharkhand', 'manipur', 'nagaland']);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function get(url: string, jar?: Map<string, string>): Promise<FetchResult> {
  for (let attempt = 1; ; attempt++) {
    await sleep(800); // gentle on a public server
    try { return await safeFetch(url, { allowedHosts: HOSTS, maxBytes: 40 * 1024 * 1024, timeoutMs: 120_000, cookieJar: jar }); } catch (e) {
      if (attempt === 3) throw e;
      await sleep(5000 * attempt);
    }
  }
}

type Files = { winners: FetchResult; detailed: FetchResult; parties: FetchResult | null; page: string };
async function files(e: (typeof ELECTIONS)[number]): Promise<Files> {
  if (e.category) {
    const r = await get(`${API}${e.category}`);
    const body = JSON.parse(r.body.toString('utf8')) as { results?: { title: string; xlsx_url: string | null }[] };
    const find = (re: RegExp) => body.results?.find((x) => re.test(x.title) && x.xlsx_url)?.xlsx_url;
    const w = find(/Successful Candidates/i), d = find(/Detailed Results/i), p = find(/Political Parties Participated/i);
    if (!w || !d) throw new Error(`${e.regionId}: report files not listed in category ${e.category}`);
    return { winners: await get(w), detailed: await get(d), parties: p ? await get(p) : null, page: `https://www.eci.gov.in/statistical-report/ae/${e.year}/${e.category}` };
  }
  // old.eci.gov.in: the file page's own "Download" dialog lists each file with a session-bound link.
  const jar = new Map<string, string>();
  await get(e.oldPage!, jar);
  const dialog = (await get(`${e.oldPage}?do=download`, jar)).body.toString('utf8');
  const links = new Map<string, string>();
  for (const m of dialog.matchAll(/<span class='ipsType_break ipsContained'>([^<]+)<\/span>[\s\S]*?href='([^']*do=download[^']*confirm=1[^']*)'/g)) {
    links.set(m[1].trim(), m[2].replace(/&amp;/g, '&'));
  }
  const pick = (re: RegExp) => [...links].find(([n]) => re.test(n) && /\.xlsx?$/i.test(n))?.[1];
  const w = pick(/Successful Candidates/i), d = pick(/Detailed Results/i), p = pick(/Political Parties Participated/i);
  if (!w || !d) throw new Error(`${e.regionId}: files not found in the download dialog (${[...links.keys()].join(', ')})`);
  return { winners: await get(w, jar), detailed: await get(d, jar), parties: p ? await get(p, jar) : null, page: e.oldPage! };
}

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();
const display = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(\-./])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()) : s);
const nn = (s: string) => s.toLowerCase().replace(/^\d+\s+/, '').replace(/[^a-z]/g, '');

/** Rows of a report sheet as objects keyed by the header row (the first row containing `marker`). */
function table(buf: Buffer, marker: RegExp): Record<string, string | number>[][] {
  return readXlsx(buf).map((sheet) => {
    const rows = [...sheet.rows].sort((a, b) => a[0] - b[0]);
    const hi = rows.findIndex(([, c]) => [...c.values()].some((v) => marker.test(String(v))));
    if (hi < 0) return [];
    // Duplicate headers (winner "Name", runner-up "Name") keep the first occurrence under the plain name.
    const header = new Map<string, string>();
    for (const [col, v] of rows[hi][1]) { const k = clean(v).toUpperCase(); if (![...header.values()].includes(k)) header.set(col, k); }
    return rows.slice(hi + 1).map(([, c]) => Object.fromEntries([...header].map(([col, k]) => [k, c.get(col) ?? ''])));
  });
}

// ---------- assembly constituency boundaries → districts ----------
const districts = DistrictsFile.parse(JSON.parse(readFileSync(new URL('data/records/geo/districts.json', ROOT), 'utf8'))).districts;
const shapes = new Map<string, Feature<Geometry, { id: string }>[]>();
function districtShapes(regionId: string) {
  if (!shapes.has(regionId)) {
    const t = JSON.parse(readFileSync(new URL(`data/geo/states/${regionId}.topo.json`, ROOT), 'utf8')) as Topology<{ districts: GeometryCollection<{ id: string }> }>;
    shapes.set(regionId, (feature(t, t.objects.districts) as FeatureCollection<Geometry, { id: string }>).features);
  }
  return shapes.get(regionId)!;
}
const acDir = fileURLToPath(new URL('data/raw/build/ac/', ROOT));
mkdirSync(acDir, { recursive: true });
for (const f of ['India_AC.shp', 'India_AC.shx', 'India_AC.dbf', 'India_AC.prj']) {
  const p = join(acDir, f);
  if (existsSync(p)) continue;
  const r = await safeFetch(`https://raw.githubusercontent.com/datameet/maps/${AC_COMMIT}/assembly-constituencies/${f}`, { allowedHosts: ['raw.githubusercontent.com'], maxBytes: 20 * 1024 * 1024 });
  writeFileSync(p, r.body);
}
void AC_SHA;
const acGeo = join(acDir, 'ac.geojson');
if (!existsSync(acGeo)) execFileSync(fileURLToPath(new URL('node_modules/.bin/mapshaper', ROOT)), ['-i', join(acDir, 'India_AC.shp'), '-simplify', '20%', '-o', 'format=geojson', 'precision=0.0001', acGeo], { stdio: 'pipe' });
const AC_STATE: Record<string, string> = { ORISSA: 'odisha', UTTARKHAND: 'uttarakhand', 'JAMMU & KASHMIR': 'jammu-and-kashmir', DELHI: 'delhi' };
const acs = (JSON.parse(readFileSync(acGeo, 'utf8')) as FeatureCollection<Geometry, { ST_NAME: string; AC_NO: number; AC_NAME: string }>).features;
const regionOfAc = (st: string) => AC_STATE[st] ?? st.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');

/** District ids an assembly constituency lies in (by a point inside each of its parts), for one state. */
function acDistricts(regionId: string, acNo: number): string[] {
  const parts = acs.filter((f) => f.properties.AC_NO === acNo && (regionOfAc(f.properties.ST_NAME) === regionId || (regionId === 'telangana' && f.properties.ST_NAME === 'ANDHRA PRADESH')));
  const out = new Set<string>();
  for (const p of parts) {
    const c = geoCentroid(p);
    const d = districtShapes(regionId).find((s) => geoContains(s, c));
    if (d) out.add(d.properties.id);
  }
  return [...out];
}

// ---------- run ----------
const legislatures = [];
const problems: string[] = [];
for (const e of ELECTIONS) {
  let f: Files;
  try { f = await files(e); } catch (err) { problems.push(`${e.regionId}: ${(err as Error).message}`); continue; }
  const acOf = (r: Record<string, string | number>) => Number(r['AC NO.'] ?? r['AC NO'] ?? 0);
  const winners = table(f.winners.body, /^(AC NO\.?|CONSTITUENCY)$/i).flat().filter((r) => clean(r['NAME'] || r['WINNER']));
  const detailed = table(f.detailed.body, /^AC NO\.?$/i).flat().filter((r) => acOf(r) > 0);
  const parties = new Map<string, string>();
  if (f.parties) for (const sheet of readXlsx(f.parties.body)) for (const [, c] of sheet.rows) { const ab = clean(c.get('B')), nm = clean(c.get('C')); if (ab && nm && ab !== 'ABBREVIATION') parties.set(ab, nm); }
  // Some older lists give the constituency name but not its number; take the number from the detailed results.
  const acByName = new Map(detailed.map((r) => [nn(clean(r['AC NAME'])), acOf(r)]));

  const members = [];
  const issues: string[] = [];
  for (const w of winners) {
    const constituency = clean(w['CONSTITUENCY'] || w['AC NAME']);
    const ac = acOf(w) || acByName.get(nn(constituency)) || 0;
    const name = clean(w['NAME'] || w['WINNER']);
    const party = clean(w['PARTY']);
    if (!ac) { issues.push(`"${constituency}": no constituency number`); continue; }
    // G3: the same election's detailed results must show this candidate with the most votes.
    const rows = detailed.filter((r) => acOf(r) === ac && clean(r['PARTY']) !== 'NOTA').sort((a, b) => Number(b['TOTAL']) - Number(a['TOTAL']));
    const [top, second] = rows;
    if (!top) { issues.push(`AC ${ac}: missing from detailed results`); continue; }
    if (nn(clean(top['CANDIDATE NAME'])) !== nn(name) || clean(top['PARTY']) !== party) {
      issues.push(`AC ${ac}: winner "${name}" (${party}) but detailed results top "${clean(top['CANDIDATE NAME'])}" (${clean(top['PARTY'])})`);
      continue;
    }
    const votes = Number(top['TOTAL']) || null;
    const margin = votes !== null && second ? votes - Number(second['TOTAL']) : null;
    // Where the list also prints votes and margin, they must match the detailed results.
    if (w['VOTES SECURED'] !== undefined && w['VOTES SECURED'] !== '' && Number(w['VOTES SECURED']) !== votes) issues.push(`AC ${ac}: votes ${w['VOTES SECURED']} vs detailed ${votes}`);
    if (w['WINNING MARGIN'] !== undefined && w['WINNING MARGIN'] !== '' && Number(w['WINNING MARGIN']) !== margin) issues.push(`AC ${ac}: margin ${w['WINNING MARGIN']} vs computed ${margin}`);
    members.push({
      ac, constituency: display(constituency), name, party, partyName: parties.get(party) ?? null, votes, margin,
      quote: JSON.stringify([ac, constituency, name, party]),
    });
  }
  members.sort((a, b) => a.ac - b.ac);
  if (!members.length || issues.length > Math.max(2, members.length * 0.02)) { problems.push(`${e.regionId}: held (${members.length} winners; ${issues.length} problems: ${issues.slice(0, 3).join('; ')})`); continue; }
  if (g7Legal(members.flatMap((m) => [m.name, m.constituency, m.partyName ?? ''])).status !== 'pass') { problems.push(`${e.regionId}: G7 failed`); continue; }

  // Districts: only where DataMeet's constituency names agree with ECI's for the state.
  let mapped = false;
  if (!STALE_AC.has(e.regionId)) {
    const names = new Map(acs.filter((a) => regionOfAc(a.properties.ST_NAME) === e.regionId || (e.regionId === 'telangana' && a.properties.ST_NAME === 'ANDHRA PRADESH')).map((a) => [a.properties.AC_NO, a.properties.AC_NAME]));
    const agree = members.filter((m) => { const n = names.get(m.ac); return n && nn(n).slice(0, 5) === nn(m.constituency).slice(0, 5); }).length;
    mapped = agree >= members.length * 0.9;
    console.log(`${e.regionId}: ${members.length} members; DataMeet names agree for ${agree}${mapped ? '' : ' (below 90%: no districts)'}`);
  } else console.log(`${e.regionId}: ${members.length} members; boundaries predate delimitation (no districts)`);

  legislatures.push({
    regionId: e.regionId,
    election: { title: e.title, year: e.year },
    reportUrl: f.page,
    seats: members.length,
    districtsMapped: mapped,
    members: members.map(({ quote, ...m }) => ({ ...m, districts: mapped ? acDistricts(e.regionId, m.ac).filter((d) => districts.some((x) => x.regionId === e.regionId && x.id === d)) : [], quote })),
    evidence: [
      { sourceId: 'eci-statistical-reports', url: f.winners.finalUrl.replace(/([?&])csrfKey=[^&]*/, '$1').replace(/[?&]$/, ''), retrievedAt: f.winners.retrievedAt, snapshotSha256: f.winners.sha256, quote: '2 - List of Successful Candidates', method: 'pipeline' as const },
      { sourceId: 'eci-statistical-reports', url: f.detailed.finalUrl.replace(/([?&])csrfKey=[^&]*/, '$1').replace(/[?&]$/, ''), retrievedAt: f.detailed.retrievedAt, snapshotSha256: f.detailed.sha256, quote: '10 - Detailed Results', method: 'pipeline' as const },
    ],
  });
}

const file = AssembliesFile.parse({
  schemaVersion: 1,
  lastVerifiedAt: new Date().toISOString(),
  legislatures,
  unavailable: { ...MISSING, ...Object.fromEntries(problems.map((p) => [p.split(':')[0], 'Held by verification: ' + p.split(': ').slice(1).join(': ')])) },
});
writeFileSync(OUT, `${JSON.stringify(file, null, 1)}\n`);
console.log(`assemblies: ${legislatures.length} legislatures, ${legislatures.reduce((n, l) => n + l.seats, 0)} members`);
if (problems.length) console.log(`held:\n${problems.join('\n')}`);
