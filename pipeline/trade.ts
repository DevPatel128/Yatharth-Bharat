// India's merchandise trade (RBI "Direction of Foreign Trade – US Dollars", via the MoSPI API).
// Gates: G1 per page; G2 positive values and well-formed years; G3 annual totals must match the sum of RBI's
// separate monthly oil/non-oil trade table within 1% (latest year); G4 each value cut verbatim from its record;
// G5 previously published totals may not move more than 2% without being held. Usage: node pipeline/trade.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { TradeFile, type Evidence } from '../src/lib/schema.ts';
import { safeFetch, type FetchResult } from './lib/safe-fetch.ts';
import { g1Provenance } from './gates.ts';
import { enclosingRecord, quoteContainsValue } from './anchor.ts';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('data/records/world/trade.json', ROOT);
const MOSPI = { allowedHosts: ['api.mospi.gov.in'], legacyTlsRenegotiation: true };
type Row = { year: string; month?: string; country_group: string | null; country_sub_group: string | null; countries: string | null; category?: string; trade: string; value: string };

async function allPages(code: number, extra: Record<string, string> = {}) {
  const pages: { r: FetchResult; rows: Row[] }[] = [];
  for (let page = 1; page <= 50; page++) {
    const url = `https://api.mospi.gov.in/api/rbi/getRbiRecords?${new URLSearchParams({ sub_indicator_code: String(code), limit: '200', page: String(page), Format: 'JSON', ...extra })}`;
    const r = await safeFetch(url, MOSPI);
    const g1 = g1Provenance(r, MOSPI.allowedHosts, 'json');
    if (g1.status !== 'pass') throw new Error(`RBI ${code}: ${g1.detail}`);
    const body = JSON.parse(r.body.toString('utf8')) as { data?: Row[]; meta_data?: { totalPages?: number }; message?: string };
    if (!Array.isArray(body.data)) throw new Error(`RBI ${code}: ${body.message ?? 'unexpected response'}`);
    pages.push({ r, rows: body.data });
    if (page >= (body.meta_data?.totalPages ?? 1)) break;
    await new Promise((res) => setTimeout(res, 300));
  }
  return pages;
}

function evidence(pages: { r: FetchResult }[], locator: string, value: number): Evidence {
  for (const { r } of pages) {
    const text = r.body.toString('utf8');
    const q = enclosingRecord(text, locator);
    if (q && quoteContainsValue(q, value)) return { sourceId: 'mospi-api', url: r.finalUrl, retrievedAt: r.retrievedAt, snapshotSha256: r.sha256, quote: q, method: 'pipeline' };
  }
  throw new Error(`G4: record not found for ${locator} = ${value}`);
}

const num = (s: string) => { const v = Number(s); if (!Number.isFinite(v) || v < 0) throw new Error(`G2: bad value ${s}`); return v; };
const dot = await allPages(11);
const rows = dot.flatMap((p) => p.rows);
const totalsByYear = new Map<string, { exports?: number; imports?: number }>();
for (const x of rows.filter((x) => x.country_group === 'Total' && !x.countries)) {
  if (!/^\d{4}-\d{2}$/.test(x.year)) throw new Error(`G2: malformed year ${x.year}`);
  const t = totalsByYear.get(x.year) ?? {};
  if (x.trade === 'Export') t.exports = num(x.value); else if (x.trade === 'Import') t.imports = num(x.value);
  totalsByYear.set(x.year, t);
}
const years = [...totalsByYear.keys()].sort();
const latest = years.at(-1);
if (!latest) throw new Error('no Total rows found');
const loc = (year: string, trade: string) => `"year":"${year}","country_group":"Total","country_sub_group":null,"countries":null,"trade":"${trade}"`;
const totals = years.flatMap((y) => {
  const t = totalsByYear.get(y)!;
  if (t.exports === undefined || t.imports === undefined) return [];
  return [{ year: y, exports: t.exports, imports: t.imports, evidence: [evidence(dot, loc(y, 'Export'), t.exports), evidence(dot, loc(y, 'Import'), t.imports)] }];
});

// G3: an independent RBI table (monthly oil + non-oil trade) must add up to the same annual totals.
const monthly = (await allPages(42, { year: latest })).flatMap((p) => p.rows);
const sum = (trade: string) => monthly.filter((x) => x.trade === trade).reduce((a, x) => a + num(x.value), 0);
const months = new Set(monthly.map((x) => x.month)).size;
const lt = totalsByYear.get(latest)!;
const TOL = 1;
const off = (a: number, b: number) => (Math.abs(a - b) / b) * 100;
if (months !== 12) throw new Error(`G3: monthly table has ${months} months for ${latest}, expected 12`);
if (off(sum('Export'), lt.exports!) > TOL || off(sum('Import'), lt.imports!) > TOL)
  throw new Error(`G3: ${latest} totals ${lt.exports}/${lt.imports} vs monthly sums ${sum('Export').toFixed(2)}/${sum('Import').toFixed(2)} differ by more than ${TOL}%`);

// G5: published totals may not jump more than 2% between runs without review.
if (existsSync(OUT)) {
  const prev = TradeFile.parse(JSON.parse(readFileSync(OUT, 'utf8')));
  for (const p of prev.totals) {
    const n = totals.find((t) => t.year === p.year);
    if (n && (off(n.exports, p.exports) > 2 || off(n.imports, p.imports) > 2)) throw new Error(`G5: ${p.year} totals moved more than 2% (${p.exports}/${p.imports} → ${n.exports}/${n.imports}); held`);
  }
}

const partnerRows = rows.filter((x) => x.year === latest && x.countries);
const byCountry = new Map<string, { group: string; exports: number | null; imports: number | null; evidence: Evidence[] }>();
for (const x of partnerRows) {
  const c = x.countries!;
  const e = byCountry.get(c) ?? { group: x.country_group ?? '', exports: null, imports: null, evidence: [] };
  const v = num(x.value);
  if (x.trade === 'Export') e.exports = v; else if (x.trade === 'Import') e.imports = v;
  const locator = `"year":"${x.year}","country_group":${JSON.stringify(x.country_group)},"country_sub_group":${JSON.stringify(x.country_sub_group)},"countries":${JSON.stringify(c)},"trade":"${x.trade}"`;
  e.evidence.push(evidence(dot, locator, v));
  byCountry.set(c, e);
}
const file = TradeFile.parse({
  schemaVersion: 1, unit: 'US$ million', lastVerifiedAt: dot[0].r.retrievedAt, totals, latestYear: latest,
  partners: [...byCountry.entries()].map(([country, v]) => ({ country, ...v })).sort((a, b) => (b.exports ?? 0) + (b.imports ?? 0) - ((a.exports ?? 0) + (a.imports ?? 0))),
  crossCheck: { year: latest, monthlySumExports: Math.round(sum('Export') * 100) / 100, monthlySumImports: Math.round(sum('Import') * 100) / 100, tolerancePct: TOL },
});
mkdirSync(new URL('data/records/world/', ROOT), { recursive: true });
writeFileSync(OUT, JSON.stringify(file, null, 2) + '\n');
console.log(`trade: ${totals.length} years (latest ${latest}), ${file.partners.length} partners; G3 monthly sums ${file.crossCheck.monthlySumExports}/${file.crossCheck.monthlySumImports} vs ${lt.exports}/${lt.imports}`);
