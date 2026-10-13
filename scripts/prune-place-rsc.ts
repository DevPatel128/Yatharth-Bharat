// After `next build`: district and city pages (out/<lang>/states/<state>/<district>[/<city>]) are served as plain
// HTML. Every link to them is an ordinary <a>, so the client-navigation data Next writes beside each page (.txt and
// __next.* files) is never requested. Removing it keeps the deploy under Cloudflare's 20,000-file limit and avoids
// shipping every map three more times. Fails if the output is still over the limit.
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../out/', import.meta.url));
const LIMIT = 20_000;
let removed = 0;

function walk(dir: string, depth: number) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, depth + 1); continue; }
    // depth 0 = out/<lang>/states/<state>/ ; anything deeper belongs to district or city pages.
    const placeData = name.endsWith('.txt') && (depth >= 1 || !name.startsWith('__next.'));
    if (placeData) { rmSync(p); removed++; }
  }
}
for (const lang of ['en', 'hi']) {
  const states = join(OUT, lang, 'states');
  for (const state of readdirSync(states)) {
    const dir = join(states, state);
    if (statSync(dir).isDirectory()) walk(dir, 0);
  }
}
const count = (dir: string): number => readdirSync(dir).reduce((n, f) => n + (statSync(join(dir, f)).isDirectory() ? count(join(dir, f)) : 1), 0);
const total = count(OUT);
console.log(`prune: removed ${removed} client-navigation files under district and city pages; ${total} files in out/`);
if (total > LIMIT) { console.error(`out/ has ${total} files, over the ${LIMIT}-file deploy limit`); process.exit(1); }
