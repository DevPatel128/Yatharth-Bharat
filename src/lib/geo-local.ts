// State, district and city maps, computed at build time from data/geo (NIC Bharat Maps boundaries).
// Like src/lib/geo.ts, the browser receives finished SVG paths only.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

type P = { id: string; d?: string; n?: string };
type F = Feature<Geometry, P>;
export type Shape = { id: string; d: string; label?: [number, number] };
export type LocalMap = { w: number; h: number; districts: Shape[]; blocks: Shape[]; cities: Shape[] };

const cache = new Map<string, { districts: F[]; blocks: F[]; cities: F[] }>();

function layers(regionId: string) {
  const hit = cache.get(regionId);
  if (hit) return hit;
  const t = JSON.parse(readFileSync(join(process.cwd(), 'data/geo/states', `${regionId}.topo.json`), 'utf8')) as Topology<Record<string, GeometryCollection<P>>>;
  const get = (k: string): F[] => (t.objects[k] ? (feature(t, t.objects[k]) as FeatureCollection<Geometry, P>).features : []);
  const v = { districts: get('districts'), blocks: get('blocks'), cities: get('cities') };
  cache.set(regionId, v);
  return v;
}

/** Fit a view to `focus` and draw every layer clipped to that view (shapes outside the frame are skipped). */
function draw(focus: F[], all: { districts: F[]; blocks: F[]; cities: F[] }, w: number, keep: (layer: 'districts' | 'blocks' | 'cities', f: F) => boolean): LocalMap {
  const fc = { type: 'FeatureCollection', features: focus } as GeoPermissibleObjects;
  const probe = geoMercator().fitWidth(w - 16, fc);
  const [[x0, y0], [x1, y1]] = geoPath(probe).bounds(fc);
  const h = Math.max(220, Math.min(Math.round(((y1 - y0) / Math.max(1, x1 - x0)) * (w - 16) + 16), Math.round(w * 1.4)));
  const projection = geoMercator().fitExtent([[8, 8], [w - 8, h - 8]], fc);
  const path = geoPath(projection).digits(1);
  // Skip shapes entirely outside the frame (neighbouring districts far from the one in focus).
  const visible = (f: F) => { const [[a, b], [c, d]] = path.bounds(f); return c >= 0 && a <= w && d >= 0 && b <= h; };
  const shapes = (layer: 'districts' | 'blocks' | 'cities') => all[layer].filter((f) => keep(layer, f) && visible(f)).map((f) => {
    const c = path.centroid(f);
    return { id: String(f.properties.id), d: path(f) ?? '', label: Number.isFinite(c[0]) ? ([Math.round(c[0]), Math.round(c[1])] as [number, number]) : undefined };
  }).filter((s) => s.d);
  return { w, h, districts: shapes('districts'), blocks: shapes('blocks'), cities: shapes('cities') };
}

export function stateMap(regionId: string, w = 640): LocalMap {
  const all = layers(regionId);
  // Blocks are drawn on district maps only; at state scale they add weight but not legibility.
  return draw(all.districts, all, w, (layer) => layer !== 'blocks');
}

export function districtMap(regionId: string, districtId: string, cityIds: string[], w = 640): LocalMap {
  const all = layers(regionId);
  const focus = all.districts.filter((f) => f.properties.id === districtId);
  return draw(focus, all, w, (layer, f) => layer === 'districts' || (layer === 'blocks' ? f.properties.d === districtId : cityIds.includes(String(f.properties.id))));
}

export type WardMap = { w: number; h: number; outline: string; wards: { n: string; d: string; label: [number, number] }[] };

/** One city: its wards when published, otherwise just its outline. */
export function cityMap(regionId: string, cityId: string, w = 640): WardMap | null {
  const city = layers(regionId).cities.find((f) => f.properties.id === cityId);
  let wards: F[] = [];
  try {
    const t = JSON.parse(readFileSync(join(process.cwd(), 'data/geo/wards', `${cityId}.topo.json`), 'utf8')) as Topology<{ wards: GeometryCollection<P> }>;
    wards = (feature(t, t.objects.wards) as FeatureCollection<Geometry, P>).features;
  } catch { /* no ward map for this city */ }
  const focus = wards.length ? wards : city ? [city] : [];
  if (!focus.length) return null;
  const fc = { type: 'FeatureCollection', features: focus } as GeoPermissibleObjects;
  const probe = geoMercator().fitWidth(w - 16, fc);
  const [[x0, y0], [x1, y1]] = geoPath(probe).bounds(fc);
  const h = Math.max(220, Math.min(Math.round(((y1 - y0) / Math.max(1, x1 - x0)) * (w - 16) + 16), Math.round(w * 1.4)));
  const path = geoPath(geoMercator().fitExtent([[8, 8], [w - 8, h - 8]], fc)).digits(1);
  return {
    w, h,
    outline: city ? path(city) ?? '' : '',
    wards: wards.map((f) => { const c = path.centroid(f); return { n: String(f.properties.n ?? ''), d: path(f) ?? '', label: [Math.round(c[0]), Math.round(c[1])] as [number, number] }; })
      .sort((a, b) => (Number(a.n) || 0) - (Number(b.n) || 0)),
  };
}
