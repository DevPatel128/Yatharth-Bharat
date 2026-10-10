// The Brutal Gate. Every check returns a GateResult; a record publishes only when every result is "pass".
// Each gate is a pure function so it can be tested with failing fixtures (test/gates.test.ts).
// Rules and thresholds: docs/DATA_INGESTION.md.

export type GateId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8';
export type GateResult = { gate: GateId; status: 'pass' | 'fail' | 'pending'; detail: string };

const pass = (gate: GateId, detail: string): GateResult => ({ gate, status: 'pass', detail });
const fail = (gate: GateId, detail: string): GateResult => ({ gate, status: 'fail', detail });
export const pending = (gate: GateId, detail: string): GateResult => ({ gate, status: 'pending', detail });

/** G1 Provenance: the bytes came from an allowlisted HTTPS host, with the expected content type. */
export function g1Provenance(r: { finalUrl: string; contentType: string; body: Buffer }, allowedHosts: string[], expect: 'json' | 'csv' | 'xml' | 'html'): GateResult {
  const u = new URL(r.finalUrl);
  if (u.protocol !== 'https:') return fail('G1', `not HTTPS: ${r.finalUrl}`);
  if (!allowedHosts.includes(u.hostname)) return fail('G1', `final host ${u.hostname} not allowlisted`);
  if (r.body.length === 0) return fail('G1', 'empty response body');
  const head = r.body.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  // A government server often answers errors with an HTML page and status 200. Catch that here.
  if (expect !== 'html' && (head.startsWith('<!doctype html') || head.startsWith('<html'))) return fail('G1', `expected ${expect}, received an HTML page`);
  if (expect === 'json' && !(head.startsWith('{') || head.startsWith('['))) return fail('G1', 'expected JSON, body does not start with { or [');
  return pass('G1', `${u.hostname}, ${r.body.length} bytes, ${r.contentType || 'no content-type'}`);
}

export type Point = { period: string; value: number };

/** G2 Sanity: periods well-formed and unique, values finite and inside the indicator's plausible range. */
export function g2Sanity(points: Point[], rule: { min: number; max: number; periodPattern: RegExp; minPoints?: number }): GateResult {
  if (points.length < (rule.minPoints ?? 1)) return fail('G2', `only ${points.length} observations, expected at least ${rule.minPoints ?? 1}`);
  const seen = new Set<string>();
  for (const p of points) {
    if (!rule.periodPattern.test(p.period)) return fail('G2', `malformed period "${p.period}"`);
    if (seen.has(p.period)) return fail('G2', `duplicate period ${p.period}`);
    seen.add(p.period);
    if (!Number.isFinite(p.value)) return fail('G2', `non-numeric value for ${p.period}`);
    if (p.value < rule.min || p.value > rule.max) return fail('G2', `${p.period} = ${p.value} outside plausible range [${rule.min}, ${rule.max}]`);
  }
  return pass('G2', `${points.length} observations, all within [${rule.min}, ${rule.max}]`);
}

/** G3 Dual extraction: two independent parses (e.g. JSON and CSV of the same source) must agree exactly. */
export function g3Dual(a: Point[], b: Point[], label: string, tolerance = 0): GateResult {
  const key = (ps: Point[]) => new Map(ps.map((p) => [p.period, p.value]));
  const ma = key(a), mb = key(b);
  if (ma.size !== mb.size) return fail('G3', `${label}: ${ma.size} vs ${mb.size} observations`);
  for (const [period, v] of ma) {
    const w = mb.get(period);
    if (w === undefined) return fail('G3', `${label}: period ${period} missing from second extraction`);
    if (Math.abs(v - w) > tolerance) return fail('G3', `${label}: ${period} is ${v} in one extraction and ${w} in the other`);
  }
  return pass('G3', `${label}: ${ma.size} observations ${tolerance ? `agree within ${tolerance}` : 'identical'} across both extractions`);
}

const squash = (s: string) => s.replace(/[‌‍]/g, '').replace(/\s+/g, ' ').trim();

/** G4 Quote anchoring: the quoted evidence must literally exist in the stored snapshot. Kills invented citations. */
export function g4Quote(quote: string, snapshot: string): GateResult {
  if (!quote.trim()) return fail('G4', 'empty quote');
  return squash(snapshot).includes(squash(quote)) ? pass('G4', `quote found in snapshot (${quote.length} chars)`) : fail('G4', `quote not found in snapshot: "${quote.slice(0, 80)}"`);
}

/**
 * G5 Cross-check.
 * (a) Against the last verified value for the same period: a change beyond `maxRevision` is held for investigation.
 * (b) Against a second independent source for the same period: disagreement beyond `tolerance` is held,
 *     unless the indicator documents why the two sources legitimately differ (`explainedDivergence`).
 */
