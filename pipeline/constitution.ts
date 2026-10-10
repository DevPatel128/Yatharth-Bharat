// Snapshot the official Constitution of India (Legislative Department, diglot edition "as on 1st May, 2026"),
// verify the PDF hash, extract the English text and store it for quote anchoring of explainers (G4 in CI).
// Usage: node pipeline/constitution.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { safeFetch } from './lib/safe-fetch.ts';
import { pdfText } from './lib/pdf-text.ts';

const ROOT = new URL('../', import.meta.url);

export const COI = {
  url: 'https://www.legislative.gov.in/static/uploads/2025/07/c9fe9c9b6840524844316f74bb1c556c.pdf',
  sha256: '4c8e93689ec245e26db08e22b5ff3ad645c98736f0e5b7c8b6638acd7861f85b',
  edition: 'The Constitution of India [As on 1st May, 2026], diglot edition, Legislative Department',
};

// The server answers the identified pipeline bot with HTTP 403, and we do not disguise the bot.
// So a manual download placed in data/manual-inbox/ is used when present (method: manual-download).
const LOCAL = new URL('data/manual-inbox/constitution/coi-2026-05-01.pdf', ROOT);
const r = existsSync(LOCAL)
  ? (() => { const body = readFileSync(LOCAL); return { body, sha256: createHash('sha256').update(body).digest('hex'), retrievedAt: '2026-10-10T00:00:00Z (manual download; see SOURCE.txt)' }; })()
  : await safeFetch(COI.url, { allowedHosts: ['www.legislative.gov.in'], maxBytes: 30 * 1024 * 1024, timeoutMs: 120_000 });
if (r.sha256 !== COI.sha256) throw new Error(`Constitution PDF changed: sha256 ${r.sha256} (pinned ${COI.sha256}). Review the new edition before updating the pin.`);
const { pages } = await pdfText(new Uint8Array(r.body));
// Keep the English lines; the Hindi half of the diglot edition does not extract reliably (font mapping).
const english = pages.join('\n').split('\n').filter((l) => l && [...l].filter((c) => c.charCodeAt(0) < 128).length / l.length > 0.9).join('\n');
if (!english.includes('WE, THE PEOPLE OF INDIA')) throw new Error('extracted text is missing the Preamble; extraction failed');
mkdirSync(new URL('data/snapshots/constitution/', ROOT), { recursive: true });
writeFileSync(new URL('data/snapshots/constitution/coi-en.txt', ROOT), `# ${COI.edition}\n# Source: ${COI.url}\n# PDF SHA-256: ${COI.sha256}\n# Retrieved: ${r.retrievedAt}\n# English lines extracted from the PDF text layer, unedited.\n\n${english}\n`);
console.log(`constitution: ${pages.length} pages, ${english.length} chars of English text`);
