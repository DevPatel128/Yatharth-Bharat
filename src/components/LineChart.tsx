import { fmtNumber, fmtPeriod, type Lang } from '@/lib/i18n';
import type { Observation } from '@/lib/schema';

/**
 * Server-rendered SVG line chart. The y-axis spans the data with padding and always labels its range,
 * so small changes are not exaggerated without the reader seeing the scale. Values from different series
 * are drawn as separate lines, never joined.
 */
export function LineChart({ points, lang, decimals, unit, label, height = 180 }: { points: Observation[]; lang: Lang; decimals: number; unit: string; label: string; height?: number }) {
  if (points.length < 2) return null;
  const W = 640, H = height, L = 48, R = 12, T = 12, B = 28;
  const vals = points.map((p) => p.value);
  const { lo, hi, ticks } = niceScale(Math.min(...vals), Math.max(...vals));
  const x = (i: number) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const segments: { d: string; key: string }[] = [];
  let cur = '', series = points[0].series;
  points.forEach((p, i) => {
    if (p.series !== series) { segments.push({ d: cur, key: series }); cur = ''; series = p.series; }
    cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  segments.push({ d: cur, key: series });
  const last = points[points.length - 1];
  return (
    <figure className="my-4">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full h-auto">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-muted)" className="num">{fmtNumber(t, lang, Math.min(decimals, stepDecimals(ticks)))}</text>
          </g>
        ))}
        <text x={L} y={H - 8} fontSize="11" fill="var(--ink-muted)">{fmtPeriod(points[0].period, lang)}</text>
        <text x={W - R} y={H - 8} fontSize="11" fill="var(--ink-muted)" textAnchor="end">{fmtPeriod(last.period, lang)}</text>
        {segments.map((s) => <path key={s.key} d={s.d} pathLength={1} className="chart-line" fill="none" stroke="var(--peacock)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill="var(--sindoor)" />
      </svg>
      <figcaption className="text-xs text-ink-muted mt-1">{unit}</figcaption>
    </figure>
  );
}

/** Round tick values (1, 2 or 5 × 10^n) that enclose the data; never below zero for non-negative data. */
export function niceScale(min: number, max: number) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  let lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  if (min >= 0 && lo < 0) lo = 0;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Number(t.toFixed(10)));
  return { lo, hi: hi === lo ? lo + step : hi, ticks };
}

function stepDecimals(ticks: number[]) {
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
  return Math.max(0, -Math.floor(Math.log10(step)));
}
