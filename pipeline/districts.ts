// Districts, blocks, cities (urban local bodies) and city wards from NIC's Bharat Maps public map services.
// - Districts: BharatMapService/Admin_Boundary_District (786 polygons, LGD-coded).
// - Blocks: Panchayat/AdminGPHierarchy layer 2 (rural development blocks, LGD-coded).
// - Cities and wards: ULB/ULB_boundaries layers 0 and 1 (published for some states only).
// Blocks, cities and wards are placed in a district by where they lie (a point inside each shape), not by codes,
// because the block and city layers carry older district codes. Output:
//   data/geo/states/<region>.topo.json  districts + blocks + cities, simplified, one file per state/UT
//   data/geo/wards/<city>.topo.json     wards of one city
//   data/records/geo/districts.json     names, codes, areas and what each district contains
// Usage: node pipeline/districts.ts   (needs the mapshaper dev dependency)
import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea, geoBounds, geoContains, geoCentroid } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, Point as GeoPoint } from 'geojson';
import { DistrictsFile, RegionsFile } from '../src/lib/schema.ts';
import { safeFetch } from './lib/safe-fetch.ts';
import { g1Provenance } from './gates.ts';

const ROOT = new URL('../', import.meta.url);
const RAW = fileURLToPath(new URL('data/raw/nic/', ROOT));
const OUT_STATES = fileURLToPath(new URL('data/geo/states/', ROOT));
const OUT_WARDS = fileURLToPath(new URL('data/geo/wards/', ROOT));
const RECORD = new URL('data/records/geo/districts.json', ROOT);
const HOST = 'mapservice.gov.in';
const DISTRICTS = 'https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/Admin_Boundary_District/MapServer/1';
const BLOCKS = 'https://mapservice.gov.in/mapserviceserv176/rest/services/Panchayat/AdminGPHierarchy/MapServer/2';
const CITIES = 'https://mapservice.gov.in/mapserviceserv176/rest/services/ULB/ULB_boundaries/MapServer/0';
const WARDS = 'https://mapservice.gov.in/mapserviceserv176/rest/services/ULB/ULB_boundaries/MapServer/1';
const MIN_DISTRICTS = 750; // India had 780+ districts in 2026; far fewer means a broken response
const MAX_DISTRICT_CHURN = 0.05; // more than 5% of district codes changing in one run is held as suspicious

/** LGD state code → this site's region id. Checked against the state name NIC returns. */
const STATE_LGD: Record<number, string> = {
  35: 'andaman-and-nicobar-islands', 28: 'andhra-pradesh', 12: 'arunachal-pradesh', 18: 'assam', 10: 'bihar', 4: 'chandigarh',
  22: 'chhattisgarh', 38: 'dadra-and-nagar-haveli-and-daman-and-diu', 7: 'delhi', 30: 'goa', 24: 'gujarat', 6: 'haryana',
  2: 'himachal-pradesh', 1: 'jammu-and-kashmir', 20: 'jharkhand', 29: 'karnataka', 32: 'kerala', 37: 'ladakh', 31: 'lakshadweep',
  23: 'madhya-pradesh', 27: 'maharashtra', 14: 'manipur', 17: 'meghalaya', 15: 'mizoram', 13: 'nagaland', 21: 'odisha',
  34: 'puducherry', 3: 'punjab', 8: 'rajasthan', 11: 'sikkim', 33: 'tamil-nadu', 36: 'telangana', 16: 'tripura', 9: 'uttar-pradesh',
  5: 'uttarakhand', 19: 'west-bengal',
};

type Props = Record<string, string | number | null>;
type FC = FeatureCollection<Geometry, Props>;

// mapservice.gov.in uses Let's Encrypt's newer "ISRG Root YR" (2025), which Node 24's bundled roots do not
// include yet. Trust it in addition to the built-in roots, pinned by fingerprint so a swapped file is refused.
const YR = readFileSync(new URL('pipeline/certs/isrg-root-yr.pem', ROOT), 'utf8');
const YR_SHA256 = 'E5:7B:7E:6F:15:0C:41:91:02:E8:D5:C0:55:72:9F:F9:67:B9:D1:A8:29:BF:00:CE:C8:9C:A6:04:EB:F4:A8:6F';
if (new X509Certificate(YR).fingerprint256 !== YR_SHA256) throw new Error('pipeline/certs/isrg-root-yr.pem does not match its pinned fingerprint');

