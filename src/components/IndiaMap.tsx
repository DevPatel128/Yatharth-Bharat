'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/telemetry';

export type MapRegion = { id: string; name: string; nameLang: 'en' | 'hi'; kindLabel: string; capital: string | null; capitalLang: 'en' | 'hi' };
type Shape = { id: string; d: string; bounds: [[number, number], [number, number]] };
type Labels = { hint: string; capital: string; viewDetails: string; close: string; back: string; skipMap: string };

/**
 * Interactive map of India. Paths load from one cached file (/geo/paths.json). Without JavaScript the region list below still works.
 * Select a region to zoom into it; Escape or "Back" returns to India. The selection is kept in ?region=
 * so a view can be shared. A list of the same regions sits below the map for keyboard and screen-reader users.
 */
export function IndiaMap({ regions, width, height, lang, labels }: { regions: Record<string, MapRegion>; width: number; height: number; lang: 'en' | 'hi'; labels: Labels }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ shapes: Shape[]; outline: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/geo/paths.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((g: { shapes: Shape[]; outline: string }) => { if (live) setGeo(g); }).catch(() => { /* list below the map still works */ });
    return () => { live = false; };
  }, []);
  const shapes = geo?.shapes ?? [];
  const outline = geo?.outline ?? '';
  const [intro, setIntro] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('region');
    if (id && regions[id]) setSelected(id); // eslint-disable-line react-hooks/set-state-in-effect -- sync from the URL once on load
    const stop = () => setIntro(false);
    const t = window.setTimeout(stop, 2200);
    window.addEventListener('pointerdown', stop, { once: true });
    window.addEventListener('keydown', stop, { once: true });
    return () => { window.clearTimeout(t); window.removeEventListener('pointerdown', stop); window.removeEventListener('keydown', stop); };
  }, [regions]);

  const select = useCallback((id: string | null) => {
    setSelected(id);
    if (id) track('region_selected', { id });
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('region', id); else url.searchParams.delete('region');
    window.history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') select(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select]);

  const shape = selected ? shapes.find((s) => s.id === selected) : undefined;
  let transform = 'translate(0px, 0px) scale(1)';
  if (shape) {
    const [[x0, y0], [x1, y1]] = shape.bounds;
    const k = Math.min(8, 0.8 / Math.max((x1 - x0) / width, (y1 - y0) / height));
    const tx = width / 2 - k * (x0 + x1) / 2, ty = height / 2 - k * (y0 + y1) / 2;
    transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(3)})`; // CSS units so it can transition
  }
  const r = selected ? regions[selected] : null;

  return (
    <div className="relative">
      <a href="#region-list" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-ink focus:text-paper focus:px-3 focus:py-1.5 focus:rounded-[var(--radius-control)]">{labels.skipMap}</a>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className={`w-full h-auto max-h-[78vh] ${intro ? 'map-intro' : ''}`} aria-describedby="map-hint">
        <g className="map-zoom" style={{ transform, transformOrigin: '0 0' }}>
          {shapes.map((s, i) => {
            const reg = regions[s.id];
            return (
              <path
                key={s.id}
                d={s.d}
                className="map-state"
                style={{ ['--i' as string]: i }}
                role="button"
                tabIndex={0}
                aria-label={`${reg.name}, ${reg.kindLabel}`}
                aria-pressed={selected === s.id}
                onClick={() => select(selected === s.id ? null : s.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(selected === s.id ? null : s.id); } }}
              />
            );
          })}
          {outline && <path d={outline} className="map-outline" pathLength={1} aria-hidden="true" />}
        </g>
      </svg>
      <p id="map-hint" className="sr-only">{labels.hint}</p>
      <div aria-live="polite" className="min-h-[7.5rem]">
        {r && (
          <div className="reveal mt-3 border border-rule rounded-[var(--radius-card)] bg-paper-raised p-4 sm:absolute sm:top-2 sm:right-2 sm:mt-0 sm:w-72">
            <p className="text-xs uppercase tracking-wide text-ink-muted">{r.kindLabel}</p>
            <h3 className="text-2xl font-semibold mt-1" lang={r.nameLang}>{r.name}</h3>
            {r.capital && <p className="mt-2"><span className="text-ink-muted">{labels.capital}: </span><span lang={r.capitalLang}>{r.capital}</span></p>}
            <div className="mt-3 flex gap-4 text-sm">
              <Link href={`/${lang}/states/${r.id}`} className="font-medium">{labels.viewDetails}</Link>
              <button type="button" onClick={() => select(null)} className="underline text-ink-muted">{labels.back}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
