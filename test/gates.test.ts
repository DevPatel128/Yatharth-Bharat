// Every gate has at least one failing fixture: a failed check must never turn into a publication.
import { describe, expect, it } from 'vitest';
import { allPass, g1Provenance, g2Sanity, g3Dual, g4Quote, g5Cross, g7Legal, g8Hindi, pending } from '../pipeline/gates.ts';

const res = (body: string, url = 'https://api.mospi.gov.in/x', contentType = 'application/json') => ({ finalUrl: url, contentType, body: Buffer.from(body) });
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

describe('G1 provenance', () => {
  it('accepts JSON from an allowlisted host', () => expect(g1Provenance(res('{"data":[]}'), ['api.mospi.gov.in'], 'json').status).toBe('pass'));
  it('rejects an HTML error page served with status 200 (scenario 2)', () => expect(g1Provenance(res('<!DOCTYPE html><html>Error</html>'), ['api.mospi.gov.in'], 'json').status).toBe('fail'));
  it('rejects invalid JSON-looking bodies (scenario 1)', () => expect(g1Provenance(res('Service Unavailable'), ['api.mospi.gov.in'], 'json').status).toBe('fail'));
  it('rejects a redirect that ended on another host', () => expect(g1Provenance(res('{}', 'https://evil.example/x'), ['api.mospi.gov.in'], 'json').status).toBe('fail'));
  it('rejects plain HTTP', () => expect(g1Provenance(res('{}', 'http://api.mospi.gov.in/x'), ['api.mospi.gov.in'], 'json').status).toBe('fail'));
  it('rejects an empty body', () => expect(g1Provenance(res(''), ['api.mospi.gov.in'], 'json').status).toBe('fail'));
});

describe('G2 sanity', () => {
  const rule = { min: 0, max: 30, periodPattern: MONTH, minPoints: 1 };
  it('passes clean data', () => expect(g2Sanity([{ period: '2026-08', value: 5 }], rule).status).toBe('pass'));
  it('fails duplicates (scenario: duplicate ingestion)', () => expect(g2Sanity([{ period: '2026-08', value: 5 }, { period: '2026-08', value: 5.1 }], rule).status).toBe('fail'));
  it('fails out-of-range values', () => expect(g2Sanity([{ period: '2026-08', value: 55 }], rule).status).toBe('fail'));
  it('fails malformed periods', () => expect(g2Sanity([{ period: 'Aug-26', value: 5 }], rule).status).toBe('fail'));
  it('fails NaN', () => expect(g2Sanity([{ period: '2026-08', value: Number.NaN }], rule).status).toBe('fail'));
  it('fails too few observations', () => expect(g2Sanity([], rule).status).toBe('fail'));
});

describe('G3 two independent readings', () => {
  const a = [{ period: '2026-07', value: 5.1 }, { period: '2026-08', value: 5 }];
  it('passes identical readings', () => expect(g3Dual(a, [...a], 't').status).toBe('pass'));
  it('fails when one value differs', () => expect(g3Dual(a, [a[0], { period: '2026-08', value: 5.2 }], 't').status).toBe('fail'));
  it('fails when a reading is missing rows', () => expect(g3Dual(a, [a[0]], 't').status).toBe('fail'));
  it('allows a declared rounding tolerance only', () => {
    expect(g3Dual(a, [{ period: '2026-07', value: 5.13 }, { period: '2026-08', value: 5 }], 't', 0.05).status).toBe('pass');
    expect(g3Dual(a, [{ period: '2026-07', value: 5.3 }, { period: '2026-08', value: 5 }], 't', 0.05).status).toBe('fail');
  });
});

describe('G4 quote anchoring', () => {
  it('passes a quote present in the snapshot', () => expect(g4Quote('"value":"5.1"', '{"a":1,"value":"5.1"}').status).toBe('pass'));
  it('fails a fabricated citation (scenario 8)', () => expect(g4Quote('"value":"6.0"', '{"value":"5.1"}').status).toBe('fail'));
  it('ignores zero-width joiners and whitespace differences', () => expect(g4Quote('मध्य प्रदेश', 'मध्‍य  प्रदेश').status).toBe('pass'));
});

describe('G5 cross-check', () => {
  const next = [{ period: '2025', value: 7.5 }];
  it('holds a large unexplained revision (scenario 11)', () => expect(g5Cross(next, { previous: [{ period: '2025', value: 5 }], maxRevision: 1 }).status).toBe('fail'));
  it('passes a small revision (scenario 4)', () => expect(g5Cross(next, { previous: [{ period: '2025', value: 7.3 }], maxRevision: 1 }).status).toBe('pass'));
  it('holds when two sources disagree (scenario 6)', () => expect(g5Cross(next, { maxRevision: 1, second: { label: 'IMF', points: [{ period: '2025', value: 4 }], tolerance: 1 } }).status).toBe('fail'));
  it('passes documented divergence', () => expect(g5Cross(next, { maxRevision: 1, second: { label: 'IMF', points: [{ period: '2025', value: 4 }], tolerance: 1, explainedDivergence: 'different fiscal-year basis' } }).status).toBe('pass'));
  it('fails when the second source has no overlapping period', () => expect(g5Cross(next, { maxRevision: 1, second: { label: 'IMF', points: [{ period: '2010', value: 4 }], tolerance: 1 } }).status).toBe('fail'));
  it('fails with nothing to compare and no documented reason', () => expect(g5Cross(next, { maxRevision: 1 }).status).toBe('fail'));
  it('allows a documented baseline only on first ingestion', () => expect(g5Cross(next, { maxRevision: 1, noSecondSourceReason: 'only official source' }).status).toBe('pass'));
});

describe('G7 neutral language', () => {
  it('passes neutral text', () => expect(g7Legal(['Unemployment rate, persons aged 15+']).status).toBe('pass'));
  it('fails accusatory English', () => expect(g7Legal(['The minister is corrupt']).status).toBe('fail'));
  it('fails accusatory Hindi', () => expect(g7Legal(['यह योजना एक घोटाला है']).status).toBe('fail'));
  it('fails promotional hype', () => expect(g7Legal(['Unlock insights seamlessly']).status).toBe('fail'));
  it('does not flag words that merely contain a banned term', () => expect(g7Legal(['Scampi exports']).status).toBe('pass'));
});

describe('G8 Hindi', () => {
  it('passes matching numbers', () => expect(g8Hindi('Base year 2024=100', 'आधार वर्ष 2024=100').status).toBe('pass'));
  it('fails when a number differs', () => expect(g8Hindi('Base year 2024=100', 'आधार वर्ष 2012=100').status).toBe('fail'));
  it('treats Devanagari digits as their values', () => expect(g8Hindi('2024', 'वर्ष २०२४').status).toBe('pass'));
  it('fails a stray nukta (real Lok Sabha data: ल़द्दाख)', () => expect(g8Hindi('Ladakh', 'ल़द्दाख').status).toBe('fail'));
  it('fails text with no Devanagari', () => expect(g8Hindi('Kerala', 'Kerala').status).toBe('fail'));
  it('is pending, not passing, when Hindi is missing', () => expect(g8Hindi('Ladakh', null).status).toBe('pending'));
});

it('allPass needs every gate to pass; pending is not a pass', () => {
  expect(allPass([{ gate: 'G1', status: 'pass', detail: '' }, pending('G6', 'no key')])).toBe(false);
  expect(allPass([])).toBe(false);
});
