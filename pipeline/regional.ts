// State/UT-level series. Same definitions and gates as the national indicator; one gate run per state.
// A state whose series fails is held (its previous verified series stays); other states still publish.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { RegionalIndicator, RegionsFile, type RegionalIndicator as RegionalT } from '../src/lib/schema.ts';
import { mospiCpiInflation, mospiCpiStates } from './adapters.ts';
import { INDICATORS } from './indicators.ts';
import { evaluateSeries } from './evaluate.ts';
import type { Outcome } from './run.ts';

const ROOT = new URL('../', import.meta.url);
const path = (id: string) => new URL(`data/records/regional/${id}.json`, ROOT);

/** Normalise a state name so the API's spelling ("The Dadra And Nagar Haveli And Daman And Diu", "NCT of Delhi") matches ours. */
export const normName = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/^the\s+/, '').replace(/^nct of\s+/, '').replace(/[^a-z]+/g, ' ').trim();

export async function processRegional(now: string): Promise<Outcome> {
  const id = 'cpi-inflation';
  const def = INDICATORS.find((d) => d.id === id);
  if (!def) throw new Error(`regional: no national definition for ${id}`);
  const regions = RegionsFile.parse(JSON.parse(readFileSync(new URL('data/records/geo/regions.json', ROOT), 'utf8'))).regions;
  const byName = new Map(regions.map((r) => [normName(r.name.en), r.id]));
  const existing: RegionalT = existsSync(path(id)) ? RegionalIndicator.parse(JSON.parse(readFileSync(path(id), 'utf8'))) : { schemaVersion: 1, indicatorId: id, lastVerifiedAt: null, regions: {} };
  const out: RegionalT = { ...existing, regions: { ...existing.regions } };
  const notes: Outcome['gates'] = [];
  const added: string[] = [];
  const revised: Outcome['revised'] = [];

  let codes: Map<string, string>;
  try {
    codes = await mospiCpiStates();
  } catch (e) {
    for (const k of Object.keys(out.regions)) out.regions[k] = { ...out.regions[k], state: 'stale' };
    writeFileSync(path(id), JSON.stringify(RegionalIndicator.parse(out), null, 2) + '\n');
    return { id: `${id} (states)`, result: 'source-failed', gates: [], added: [], revised: [], error: (e as Error).message };
  }
  const unmatched = [...codes.values()].filter((n) => !byName.has(normName(n)));
  if (unmatched.length) notes.push({ gate: 'G2', status: 'fail', detail: `state names not matched to regions: ${unmatched.join(', ')}` });

  let held = 0;
  for (const [code, name] of codes) {
    const regionId = byName.get(normName(name));
    if (!regionId) continue;
    try {
      const ex = await mospiCpiInflation(code, name);
      const r = await evaluateSeries(def, ex, existing.regions[regionId]?.observations ?? [], now, { scope: name, useCross: false });
      if (!r.ok) {
        held++;
        notes.push(...r.gates.filter((g) => g.status !== 'pass').map((g) => ({ ...g, detail: `${name}: ${g.detail}` })));
        continue;
      }
      out.regions[regionId] = { state: 'verified', observations: r.observations };
      added.push(...r.added.map((p) => `${regionId}:${p}`));
      revised.push(...r.revised.map((x) => ({ ...x, period: `${regionId}:${x.period}` })));
      if (r.gates.some((g) => g.status === 'pending')) notes.push(...r.gates.filter((g) => g.status === 'pending').slice(0, 1).map((g) => ({ ...g, detail: `${name}: ${g.detail}` })));
    } catch (e) {
      held++;
      if (out.regions[regionId]) out.regions[regionId] = { ...out.regions[regionId], state: 'stale' };
      notes.push({ gate: 'G1', status: 'fail', detail: `${name}: ${(e as Error).message}` });
    }
    await new Promise((res) => setTimeout(res, 250));
  }
  out.lastVerifiedAt = now;
  mkdirSync(new URL('data/records/regional/', ROOT), { recursive: true });
  writeFileSync(path(id), JSON.stringify(RegionalIndicator.parse(out), null, 2) + '\n');
  // Pending AI notes are reported once, not per state.
  const pendingNote = notes.find((n) => n.status === 'pending');
  const gates = [...notes.filter((n) => n.status !== 'pending'), ...(pendingNote ? [{ ...pendingNote, detail: `${pendingNote.detail} (all states)` }] : [])];
  return { id: `${id} (states)`, result: held || unmatched.length ? 'held' : added.length || revised.length ? 'published' : 'unchanged', gates, added, revised };
}
