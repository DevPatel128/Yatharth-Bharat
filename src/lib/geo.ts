// Map geometry, computed at build time on the server. The browser receives finished SVG paths:
// no geometry library and no boundary file ships in the client bundle.
import { geoMercator, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from 'topojson-specification';
import topo from '../../public/geo/india-states.topo.json';

export const MAP_W = 600;
export const MAP_H = 680;

export type MapShape = { id: string; d: string; bounds: [[number, number], [number, number]]; centroid: [number, number] };

export function buildMap(): { shapes: MapShape[]; outline: string } {
  const t = topo as unknown as Topology<{ states: GeometryCollection<{ ST_NM: string }> }>;
  const fc = feature(t, t.objects.states);
  const projection = geoMercator().fitExtent([[8, 8], [MAP_W - 8, MAP_H - 8]], fc);
  // One decimal place in a 600px-wide viewBox is sub-pixel at any zoom we use, and halves the payload.
  const path = geoPath(projection).digits(1);
  const shapes = fc.features.map((f) => ({
    id: String(f.id),
    d: path(f) ?? '',
    bounds: path.bounds(f) as MapShape['bounds'],
    centroid: path.centroid(f) as [number, number],
  }));
  const outline = path(merge(t, t.objects.states.geometries as (Polygon | MultiPolygon)[])) ?? '';
  return { shapes, outline };
}
