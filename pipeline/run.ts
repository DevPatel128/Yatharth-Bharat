// Daily ingestion run. Usage: node pipeline/run.ts [--only=<indicator-id>]
// Fetch → G1–G8 → merge (revisions preserved) → write records → write a machine-readable run report and a
// human-readable PR body. A failing record is held: its last verified version stays exactly as it was.
// Safe to re-run: the same inputs produce the same records (only verification timestamps move).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Indicator } from '../src/lib/schema.ts';
import { INDICATORS, type IndicatorDef } from './indicators.ts';
import type { GateResult } from './gates.ts';
import type { DualExtraction } from './adapters.ts';
import { evaluateSeries, REQUIRE_AI } from './evaluate.ts';
import { processRegional } from './regional.ts';

const ROOT = new URL('../', import.meta.url);
const recordPath = (id: string) => new URL(`data/records/indicators/${id}.json`, ROOT);

export type Outcome = {
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

async function processIndicator(def: IndicatorDef, now: string): Promise<Outcome> {
  const existing = load(def.id);
  let ex: DualExtraction;
  try {
    ex = await def.extract();
  } catch (e) {
    // Source failure: keep the last verified record untouched except for marking it stale.
    if (existing) writeFileSync(recordPath(def.id), JSON.stringify({ ...existing, state: 'stale' }, null, 2) + '\n');
    return { id: def.id, result: 'source-failed', gates: [], added: [], revised: [], error: (e as Error).message };
  }
  const r = await evaluateSeries(def, ex, existing?.observations ?? [], now, { scope: 'All India', useCross: true });
  if (!r.ok) return { id: def.id, result: 'held', gates: r.gates, added: [], revised: [] };
  const { extract, sanity, maxRevision, series, cross, noSecondSourceReason, keep, ...meta } = def;
  void extract; void sanity; void maxRevision; void series; void cross; void noSecondSourceReason; void keep;
  const record = Indicator.parse({ ...meta, observations: r.observations, lastVerifiedAt: now, state: 'verified' });
  writeFileSync(recordPath(def.id), JSON.stringify(record, null, 2) + '\n');
  return { id: def.id, result: r.added.length || r.revised.length ? 'published' : 'unchanged', gates: r.gates, added: r.added, revised: r.revised };
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
if (!only || only === 'regional') {
  const o = await processRegional(now);
  outcomes.push(o);
  console.log(`${o.id}: ${o.result}${o.error ? ` (${o.error})` : ''} — ${o.added.length} added`);
}
writeFileSync(new URL(`data/runs/latest.json`, ROOT), JSON.stringify({ ranAt: now, requireAi: REQUIRE_AI, outcomes }, null, 2) + '\n');
writeFileSync(new URL(`data/runs/latest.md`, ROOT), report(outcomes, now) + '\n');
if (outcomes.some((o) => o.result === 'source-failed' || o.result === 'held')) process.exitCode = 2; // reported, never silent
