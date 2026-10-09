// Daily ingestion run. Usage: node pipeline/run.ts [--only=<indicator-id>]
// Fetch → G1–G8 → merge (revisions preserved) → write records → write a machine-readable run report and a
// human-readable PR body. A failing record is held: its last verified version stays exactly as it was.
// Safe to re-run: the same inputs produce the same records (only verification timestamps move).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Indicator, type Evidence, type Observation } from '../src/lib/schema.ts';
import { getSource } from '../src/lib/sources.ts';
import { askAI, AiUnconfigured, parseVerdict, REVIEW_SYSTEM } from '../src/lib/ai.ts';
import { INDICATORS, type IndicatorDef } from './indicators.ts';
import { allPass, g1Provenance, g2Sanity, g3Dual, g4Quote, g5Cross, g7Legal, g8Hindi, pending, type GateResult, type Point } from './gates.ts';
import { enclosingRecord, quoteContainsValue } from './anchor.ts';
import type { DualExtraction } from './adapters.ts';

const ROOT = new URL('../', import.meta.url);
const recordPath = (id: string) => new URL(`data/records/indicators/${id}.json`, ROOT);
// Production sets REQUIRE_AI_GATES=true: nothing publishes until G6 and the AI half of G8 have actually run.
const REQUIRE_AI = process.env.REQUIRE_AI_GATES === 'true';

type Outcome = {
  id: string;
  result: 'published' | 'unchanged' | 'held' | 'source-failed';
  gates: GateResult[];
  added: string[];
  revised: { period: string; from: number; to: number }[];
  error?: string;
};

function load(id: string): Indicator | null {
  const p = recordPath(id);
  return existsSync(p) ? Indicator.parse(JSON.parse(readFileSync(p, 'utf8'))) : null;
}

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

async function adversarial(def: IndicatorDef, ex: DualExtraction, latest: Point[]): Promise<GateResult> {
  const doc = ex.a.snapshot.body.toString('utf8').slice(0, 60_000);
  const record = { indicator: def.name.en, definition: def.definition.en, unit: def.unit.en, source: getSource(def.sourceId).publisher, sourceCategory: getSource(def.sourceId).category, values: latest };
  try {
    const v = parseVerdict(await askAI('adversarial-review', REVIEW_SYSTEM, `<document>\n${doc}\n</document>\n\n<record>\n${JSON.stringify(record)}\n</record>`));
    return v.ok ? { gate: 'G6', status: 'pass', detail: 'adversarial review found no problem' } : { gate: 'G6', status: 'fail', detail: v.problems.join('; ') };
  } catch (e) {
    if (e instanceof AiUnconfigured) return pending('G6', 'AI review not configured (ANTHROPIC_API_KEY missing)');
    return { gate: 'G6', status: 'fail', detail: `AI review error: ${(e as Error).message}` };
  }
}