export function g5Cross(
  next: Point[],
  opts: {
    previous?: Point[];
    maxRevision: number;
    second?: { label: string; points: Point[]; tolerance: number; explainedDivergence?: string };
    /** Why no second official source exists for this indicator. Allows a first (baseline) ingestion only. */
    noSecondSourceReason?: string;
  },
): GateResult {
  const notes: string[] = [];
  if (opts.previous) {
    const prev = new Map(opts.previous.map((p) => [p.period, p.value]));
    for (const p of next) {
      const old = prev.get(p.period);
      if (old !== undefined && Math.abs(old - p.value) > opts.maxRevision) return fail('G5', `${p.period} revised from ${old} to ${p.value} (limit ${opts.maxRevision}); held for investigation`);
    }
    notes.push('revisions within limit');
  }
  if (opts.second) {
    const other = new Map(opts.second.points.map((p) => [p.period, p.value]));
    let compared = 0;
    for (const p of next) {
      const o = other.get(p.period);
      if (o === undefined) continue;
      compared++;
      if (Math.abs(o - p.value) > opts.second.tolerance && !opts.second.explainedDivergence)
        return fail('G5', `${p.period}: ${p.value} here vs ${o} in ${opts.second.label} (tolerance ${opts.second.tolerance})`);
    }
    if (compared === 0) return fail('G5', `no overlapping periods with ${opts.second.label}; cannot cross-check`);
    notes.push(`${compared} periods agree with ${opts.second.label}${opts.second.explainedDivergence ? ' (documented divergence allowed)' : ''}`);
  }
  if (!notes.length && opts.noSecondSourceReason) return pass('G5', `baseline ingestion; no second source: ${opts.noSecondSourceReason}`);
  if (!notes.length) return fail('G5', 'no previous value and no second source: nothing to cross-check against');
  return pass('G5', notes.join('; '));
}

/** Words that state a judgement about a person or institution. Facts from official records do not need them. */
export const BANNED_TERMS = [
  'corrupt', 'corruption', 'scam', 'fraud', 'looted', 'liar', 'lied', 'criminal', 'traitor', 'anti-national',
  'incompetent', 'failed', 'failure', 'disaster', 'shameful', 'propaganda', 'puppet', 'mafia',
  'भ्रष्ट', 'घोटाला', 'धोखा', 'गद्दार', 'झूठा', 'नाकाम', 'विफल', 'शर्मनाक',
];
/**
 * Official proper names that contain a banned word but state no judgement (e.g. a fund named in the Budget).
 * They are removed before the lint runs; the banned words stay banned everywhere else.
 */
export const OFFICIAL_NAMES = ['state disaster response fund', 'state disaster mitigation fund', 'national disaster response fund', 'disaster management'];
export const HYPE_TERMS = ['unlock', 'empower', 'seamless', 'revolutioni', 'cutting-edge', 'ai-powered', 'supercharge', 'game-changer', "in today's world"];

/** G7 Legal-safety lint: no evaluative or accusatory language in published text. */
export function g7Legal(texts: string[]): GateResult {
  for (const t of texts) {
    let lower = t.toLowerCase();
    for (const n of OFFICIAL_NAMES) lower = lower.split(n).join(' ');
    for (const w of [...BANNED_TERMS, ...HYPE_TERMS]) {
      // Whole words only: "scam" must not match "scampi". Devanagari matras count as letters (\p{M}).
      const re = new RegExp(`(^|[^\\p{L}\\p{M}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`, 'iu');
      if (re.test(lower)) return fail('G7', `banned term "${w}" in: "${t.slice(0, 80)}"`);
    }
  }
  return pass('G7', `${texts.length} text fields clean`);
}

const NUKTA = '़';
// Letters that legitimately take a nukta in Hindi: क ख ग ज ड ढ फ य (क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़).
const NUKTA_OK = new Set(['क', 'ख', 'ग', 'ज', 'ड', 'ढ', 'फ', 'य']);

/**
 * G8 Hindi gate (deterministic part). Rejects broken Devanagari and any Hindi text whose numbers or links
 * differ from the English. The model-based back-translation check runs separately when an AI key is configured.
 */
export function g8Hindi(en: string, hi: string | null): GateResult {
  if (hi === null) return pending('G8', 'no verified Hindi text; English shown with notice');
  const h = hi.normalize('NFC');
  if (!/[ऀ-ॿ]/.test(h)) return fail('G8', 'Hindi text contains no Devanagari');
  for (let i = 0; i < h.length; i++) if (h[i] === NUKTA && !NUKTA_OK.has(h[i - 1])) return fail('G8', `stray nukta after "${h[i - 1]}" in "${h}"`);
  if (/[्]$/.test(h.trim())) return fail('G8', `text ends in a halant (likely truncated): "${h}"`);
  const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, '')).sort().join('|');
  const devToAscii = (s: string) => s.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966));
  if (nums(en) !== nums(devToAscii(h))) return fail('G8', `numbers differ between English and Hindi: [${nums(en)}] vs [${nums(devToAscii(h))}]`);
  const urls = (s: string) => (s.match(/https?:\/\/\S+/g) ?? []).sort().join('|');
  if (urls(en) !== urls(h)) return fail('G8', 'links differ between English and Hindi');
  return pass('G8', 'Devanagari well-formed; numbers and links match English');
}

export const allPass = (rs: GateResult[]) => rs.length > 0 && rs.every((r) => r.status === 'pass');
