// Source adapters. Each returns the same data parsed two independent ways (for G3) plus the raw snapshot.
// Parsing never guesses: an unexpected shape throws, and the run records the failure.
import { safeFetch, type FetchResult } from './lib/safe-fetch.ts';
import type { Point } from './gates.ts';

/** `locatorFor` returns text that uniquely identifies the row for a point inside the raw snapshot (see anchor.ts). */
export type Extraction = { points: Point[]; snapshot: FetchResult; format: 'json' | 'csv' | 'xml'; locatorFor: (p: Point) => string };
/** `tolerance` is 0 (exact) unless the second extraction is a recomputation that can differ by rounding. */
export type DualExtraction = { a: Extraction; b: Extraction; labelA: string; labelB: string; tolerance?: number };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthPeriod = (year: string, month: string) => {
  const m = MONTHS.indexOf(month.trim());
  if (m < 0 || !/^\d{4}$/.test(year)) throw new Error(`unparseable month "${year} ${month}"`);
  return `${year}-${String(m + 1).padStart(2, '0')}`;
};
const num = (s: unknown) => {
  const v = typeof s === 'number' ? s : Number(String(s).trim());
  if (!Number.isFinite(v)) throw new Error(`non-numeric value "${String(s)}"`);
  return v;
};

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const MOSPI = { allowedHosts: ['api.mospi.gov.in'], legacyTlsRenegotiation: true };
type MospiJson = { data?: Record<string, unknown>[]; statusCode?: boolean; msg?: string; message?: string; error?: string };

async function mospiBoth(path: string, params: Record<string, string>): Promise<{ json: FetchResult; csv: FetchResult; rowsJ: Record<string, unknown>[]; rowsC: Record<string, string>[] }> {
  const qs = (fmt: string) => `https://api.mospi.gov.in${path}?${new URLSearchParams({ ...params, Format: fmt })}`;
  const json = await safeFetch(qs('JSON'), MOSPI);
  const parsed = JSON.parse(json.body.toString('utf8')) as MospiJson;
  // Endpoints differ: some send statusCode:true, some omit it. An error field or a missing data array is always a failure.
  if (!Array.isArray(parsed.data) || parsed.error || parsed.statusCode === false) throw new Error(`MoSPI ${path}: ${parsed.error ?? parsed.msg ?? parsed.message ?? 'unexpected response shape'}`);
  const csv = await safeFetch(qs('CSV'), MOSPI);
  return { json, csv, rowsJ: parsed.data, rowsC: parseCsv(csv.body.toString('utf8')) };
}

/** PLFS monthly unemployment rate, current weekly status, persons aged 15+, rural + urban, All India. */
export async function mospiPlfsMonthlyUR(): Promise<DualExtraction> {
  const { json, csv, rowsJ, rowsC } = await mospiBoth('/api/plfs/getData', {
    frequency_code: '3', indicator_code: '3', state_code: '99', gender_code: '3', age_code: '1', sector_code: '3', limit: '200',
  });
  const keep = (r: Record<string, unknown>) => String(r.state) === 'All India' && String(r.gender) === 'person' && String(r.sector) === 'rural + urban' && String(r.AgeGroup) === '15 years and above';
  const toPoints = (rows: Record<string, unknown>[]) => rows.filter(keep).map((r) => ({ period: monthPeriod(String(r.year), String(r.month)), value: num(r.value) }));
  const quote = (p: Point) => {
    const [y, m] = p.period.split('-');
    return `"year":"${y}","month":"${MONTHS[Number(m) - 1]}","state":"All India","AgeGroup":"15 years and above","gender":"person","sector":"rural + urban"`;
  };
  return {
    a: { points: toPoints(rowsJ), snapshot: json, format: 'json', locatorFor: quote },
    b: { points: toPoints(rowsC), snapshot: csv, format: 'csv', locatorFor: (p) => { const [y, m] = p.period.split('-'); return `${y},${MONTHS[Number(m) - 1]},All India,15 years and above,person,rural + urban,`; } },
    labelA: 'MoSPI PLFS JSON', labelB: 'MoSPI PLFS CSV',
  };
}

/**
 * CPI (base 2024=100), All India, Combined (rural + urban), General index: year-on-year inflation, %.
 * This endpoint ignores Format=CSV, so the second extraction recomputes inflation from the published index
 * values (index this month / index 12 months earlier - 1). Agreement within 0.05 points confirms both the
 * published rate and the index it is based on.
 */