async function processIndicator(def: IndicatorDef, now: string): Promise<Outcome> {
  const source = getSource(def.sourceId);
  const existing = load(def.id);
  let ex: DualExtraction;
  try {
    ex = await def.extract();
  } catch (e) {
    // Source failure: keep the last verified record untouched except for marking it stale.
    if (existing) writeFileSync(recordPath(def.id), JSON.stringify({ ...existing, state: 'stale' }, null, 2) + '\n');
    return { id: def.id, result: 'source-failed', gates: [], added: [], revised: [], error: (e as Error).message };
  }

  const pts = [...ex.a.points].sort((x, y) => x.period.localeCompare(y.period)).slice(-def.keep);
  const gates: GateResult[] = [
    g1Provenance(ex.a.snapshot, source.allowedHosts, ex.a.format),
    g1Provenance(ex.b.snapshot, source.allowedHosts, ex.b.format),
    g2Sanity(pts, def.sanity),
    g3Dual(ex.a.points, ex.b.points, `${ex.labelA} vs ${ex.labelB}`, ex.tolerance),
  ];

  const prev = new Map((existing?.observations ?? []).map((o) => [o.period, o]));
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
  if (def.cross) {
    try {
      second = { label: def.cross.label, points: await def.cross.fetch(), tolerance: def.cross.tolerance, explainedDivergence: def.cross.explainedDivergence };
    } catch (e) {
      gates.push({ gate: 'G5', status: 'fail', detail: `cross-check source failed: ${(e as Error).message}` });
    }
  }
  if (!gates.some((g) => g.gate === 'G5'))
    gates.push(g5Cross(pts, { previous: existing?.observations.map((o) => ({ period: o.period, value: o.value })), maxRevision: def.maxRevision, second, noSecondSourceReason: def.noSecondSourceReason }));

  const texts = [def.name, def.definition, def.unit, def.methodology, def.limitations];
  gates.push(g7Legal(texts.flatMap((t) => [t.en, t.hi ?? ''])));
  for (const t of texts) {
    const r = g8Hindi(t.en, t.hi);
    if (r.status !== 'pass') { gates.push(r); break; }
  }
  if (!gates.some((g) => g.gate === 'G8')) gates.push({ gate: 'G8', status: 'pass', detail: 'deterministic Hindi checks passed for all fields' });
  gates.push(await adversarial(def, ex, pts.slice(-6)));

  const aiPendingOnly = gates.every((g) => g.status === 'pass' || (g.status === 'pending' && (g.gate === 'G6' || g.gate === 'G8')));
  const ok = allPass(gates) || (!REQUIRE_AI && aiPendingOnly);
  if (!ok) return { id: def.id, result: 'held', gates, added: [], revised: [] };

  const added: string[] = [];
  const revised: Outcome['revised'] = [];
  const merged = new Map(prev);
  for (const p of pts) {
    const old = prev.get(p.period);
    const ev = evidence.get(p.period);
    if (!old) {
      if (!ev) continue;
      added.push(p.period);
      merged.set(p.period, { period: p.period, value: p.value, status: 'unknown', series: def.series, publishedAt: null, evidence: [ev], revisions: [] } satisfies Observation);
    } else if (old.value !== p.value && ev) {
      revised.push({ period: p.period, from: old.value, to: p.value });
      merged.set(p.period, { ...old, value: p.value, status: 'revised', evidence: [ev], revisions: [...old.revisions, { value: old.value, supersededAt: now, evidence: old.evidence }] });
    }
  }
  const { extract, sanity, maxRevision, series, cross, noSecondSourceReason, keep, ...meta } = def;
  void extract; void sanity; void maxRevision; void series; void cross; void noSecondSourceReason;
  const record = Indicator.parse({
    ...meta,
    observations: [...merged.values()].sort((x, y) => x.period.localeCompare(y.period)).slice(-keep),
    lastVerifiedAt: now,
    state: 'verified',
  });
  writeFileSync(recordPath(def.id), JSON.stringify(record, null, 2) + '\n');
  return { id: def.id, result: added.length || revised.length ? 'published' : 'unchanged', gates, added, revised };
}

function report(outcomes: Outcome[], now: string): string {
  const line = (o: Outcome) => `| \`${o.id}\` | ${o.result} | ${o.added.length} | ${o.revised.map((r) => `${r.period}: ${r.from} → ${r.to}`).join('<br>') || '—'} | ${o.error ?? (o.gates.filter((g) => g.status !== 'pass').map((g) => `${g.gate} ${g.status}: ${g.detail}`).join('<br>') || 'all gates passed')} |`;
  return [
    `## Data update ${now.slice(0, 10)}`,
    '',
    `Run at ${now}. AI gates required: ${REQUIRE_AI ? 'yes' : 'no (local mode)'}.`,
    '',
    '| Indicator | Result | Added | Revised | Gate notes |',
    '|---|---|---|---|---|',
    ...outcomes.map(line),
    '',
    'Held and failed items keep their last verified values on the site. Sources and gate rules: `docs/DATA_INGESTION.md`.',
  ].join('\n');
}

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const now = new Date().toISOString();
mkdirSync(new URL('data/records/indicators/', ROOT), { recursive: true });
mkdirSync(new URL('data/runs/', ROOT), { recursive: true });
const outcomes: Outcome[] = [];
for (const def of INDICATORS.filter((d) => !only || d.id === only)) {
  const o = await processIndicator(def, now);
  outcomes.push(o);
  console.log(`${o.id}: ${o.result}${o.error ? ` (${o.error})` : ''}`);
}
writeFileSync(new URL(`data/runs/latest.json`, ROOT), JSON.stringify({ ranAt: now, requireAi: REQUIRE_AI, outcomes }, null, 2) + '\n');
writeFileSync(new URL(`data/runs/latest.md`, ROOT), report(outcomes, now) + '\n');
if (outcomes.some((o) => o.result === 'source-failed' || o.result === 'held')) process.exitCode = 2; // reported, never silent
