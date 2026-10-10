// Extract plain text from a PDF (no rendering, no scripts). Throws on encrypted or unparseable files,
// which the caller records as a failed source (spec test scenario 3: "A PDF cannot be parsed").
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function pdfText(data: Uint8Array, maxPages = 2000): Promise<{ pages: string[] }> {
  const doc = await getDocument({ data, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  if (doc.numPages > maxPages) throw new Error(`PDF has ${doc.numPages} pages (limit ${maxPages})`);
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    pages.push(c.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : '') : '')).join('').replace(/[ \t]+/g, ' '));
  }
  await doc.cleanup();
  return { pages };
}
