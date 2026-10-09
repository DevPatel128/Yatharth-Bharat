import { expect, it } from 'vitest';
import { niceScale } from '../src/components/LineChart.tsx';

it('uses round ticks that enclose the data', () => {
  const s = niceScale(2.74, 4.82);
  expect(s.lo).toBeLessThanOrEqual(2.74);
  expect(s.hi).toBeGreaterThanOrEqual(4.82);
  expect(s.ticks.every((t) => Number.isInteger(t * 2))).toBe(true);
});
it('never goes below zero for non-negative data', () => expect(niceScale(0.2, 9).lo).toBe(0));