mkdirSync(RAW, { recursive: true });
const sources: { url: string; sha256: string; retrievedAt: string; features: number }[] = [];

/** Page through an ArcGIS layer as GeoJSON (WGS84), lightly generalised on the server (~100 m). */
async function get(url: string, label: string) {
  for (let attempt = 1; ; attempt++) {
    await new Promise((res) => setTimeout(res, 1000)); // one request a second: a shared public government server
    try {
      const r = await safeFetch(url, { allowedHosts: [HOST], maxBytes: 80 * 1024 * 1024, timeoutMs: 180_000, extraCa: [YR] });
      const g1 = g1Provenance(r, [HOST], 'json');
      if (g1.status !== 'pass') throw new Error(`${label}: ${g1.detail}`);
      const body = JSON.parse(r.body.toString('utf8')) as Record<string, unknown> & { error?: unknown };
      if (body.error) throw new Error(`${label}: service error ${JSON.stringify(body.error)}`);
      return { r, body };
    } catch (e) {
      if (attempt === 4) throw e;
      console.warn(`${label}: ${(e as Error).message}; retrying`);
      await new Promise((res) => setTimeout(res, 10_000 * attempt));
    }
  }
}

/**
 * Fetch a whole ArcGIS layer as GeoJSON (WGS84), lightly generalised on the server. Some layers do not support
 * paging, so object ids are listed first and requested in chunks.
 */
