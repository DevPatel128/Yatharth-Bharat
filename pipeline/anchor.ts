// Find the exact record for a value inside a raw snapshot and return it verbatim as the evidence quote.
// The quote is cut from the snapshot itself, and must contain the published value, so a citation can never
// point at text the source did not publish (G4).

/** Returns the smallest enclosing JSON object, XML <wb:data> element or CSV line that contains `locator`. */
export function enclosingRecord(snapshot: string, locator: string): string | null {
  const at = snapshot.indexOf(locator);
  if (at < 0) return null;
  if (snapshot.indexOf(locator, at + 1) >= 0) return null; // ambiguous: the locator must identify one record
  const trimmed = snapshot.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let depth = 0, start = -1;
    for (let i = at; i >= 0; i--) {
      if (snapshot[i] === '}') depth++;
      else if (snapshot[i] === '{') { if (depth === 0) { start = i; break; } depth--; }
    }
    if (start < 0) return null;
    depth = 0;
    for (let i = start; i < snapshot.length; i++) {
      if (snapshot[i] === '{') depth++;
      else if (snapshot[i] === '}' && --depth === 0) return snapshot.slice(start, i + 1);
    }
    return null;
  }
  if (trimmed.startsWith('<')) {
    const open = snapshot.lastIndexOf('<wb:data>', at), close = snapshot.indexOf('</wb:data>', at);
    return open >= 0 && close >= 0 ? snapshot.slice(open, close + '</wb:data>'.length) : null;
  }
  const lineStart = snapshot.lastIndexOf('\n', at) + 1;
  const lineEnd = snapshot.indexOf('\n', at);
  return snapshot.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).replace(/\r$/, '');
}

/** True when some number in `quote` equals `value` at the value's own precision. */
export function quoteContainsValue(quote: string, value: number): boolean {
  const decimals = (String(value).split('.')[1] ?? '').length;
  return (quote.match(/-?\d+(?:\.\d+)?/g) ?? []).some((n) => Number(Number(n).toFixed(decimals)) === value);
}
