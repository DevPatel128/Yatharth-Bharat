// Parser for the National Portal of India states/UTs page (manual capture).
import type { Region } from '../src/lib/schema.ts';

export type PortalEntry = { code: string; name: string; kind: Region['kind']; capital: string; block: string };

/** Parse the portal text into entries. Throws unless it finds exactly 28 states and 8 Union Territories. */
export function parsePortal(text: string): PortalEntry[] {
  const utAt = text.indexOf('Union Territories (UTs)');
  if (utAt < 0) throw new Error('portal snapshot: "Union Territories (UTs)" heading not found');
  const out: PortalEntry[] = [];
  for (const m of text.matchAll(/\n([A-Z]{2})\n([^\n]+)\n\nCapital :\n([^\n]+)\n/g)) {
    const kind = m.index! > utAt ? 'union-territory' : 'state';
    const name = m[2].replace(/ \((UT|NCT)\)$/, '').trim();
    out.push({ code: m[1], name, kind, capital: m[3].trim(), block: m[0].trim() });
  }
  const states = out.filter((e) => e.kind === 'state').length, uts = out.length - states;
  if (states !== 28 || uts !== 8) throw new Error(`portal snapshot: expected 28 states and 8 UTs, found ${states} and ${uts}`);
  return out;
}

