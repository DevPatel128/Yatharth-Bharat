// Anti-AI-slop check (PRODUCT.md "Visual direction"). Fails CI on the unchosen defaults that make a site look
// generated: decorative gradients, default indigo/purple, glows, side-stripe cards, fake pulse badges,
// placeholder names, hype copy. Usage: node scripts/lint-slop.ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RULES: [RegExp, string][] = [
  [/\bbg-gradient-to-|\bbg-linear-to-|\bfrom-(purple|violet|indigo|fuchsia)-/, 'decorative gradient'],
  [/\b(bg|text|border|from|to|ring)-(indigo|violet|purple|fuchsia)-\d{3}\b/, 'default indigo/purple palette'],
  [/\bshadow-(lg|xl|2xl)\b|drop-shadow-|box-shadow:\s*0 0 \d+px/, 'glow or heavy shadow'],
  [/\bborder-l-4\b.*\brounded|\brounded.*\bborder-l-4\b/, 'coloured side-stripe card'],
  [/\banimate-(pulse|ping|bounce)\b/, 'decorative pulse/ping/bounce animation'],
  [/\b(John Doe|Jane Doe|Acme|Lorem ipsum)\b/i, 'placeholder content'],
  [/\b(unlock|empower|seamless(ly)?|revolutioni[sz]e|cutting-edge|supercharge|game-?changer|AI-powered)\b/i, 'hype copy'],
  [/\bfont-\[?Inter\b|['"]Inter['"]/, 'default Inter font'],
];

function* files(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|css)$/.test(f)) yield p;
  }
}

const hits: string[] = [];
for (const f of files('src')) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('lint-slop: allow')) return;
    for (const [re, why] of RULES) if (re.test(line)) hits.push(`${f}:${i + 1}: ${why}: ${line.trim().slice(0, 100)}`);
  });
}
if (hits.length) { console.error(`lint:slop found ${hits.length} problem(s):\n${hits.join('\n')}`); process.exit(1); }
console.log('lint:slop: ok');