async function layer(base: string, outFields: string, offset: number, label: string): Promise<FC> {
  // --cached: rebuild from the last download in data/raw/nic (development only; CI always fetches).
  if (process.argv.includes('--cached') && existsSync(join(RAW, 'SOURCES.json'))) {
    const files = readdirSync(RAW).filter((f) => f.startsWith(`${label}-`) && f.endsWith('.geojson'));
    const prev = (JSON.parse(readFileSync(join(RAW, 'SOURCES.json'), 'utf8')) as typeof sources).filter((x) => x.url.startsWith(base));
    if (files.length && prev.length) {
      sources.push(...prev);
      const features = files.flatMap((f) => (JSON.parse(readFileSync(join(RAW, f), 'utf8')) as FC).features)
        .filter((f) => f.geometry).map((f) => ({ ...f, geometry: rewind(f.geometry) }))
        .filter((f) => (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') && f.geometry.coordinates.length);
      console.log(`${label}: ${features.length} features (cached)`);
      return { type: 'FeatureCollection', features };
    }
  }
  const ids = (await get(`${base}/query?where=1%3D1&returnIdsOnly=true&f=json`, label)).body as { objectIds?: number[] };
  if (!Array.isArray(ids.objectIds) || !ids.objectIds.length) throw new Error(`${label}: no object ids`);
  const list = [...ids.objectIds].sort((a, b) => a - b);
  const all: Feature<Geometry, Props>[] = [];
  for (let i = 0; i < list.length; i += 200) {
    const q = new URLSearchParams({ outFields, returnGeometry: 'true', outSR: '4326', maxAllowableOffset: String(offset), geometryPrecision: '5', f: 'geojson' });
    // Literal commas and short URLs (under ~2 KB): the server's firewall answers an error page otherwise.
    const url = `${base}/query?objectIds=${list.slice(i, i + 200).join(',')}&${q.toString().replace(/%2C/g, ',')}`;
    const { r, body } = await get(url, label);
    const page = body as unknown as FC;
    if (!Array.isArray(page.features)) throw new Error(`${label}: no features in response`);
    writeFileSync(join(RAW, `${label}-${i}.geojson`), r.body);
    sources.push({ url, sha256: r.sha256, retrievedAt: r.retrievedAt, features: page.features.length });
    all.push(...page.features.filter((f) => f.geometry).map((f) => ({ ...f, geometry: rewind(f.geometry) })).filter((f) => (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') && f.geometry.coordinates.length));
  }
  if (all.length < list.length * 0.98) throw new Error(`${label}: received ${all.length} of ${list.length} features`);
  console.log(`${label}: ${all.length} features`);
  return { type: 'FeatureCollection', features: all };
}

/**
 * d3-geo reads polygons on the sphere: an outer ring must run clockwise, or it means "the whole globe except
 * this shape". The service returns the opposite (RFC 7946) order, so every ring is rewound here before any
 * area or containment test. Outer rings clockwise, holes anticlockwise (planar shoelace in lon/lat).
 */
function rewind(g: Geometry): Geometry {
  const signed = (r: number[][]) => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0);
  // Server-side generalisation can flatten a tiny island to a zero-area ring, which has no orientation and
  // would read as the whole globe; such rings (and polygons left without an outer ring) are dropped.
  const solid = (r: number[][]) => Math.abs(signed(r)) > 1e-6; // ~0.01 km²: specks and broken slivers
  const fix = (poly: number[][][]) => (solid(poly[0]) ? poly.filter(solid).map((ring, i) => ((i === 0) === (signed(ring) > 0) ? [...ring].reverse() : ring)) : []);
  if (g.type === 'Polygon') return { ...g, coordinates: fix(g.coordinates) };
  if (g.type === 'MultiPolygon') return { ...g, coordinates: g.coordinates.map(fix).filter((p) => p.length) };
  return g;
}

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();
/** Names published in capitals are shown in title case ("NORTH GOA" → "North Goa"); mixed-case names are kept. */
const display = (s: string) => (s === s.toUpperCase()
  ? s.split(' ').map((w) => (/^[^AEIOU]{2,5}$/.test(w) && /^[A-Z]+$/.test(w) ? w : w.toLowerCase().replace(/(^|[(\-./])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()))).join(' ')
  : s); // acronyms without vowels (BBMP, DMC, NDMC) stay in capitals
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');

/** A point inside the shape: the centroid when it falls inside, else a vertex of the largest ring. */
function inside(f: Feature<Geometry>): [number, number] {
  const c = geoCentroid(f);
  if (geoContains(f, c)) return c;
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  const ring = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
  if (!ring) return c;
  // Average of a few consecutive vertices nudged inward is usually inside; fall back to a vertex.
  for (let i = 0; i < ring.length - 2; i += Math.max(1, Math.floor(ring.length / 50))) {
    const p: [number, number] = [(ring[i][0] + ring[i + 1][0] + ring[i + 2][0]) / 3, (ring[i][1] + ring[i + 1][1] + ring[i + 2][1]) / 3];
    if (geoContains(f, p)) return p;
  }
  return ring[0] as [number, number];
}

// ---------- fetch ----------
const districtsFc = await layer(DISTRICTS, 'dtname,stname,dist_lgd,state_lgd,year_stat', 0.001, 'districts');
const blocksFc = await layer(BLOCKS, 'block_name,block_lgd', 0.001, 'blocks');
const citiesFc = await layer(CITIES, 'ULB,CODE,stname,State_LGD', 0.0003, 'cities');
const wardsFc = await layer(WARDS, 'ward_no,name_1,city_id,town_id,censusCode,stname,State_LGD', 0.0001, 'wards');

const regions = RegionsFile.parse(JSON.parse(readFileSync(new URL('data/records/geo/regions.json', ROOT), 'utf8'))).regions;
const regionName = new Map(regions.map((r) => [r.id, r.boundaryName]));

// ---------- districts ----------
type D = { f: Feature<Geometry, Props>; id: string; lgd: number; name: string; regionId: string };
const districts: D[] = [];
const problems: string[] = [];
const usedIds = new Set<string>();
for (const f of districtsFc.features) {
  const p = f.properties;
  const regionId = STATE_LGD[Number(p.state_lgd)];
  const name = display(clean(p.dtname));
  if (!regionId) { problems.push(`district ${name}: unknown state code ${p.state_lgd}`); continue; }
  if (norm(regionName.get(regionId) ?? '') !== norm(clean(p.stname)) && !(regionId === 'dadra-and-nagar-haveli-and-daman-and-diu' && /dadra/i.test(clean(p.stname)))) {
    problems.push(`district ${name}: state code ${p.state_lgd} is ${regionId} but NIC says "${p.stname}"`);
  }
  if (!name) { problems.push(`district with LGD ${p.dist_lgd} has no name`); continue; }
  let id = slug(name);
  if (usedIds.has(`${regionId}/${id}`)) id = `${id}-${p.dist_lgd}`;
  usedIds.add(`${regionId}/${id}`);
  districts.push({ f, id, lgd: Number(p.dist_lgd) || 0, name, regionId });
}
if (districts.length < MIN_DISTRICTS) problems.push(`only ${districts.length} districts (expected at least ${MIN_DISTRICTS})`);
// Sanity: districts together must cover roughly India's area (about 3.29 million km² as depicted by the Survey of
// India). An inverted ring or a missing state shows up here.
const totalKm2 = districts.reduce((n, d) => n + geoArea(d.f) * 6371.0088 ** 2, 0);
if (totalKm2 < 2.9e6 || totalKm2 > 3.5e6) problems.push(`districts cover ${Math.round(totalKm2)} km², expected about 3.29 million`);
const missingRegions = regions.filter((r) => !districts.some((d) => d.regionId === r.id)).map((r) => r.id);
if (missingRegions.length) problems.push(`no districts for ${missingRegions.join(', ')}`);

// Compare with the previous verified run: a sudden large change in district codes is held, not published.
if (existsSync(RECORD)) {
  // Only ids are compared, so an older record with fewer fields still counts.
  const prev = new Set((JSON.parse(readFileSync(RECORD, 'utf8')) as { districts: { regionId: string; id: string }[] }).districts.map((d) => `${d.regionId}/${d.id}`));
  const now = new Set(districts.map((d) => `${d.regionId}/${d.id}`));
  const changed = [...prev].filter((k) => !now.has(k)).length + [...now].filter((k) => !prev.has(k)).length;
  if (prev.size && changed / prev.size > MAX_DISTRICT_CHURN) problems.push(`${changed} district ids changed since the last run (more than ${MAX_DISTRICT_CHURN * 100}%)`);
}

/** The district a shape lies in, by a point inside it. */
// Bounding boxes first: a full point-in-polygon test against 786 detailed shapes per ward is slow.
const boxes = new WeakMap<object, [[number, number], [number, number]]>();
const box = (f: Feature<Geometry>) => { let b = boxes.get(f); if (!b) { b = geoBounds(f) as [[number, number], [number, number]]; boxes.set(f, b); } return b; };
const inBox = (f: Feature<Geometry>, [x, y]: [number, number]) => { const [[x0, y0], [x1, y1]] = box(f); return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
const within = (f: Feature<Geometry>, pt: [number, number]) => inBox(f, pt) && geoContains(f, pt);

function locate(f: Feature<Geometry>): D | undefined {
  const pt = inside(f);
  return districts.find((d) => within(d.f, pt));
}

type Placed = { f: Feature<Geometry, Props>; d: D; id: string; name: string };
function place(fc: FC, nameOf: (p: Props) => string, idOf: (p: Props, name: string) => string, label: string): Placed[] {
  const out: Placed[] = [];
  let lost = 0;
  for (const f of fc.features) {
    const d = locate(f);
    if (!d) { lost++; continue; }
    const name = display(clean(nameOf(f.properties)));
    out.push({ f, d, id: idOf(f.properties, name), name });
  }
  if (lost / Math.max(1, fc.features.length) > 0.02) problems.push(`${label}: ${lost} of ${fc.features.length} could not be placed in a district`);
  console.log(`${label}: ${out.length} placed, ${lost} outside every district (dropped)`);
  return out;
}
const blocks = place(blocksFc, (p) => String(p.block_name ?? ''), (p, n) => slug(`${n}-${p.block_lgd || 'x'}`), 'blocks');
type City = { id: string; name: string; kind: string | null; d: D; also: D[]; ulb: boolean; f?: Feature<Geometry, Props>; wards: Feature<Geometry, Props>[] };
const cities: City[] = place(citiesFc, (p) => String(p.ULB ?? ''), (p, n) => slug(`${n}-${p.CODE || 'x'}`), 'cities')
  .filter((c) => c.name)
  .map((c) => ({ id: c.id, name: c.name.replace(/\s+Ulb$/i, ''), kind: null, d: c.d, also: [], ulb: true, f: c.f, wards: [] }));

// Civic status abbreviations as used by the Census of India in town names ("Coimbatore (M Corp.)").
const KINDS: Record<string, string> = {
  'M Corp.': 'Municipal Corporation', 'M Corp': 'Municipal Corporation', 'M.Corp.': 'Municipal Corporation', 'M Cl': 'Municipal Council', M: 'Municipality',
  'M B': 'Municipal Board', MB: 'Municipal Board', NP: 'Nagar Panchayat', 'N.P.': 'Nagar Panchayat', TP: 'Town Panchayat', CB: 'Cantonment Board',
  NAC: 'Notified Area Council', NA: 'Notified Area', 'N.A.': 'Notified Area', CMC: 'City Municipal Council', TMC: 'Town Municipal Council', CT: 'Census Town',
  ITS: 'Industrial Township', 'M.Cl.': 'Municipal Council', NDMC: 'New Delhi Municipal Council',
};
function townName(raw: string): { name: string; kind: string | null } {
  const m = /^(.*?)\s*\(([^)]+)\)\s*(?:\(Part\))?\s*$/i.exec(raw);
  if (!m) return { name: display(raw), kind: null };
  return { name: display(m[1].trim()), kind: KINDS[m[2].trim()] ?? null };
}

// Wards: inside a published city outline → that city. Otherwise the ward names its own town; such wards are
// grouped by census town code into a city whose outline is the union of its wards.
let unnamedOrMisplaced = 0;
const byTown = new Map<string, Feature<Geometry, Props>[]>();
for (const w of wardsFc.features) {
  const pt = inside(w);
  const c = cities.find((x) => x.f && within(x.f, pt));
  if (c) { c.wards.push(w); continue; }
  // A ward must lie in the state it names; a mismatch is a source error and the ward is left out.
  const at = locate(w);
  if (!at || STATE_LGD[Number(w.properties.State_LGD)] !== at.regionId || !clean(w.properties.name_1)) { unnamedOrMisplaced++; continue; }
  const key = `${w.properties.State_LGD}:${w.properties.town_id || clean(w.properties.name_1)}`;
  if (!byTown.has(key)) byTown.set(key, []);
  byTown.get(key)!.push(w);
}
let wardsLost = unnamedOrMisplaced;
for (const [key, ws] of byTown) {
  const counts = new Map<D, number>();
  for (const w of ws) { const d = locate(w); if (d) counts.set(d, (counts.get(d) ?? 0) + 1); }
  const d = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const raw = clean(ws[0].properties.name_1);
  if (!d || !raw) { wardsLost += ws.length; continue; }
  const { name, kind } = townName(raw);
  cities.push({ id: slug(`${name}-${key.split(':')[1]}`), name, kind, d, also: [...counts.keys()].filter((x) => x !== d), ulb: false, wards: ws });
}
// The ward layer sometimes puts a town in the wrong state (wards in Puducherry labelled "Umarkote", an Odisha town).
// Census 2011 town codes are numbered state by state, so a town whose code sits between two towns of one other
// state is misplaced: dropped. Towns without a code are dropped when the same name is a
// city elsewhere. Missing beats wrong.
const nn = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const dropped: string[] = [];
const coded = cities.filter((c) => !c.ulb && /^\d+$/.test(c.id.split('-').at(-1) ?? '') && Number(c.id.split('-').at(-1)) > 0)
  .map((c) => ({ c, code: Number(c.id.split('-').at(-1)) })).sort((x, y) => x.code - y.code);
const capital = new Map(regions.map((r) => [r.id, nn(r.capital?.en ?? '')]));
for (const [i, { c }] of coded.entries()) {
  const prev = coded[i - 1]?.c.d.regionId, next = coded[i + 1]?.c.d.regionId;
  if (!prev || !next || prev !== next || prev === c.d.regionId) continue;
  // A territory with a single coded town (Chandigarh) has no neighbour of its own to compare with: keep it only
  // when it is that territory's official capital.
  const alone = coded.filter((k) => k.c.d.regionId === c.d.regionId).length === 1;
  if (alone && capital.get(c.d.regionId) === nn(c.name)) continue;
  dropped.push(`${c.name} in ${c.d.regionId} (town code among ${prev} towns)`);
}
for (const c of cities.filter((x) => !x.ulb && !coded.some((k) => k.c === x))) {
  if (cities.some((o) => o !== c && o.d.regionId !== c.d.regionId && nn(o.name) === nn(c.name))) dropped.push(`${c.name} in ${c.d.regionId} (no town code; name is a city elsewhere)`);
}
for (const msg of dropped) { const name = msg.split(' in ')[0]; const region = msg.split(' in ')[1].split(' ')[0]; const i = cities.findIndex((x) => !x.ulb && x.name === name && x.d.regionId === region); if (i >= 0) cities.splice(i, 1); }
if (dropped.length) console.log(`cities dropped as misplaced: ${dropped.join('; ')}`);
const seenCity = new Set<string>();
for (const c of cities) { while (seenCity.has(c.id)) c.id += '-x'; seenCity.add(c.id); }
// A "ward" layer entry that is the whole town (one polygon) is an outline, not a ward map.
for (const c of cities) if (c.wards.length === 1 && !c.f) { c.f = c.wards[0]; c.wards = []; }
for (const c of cities) if (c.wards.length === 1) c.wards = [];
// Cities with a published outline may still spill into neighbouring districts.
for (const c of cities) if (c.f && !c.also.length) c.also = districts.filter((d) => d !== c.d && d.regionId === c.d.regionId && c.wards.some((w) => within(d.f, inside(w))));
const withWards = cities.filter((c) => c.wards.length);
console.log(`cities: ${cities.length} (${cities.filter((c) => c.f).length} published outlines, ${cities.filter((c) => !c.f).length} from wards); ${withWards.length} with wards; ${wardsLost} wards could not be placed`);
// Wards whose town is not named anywhere in the layer cannot be shown honestly; they are dropped and counted.
if (wardsLost / wardsFc.features.length > 0.15) problems.push(`${wardsLost} wards could not be placed`);

if (problems.length) throw new Error(`districts held:\n${problems.join('\n')}`);

// ---------- write geometry ----------
const mapshaper = fileURLToPath(new URL('node_modules/.bin/mapshaper', ROOT));
const tmp = join(RAW, 'build');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
rmSync(OUT_STATES, { recursive: true, force: true });
rmSync(OUT_WARDS, { recursive: true, force: true });
mkdirSync(OUT_STATES, { recursive: true });
mkdirSync(OUT_WARDS, { recursive: true });
const fc = (features: Feature<Geometry, Props>[]): FC => ({ type: 'FeatureCollection', features });
const strip = (f: Feature<Geometry, Props>, props: Props): Feature<Geometry, Props> => ({ type: 'Feature', properties: props, geometry: f.geometry });

for (const r of regions) {
  const ds = districts.filter((d) => d.regionId === r.id);
  const files = {
    districts: fc(ds.map((d) => strip(d.f, { id: d.id }))),
    blocks: fc(blocks.filter((b) => b.d.regionId === r.id).map((b) => strip(b.f, { id: b.id, d: b.d.id }))),
    cities: fc(cities.filter((c) => c.d.regionId === r.id && c.f).map((c) => strip(c.f!, { id: c.id, d: c.d.id }))),
  };
  // Cities known only from their wards: merge the wards into one outline per city first.
  const fromWards = cities.filter((c) => c.d.regionId === r.id && !c.f);
  if (fromWards.length) {
    const wp = join(tmp, `${r.id}-wardcities-in.geojson`);
    const out = join(tmp, `${r.id}-wardcities.geojson`);
    writeFileSync(wp, JSON.stringify(fc(fromWards.flatMap((c) => c.wards.map((w) => strip(w, { id: c.id, d: c.d.id }))))));
    execFileSync(mapshaper, ['-i', wp, 'snap', '-dissolve2', 'id', 'copy-fields=d', '-o', 'format=geojson', out], { stdio: 'pipe' });
    files.cities.features.push(...(JSON.parse(readFileSync(out, 'utf8')) as FC).features);
  }
  const inputs: string[] = [];
  for (const [k, v] of Object.entries(files)) {
    if (!v.features.length) continue;
    const p = join(tmp, `${r.id}-${k}.geojson`);
    writeFileSync(p, JSON.stringify(v));
    inputs.push(p);
  }
  // Simplify all layers of a state together so shared borders stay consistent.
  execFileSync(mapshaper, ['-i', ...inputs, 'combine-files', '-simplify', '8%', 'weighted', 'keep-shapes', '-o', 'format=topojson', 'quantization=40000', join(OUT_STATES, `${r.id}.topo.json`)], { stdio: 'pipe' });
  // mapshaper names objects after the input files; rename them to districts / blocks / cities.
  const p = join(OUT_STATES, `${r.id}.topo.json`);
  const t = JSON.parse(readFileSync(p, 'utf8')) as { objects: Record<string, unknown> };
  t.objects = Object.fromEntries(Object.entries(t.objects).map(([k, v]) => [k.replace(`${r.id}-`, ''), v]));
  writeFileSync(p, JSON.stringify(t));
}
for (const { id: cityId, wards: ws } of withWards) {
  const p = join(tmp, `ward-${cityId}.geojson`);
  writeFileSync(p, JSON.stringify(fc(ws.map((w) => strip(w, { n: clean(w.properties.ward_no) || clean(w.properties.name_1) })))));
  execFileSync(mapshaper, ['-i', p, '-simplify', '25%', 'keep-shapes', '-o', 'format=topojson', 'quantization=20000', join(OUT_WARDS, `${cityId}.topo.json`)], { stdio: 'pipe' });
  const out = join(OUT_WARDS, `${cityId}.topo.json`);
  const t = JSON.parse(readFileSync(out, 'utf8')) as { objects: Record<string, unknown> };
  t.objects = { wards: Object.values(t.objects)[0] };
  writeFileSync(out, JSON.stringify(t));
}
rmSync(tmp, { recursive: true, force: true });

// ---------- record ----------
const km2 = (f: Feature<Geometry>) => Math.round(geoArea(f) * 6371.0088 ** 2);
const fetchedAt = sources.map((s) => s.retrievedAt).sort().at(-1)!;
const record = DistrictsFile.parse({
  schemaVersion: 1,
  lastVerifiedAt: fetchedAt,
  sources: { districts: DISTRICTS, blocks: BLOCKS, cities: CITIES, wards: WARDS },
  snapshotSha256: createHash('sha256').update(sources.map((s) => s.sha256).join('\n')).digest('hex'),
  districts: districts
    .map((d) => ({
      id: d.id,
      lgd: d.lgd || null,
      name: { en: d.name, hi: null },
      regionId: d.regionId,
      areaKm2: km2(d.f),
      centre: inside(d.f).map((v) => Math.round(v * 1e4) / 1e4) as [number, number],
      blocks: blocks.filter((b) => b.d === d).map((b) => ({ id: b.id, name: b.name, lgd: Number(b.f.properties.block_lgd) || null })).sort((a, b) => a.name.localeCompare(b.name)),
      cities: cities.filter((c) => c.d === d || c.also.includes(d)).map((c) => ({ id: c.id, name: c.name, kind: c.kind, main: c.d.id, alsoIn: [c.d, ...c.also].filter((x) => x !== d).map((x) => x.id), wards: c.wards.length, areaKm2: c.f ? km2(c.f) : c.wards.reduce((n, w) => n + km2(w), 0) })).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.regionId.localeCompare(b.regionId) || a.name.en.localeCompare(b.name.en)),
});
writeFileSync(RECORD, `${JSON.stringify(record, null, 1)}\n`);
writeFileSync(join(RAW, 'SOURCES.json'), JSON.stringify(sources, null, 1));
console.log(`districts: ${record.districts.length} in ${new Set(record.districts.map((d) => d.regionId)).size} states/UTs; ${blocks.length} blocks; ${cities.length} cities; ${withWards.length} cities with wards`);
