// Claim checking: compare a number someone has stated with the verified official figure.
// Pure functions, no I/O. The result describes the number, never the person who stated it (G7).

export type ClaimPoint = {
  period: string; // the record's own period key, e.g. "2026-08" or "2026-27 BE"
  label: string; // display label for the period
  value: number | null; // null where the source prints ".." (not applicable)
  revisions: { value: number; supersededAt: string }[];
  url: string;
};

export type ClaimSeries = {
  id: string;
  label: string;
  unit: string;
  decimals: number; // precision the source publishes
  href: string; // page on this site with the full record and evidence
  source: string;
  points: ClaimPoint[];
};

export type Verdict =
  | { kind: 'consistent'; official: number; diff: number; relPct: number | null; tolerance: number }
  | { kind: 'earlier'; official: number; earlier: number; supersededAt: string; diff: number; relPct: number | null; tolerance: number }
  | { kind: 'differs'; official: number; diff: number; relPct: number | null; tolerance: number }
  | { kind: 'not-applicable' };

/**
 * Parse a typed number. Accepts Indian or Western digit grouping ("5,20,000" or "520,000"),
 * Devanagari digits, a leading sign, and a trailing "%". Returns the value and the decimals typed.
 */
export function parseClaim(input: string): { value: number; decimals: number } | null {
  const s = input
    .trim()
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966))
    .replace(/[−–]/g, '-')
    .replace(/%$/, '')
    .replace(/\s/g, '');
  if (!/^[-+]?(\d{1,3}(,\d{2,3})*|\d+)(\.\d+)?$/.test(s)) return null;
  const clean = s.replace(/,/g, '');
  const value = Number(clean);
  if (!Number.isFinite(value)) return null;
  const decimals = clean.includes('.') ? clean.split('.')[1].length : 0;
  return { value, decimals };
}

/** Half of one unit in the last place: the widest gap that rounding alone can explain. */
export const halfUnit = (decimals: number) => 0.5 * 10 ** -decimals;

/**
 * Compare a claimed value with an official one. Rounding is allowed for whichever of the two is less precise.
 * `scale` converts the claim's unit to the record's unit (e.g. 1e5 for "lakh crore" against "₹ crore").
 */
export function compareClaim(claim: { value: number; decimals: number }, point: ClaimPoint, officialDecimals: number, scale = 1): Verdict {
  if (point.value === null) return { kind: 'not-applicable' };
  const claimed = claim.value * scale;
  const tolerance = Math.max(halfUnit(claim.decimals) * scale, halfUnit(officialDecimals));
  // Floating-point slack so that 4.85 vs 4.8 (tolerance 0.05) counts as within rounding.
  const within = (a: number, b: number) => Math.abs(a - b) <= tolerance * (1 + 1e-9);
  const rel = (official: number) => (official === 0 ? null : ((claimed - official) / Math.abs(official)) * 100);
  const official = point.value;
  if (within(claimed, official)) return { kind: 'consistent', official, diff: claimed - official, relPct: rel(official), tolerance };
  for (const r of [...point.revisions].reverse()) {
    if (within(claimed, r.value)) return { kind: 'earlier', official, earlier: r.value, supersededAt: r.supersededAt, diff: claimed - official, relPct: rel(official), tolerance };
  }
  return { kind: 'differs', official, diff: claimed - official, relPct: rel(official), tolerance };
}