export async function mospiCpiInflation(): Promise<DualExtraction> {
  const params = { base_year: '2024', series: 'Current', division_code: '0', sector_code: '3', state_code: '1', limit: '100', Format: 'JSON' }; // state_code 1 = All India in the 2024 series (99 in PLFS)
  const json = await safeFetch(`https://api.mospi.gov.in/api/cpi/getCPIData?${new URLSearchParams(params)}`, MOSPI);
  const parsed = JSON.parse(json.body.toString('utf8')) as MospiJson;
  if (!Array.isArray(parsed.data) || parsed.error || parsed.statusCode === false) throw new Error(`MoSPI CPI: ${parsed.error ?? parsed.msg ?? 'unexpected response shape'}`);
  const rows = parsed.data.filter((r) => String(r.state) === 'All India' && String(r.sector) === 'Combined' && String(r.division) === 'CPI (General)');
  const published = rows.filter((r) => r.inflation !== null && String(r.inflation) !== '').map((r) => ({ period: monthPeriod(String(r.year), String(r.month)), value: num(r.inflation) }));
  const index = new Map(rows.map((r) => [monthPeriod(String(r.year), String(r.month)), num(r.index)]));
  const derived = published.flatMap((p) => {
    const [y, m] = p.period.split('-');
    const base = index.get(`${Number(y) - 1}-${m}`), cur = index.get(p.period);
    return base && cur ? [{ period: p.period, value: Math.round((cur / base - 1) * 10000) / 100 }] : [];
  });
  const locatorFor = (p: Point) => { const [y, m] = p.period.split('-'); return `"year":"${y}","month":"${MONTHS[Number(m) - 1]}","state":"All India","sector":"Combined","division":"CPI (General)"`; };
  return {
    a: { points: published, snapshot: json, format: 'json', locatorFor },
    b: { points: derived, snapshot: json, format: 'json', locatorFor },
    labelA: 'MoSPI CPI published rate', labelB: 'rate recomputed from MoSPI index values', tolerance: 0.05,
  };
}

const WB = { allowedHosts: ['api.worldbank.org'] };

/** World Bank WDI indicator for India, parsed from the JSON and the XML representation independently. */
export async function worldBank(code: string): Promise<DualExtraction> {
  const base = `https://api.worldbank.org/v2/country/IND/indicator/${encodeURIComponent(code)}?per_page=100`;
  const json = await safeFetch(`${base}&format=json`, WB);
  const parsed = JSON.parse(json.body.toString('utf8')) as [unknown, { date: string; value: number | null; indicator: { id: string } }[] | null];
  if (!Array.isArray(parsed) || !Array.isArray(parsed[1])) throw new Error(`World Bank ${code}: unexpected JSON shape`);
  const a = parsed[1].filter((r) => r.indicator.id === code && r.value !== null).map((r) => ({ period: r.date, value: Math.round(num(r.value) * 1000) / 1000 }));
  const xml = await safeFetch(base, WB);
  const text = xml.body.toString('utf8');
  if (!text.includes('<wb:data')) throw new Error(`World Bank ${code}: XML response missing <wb:data>`);
  const b: Point[] = [];
  for (const m of text.matchAll(/<wb:data>([\s\S]*?)<\/wb:data>/g)) {
    const date = /<wb:date>(\d{4})<\/wb:date>/.exec(m[1])?.[1];
    const val = /<wb:value>([^<]+)<\/wb:value>/.exec(m[1])?.[1];
    if (date && val) b.push({ period: date, value: Math.round(num(val) * 1000) / 1000 });
  }
  return {
    a: { points: a, snapshot: json, format: 'json', locatorFor: (p) => `"date":"${p.period}"` },
    b: { points: b, snapshot: xml, format: 'xml', locatorFor: (p) => `<wb:date>${p.period}</wb:date>` },
    labelA: 'World Bank JSON', labelB: 'World Bank XML',
  };
}

/** IMF DataMapper series for India. Used only as a cross-check; excludes years after `lastActualYear` (projections). */
export async function imf(code: string, lastActualYear: number): Promise<Point[]> {
  const r = await safeFetch(`https://www.imf.org/external/datamapper/api/v1/${encodeURIComponent(code)}/IND`, { allowedHosts: ['www.imf.org'] });
  const parsed = JSON.parse(r.body.toString('utf8')) as { values?: Record<string, Record<string, Record<string, number>>> };
  const series = parsed.values?.[code]?.IND;
  if (!series) throw new Error(`IMF ${code}: no India series in response`);
  return Object.entries(series).filter(([y]) => Number(y) <= lastActualYear).map(([y, v]) => ({ period: y, value: num(v) }));
}
