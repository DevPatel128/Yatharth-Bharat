// Gate one series (national or one state): G1–G8, then merge into the existing observations without
// overwriting anything. Shared by run.ts (national indicators) and regional.ts (state-level series).
import type { Evidence, Observation } from '../src/lib/schema.ts';
import { getSource } from '../src/lib/sources.ts';
import { askAI, AiUnconfigured, parseVerdict, REVIEW_SYSTEM } from '../src/lib/ai.ts';
import type { IndicatorDef } from './indicators.ts';
import { allPass, g1Provenance, g2Sanity, g3Dual, g4Quote, g5Cross, g7Legal, g8Hindi, pending, type GateResult, type Point } from './gates.ts';
import { enclosingRecord, quoteContainsValue } from './anchor.ts';
import type { DualExtraction } from './adapters.ts';

// Production sets REQUIRE_AI_GATES=true: nothing publishes until G6 and the AI half of G8 have actually run.
export const REQUIRE_AI = process.env.REQUIRE_AI_GATES === 'true';

export type Evaluation = { ok: boolean; gates: GateResult[]; observations: Observation[]; added: string[]; revised: { period: string; from: number; to: number }[] };

function evidenceFor(ex: DualExtraction, p: Point, sourceId: string): { ev: Evidence | null; gate: GateResult } {
  const snap = ex.a.snapshot.body.toString('utf8');
  const quote = enclosingRecord(snap, ex.a.locatorFor(p));
  if (!quote) return { ev: null, gate: { gate: 'G4', status: 'fail', detail: `${p.period}: record not uniquely locatable in snapshot` } };
  if (!quoteContainsValue(quote, p.value)) return { ev: null, gate: { gate: 'G4', status: 'fail', detail: `${p.period}: value ${p.value} not present in its source record` } };
  const gate = g4Quote(quote, snap);
  return {
    gate,
    ev: { sourceId, url: ex.a.snapshot.finalUrl, retrievedAt: ex.a.snapshot.retrievedAt, snapshotSha256: ex.a.snapshot.sha256, quote: quote.slice(0, 2000), method: 'pipeline' },
  };
}

async function adversarial(def: IndicatorDef, ex: DualExtraction, latest: Point[], scope: string): Promise<GateResult> {
  const doc = ex.a.snapshot.body.toString('utf8').slice(0, 60_000);
  const record = { indicator: def.name.en, scope, definition: def.definition.en, unit: def.unit.en, source: getSource(def.sourceId).publisher, sourceCategory: getSource(def.sourceId).category, values: latest };
  try {
    const v = parseVerdict(await askAI('adversarial-review', REVIEW_SYSTEM, `<document>\n${doc}\n</document>\n\n<record>\n${JSON.stringify(record)}\n</record>`));
    return v.ok ? { gate: 'G6', status: 'pass', detail: 'adversarial review found no problem' } : { gate: 'G6', status: 'fail', detail: v.problems.join('; ') };
  } catch (e) {
    if (e instanceof AiUnconfigured) return pending('G6', 'AI review not configured (no OPENROUTER_API_KEY or ANTHROPIC_API_KEY)');
    return { gate: 'G6', status: 'fail', detail: `AI review error: ${(e as Error).message}` };
  }
}

export async function evaluateSeries(def: IndicatorDef, ex: DualExtraction, existing: Observation[], now: string, opts: { scope: string; useCross: boolean }): Promise<Evaluation> {
  const source = getSource(def.sourceId);
  const pts = [...ex.a.points].sort((x, y) => x.period.localeCompare(y.period)).slice(-def.keep);
  const gates: GateResult[] = [
    g1Provenance(ex.a.snapshot, source.allowedHosts, ex.a.format),
    g1Provenance(ex.b.snapshot, source.allowedHosts, ex.b.format),
    g2Sanity(pts, def.sanity),
    g3Dual(ex.a.points, ex.b.points, `${ex.labelA} vs ${ex.labelB}`, ex.tolerance),
  ];

  const prev = new Map(existing.map((o) => [o.period, o]));
  const evidence = new Map<string, Evidence>();
  for (const p of pts) {
    const old = prev.get(p.period);
    if (old && old.value === p.value) continue; // unchanged: keep its original evidence
    const { ev, gate } = evidenceFor(ex, p, def.sourceId);
    if (gate.status !== 'pass') gates.push(gate);
    if (ev) evidence.set(p.period, ev);
  }
  if (!gates.some((g) => g.gate === 'G4')) gates.push({ gate: 'G4', status: 'pass', detail: `${evidence.size} new or changed values anchored in the snapshot` });

  let second;
  if (def.cross && opts.useCross) {
    try {
      second = { label: def.cross.label, points: await def.cross.fetch(), tolerance: def.cross.tolerance, explainedDivergence: def.cross.explainedDivergence };
    } catch (e) {
      gates.push({ gate: 'G5', status: 'fail', detail: `cross-check source failed: ${(e as Error).message}` });
    }
  }
  if (!gates.some((g) => g.gate === 'G5'))
    gates.push(g5Cross(pts, { previous: existing.length ? existing.map((o) => ({ period: o.period, value: o.value })) : undefined, maxRevision: def.maxRevision, second, noSecondSourceReason: def.noSecondSourceReason }));

  const texts = [def.name, def.definition, def.unit, def.methodology, def.limitations];
  gates.push(g7Legal(texts.flatMap((t) => [t.en, t.hi ?? ''])));
  for (const t of texts) {
    const r = g8Hindi(t.en, t.hi);
    if (r.status !== 'pass') { gates.push(r); break; }
  }
  if (!gates.some((g) => g.gate === 'G8')) gates.push({ gate: 'G8', status: 'pass', detail: 'deterministic Hindi checks passed for all fields' });
  // Spend on AI review only when something would change on the site.
  gates.push(evidence.size ? await adversarial(def, ex, pts.slice(-6), opts.scope) : { gate: 'G6', status: 'pass', detail: 'no new or changed values to review' });

  const aiPendingOnly = gates.every((g) => g.status === 'pass' || (g.status === 'pending' && (g.gate === 'G6' || g.gate === 'G8')));
  const ok = allPass(gates) || (!REQUIRE_AI && aiPendingOnly);
  if (!ok) return { ok, gates, observations: existing, added: [], revised: [] };

  const added: string[] = [];
  const revised: Evaluation['revised'] = [];
  const merged = new Map(prev);
  for (const p of pts) {
    const old = prev.get(p.period);
    const ev = evidence.get(p.period);
    if (!old) {
      if (!ev) continue;
      added.push(p.period);
      merged.set(p.period, { period: p.period, value: p.value, status: 'unknown', series: def.series, publishedAt: null, evidence: [ev], revisions: [] });
    } else if (old.value !== p.value && ev) {
      revised.push({ period: p.period, from: old.value, to: p.value });
      merged.set(p.period, { ...old, value: p.value, status: 'revised', evidence: [ev], revisions: [...old.revisions, { value: old.value, supersededAt: now, evidence: old.evidence }] });
    }
  }
  return { ok, gates, observations: [...merged.values()].sort((x, y) => x.period.localeCompare(y.period)).slice(-def.keep), added, revised };
}
