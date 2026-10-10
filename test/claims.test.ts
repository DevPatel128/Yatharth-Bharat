import { describe, expect, it } from 'vitest';
import { compareClaim, parseClaim, type ClaimPoint } from '../src/lib/claims.ts';

const point = (value: number | null, revisions: ClaimPoint['revisions'] = []): ClaimPoint => ({ period: '2026-08', label: 'August 2026', value, revisions, url: 'https://example.gov.in' });

describe('parseClaim', () => {
  it('reads plain numbers and keeps the decimals typed', () => expect(parseClaim('4.80')).toEqual({ value: 4.8, decimals: 2 }));
  it('accepts Indian digit grouping', () => expect(parseClaim('50,65,345')).toEqual({ value: 5065345, decimals: 0 }));
  it('accepts Western digit grouping', () => expect(parseClaim('5,065,345')).toEqual({ value: 5065345, decimals: 0 }));
  it('accepts a trailing percent sign and spaces', () => expect(parseClaim(' 5.2 % ')).toEqual({ value: 5.2, decimals: 1 }));
  it('accepts Devanagari digits', () => expect(parseClaim('४.८')).toEqual({ value: 4.8, decimals: 1 }));
  it('accepts negative values', () => expect(parseClaim('-0.5')).toEqual({ value: -0.5, decimals: 1 }));
  it('rejects text and malformed numbers', () => {
    for (const s of ['', 'five', '4.8.1', '1,2', '12abc', '..']) expect(parseClaim(s), s).toBeNull();
  });
});

describe('compareClaim', () => {
  it('treats a rounded claim as consistent', () => expect(compareClaim({ value: 5, decimals: 0 }, point(4.87), 2).kind).toBe('consistent'));
  it('allows rounding of the less precise official figure', () => expect(compareClaim({ value: 4.87, decimals: 2 }, point(4.9), 1).kind).toBe('consistent'));
  it('flags a difference beyond rounding', () => {
    const v = compareClaim({ value: 6, decimals: 0 }, point(4.87), 2);
    expect(v.kind).toBe('differs');
    if (v.kind === 'differs') { expect(v.diff).toBeCloseTo(1.13); expect(v.relPct).toBeCloseTo(23.2, 1); }
  });
  it('recognises a figure from an earlier, since-revised release', () => {
    const v = compareClaim({ value: 3.6, decimals: 1 }, point(3.4, [{ value: 3.6, supersededAt: '2026-09-12T00:00:00Z' }]), 1);
    expect(v.kind).toBe('earlier');
  });
  it('scales lakh crore to crore', () => {
    expect(compareClaim({ value: 50.65, decimals: 2 }, point(5065345), 0, 1e5).kind).toBe('consistent');
    expect(compareClaim({ value: 51, decimals: 0 }, point(5065345), 0, 1e5).kind).toBe('consistent');
    expect(compareClaim({ value: 52, decimals: 0 }, point(5065345), 0, 1e5).kind).toBe('differs');
  });
  it('returns not-applicable where the source prints ".."', () => expect(compareClaim({ value: 1, decimals: 0 }, point(null), 0).kind).toBe('not-applicable'));
  it('has no relative difference when the official value is zero', () => {
    const v = compareClaim({ value: 1, decimals: 0 }, point(0), 0);
    expect(v.kind === 'differs' && v.relPct).toBeNull();
  });
});
