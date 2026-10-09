import { buildMap, MAP_H, MAP_W } from '@/lib/geo';

// Prerendered at build into out/geo/paths.json: one cacheable file for every page that draws the map,
// instead of repeating ~100 KB of path data inside each page's HTML and React payload.
export const dynamic = 'force-static';

export function GET() {
  const { shapes, outline } = buildMap();
  return Response.json({ width: MAP_W, height: MAP_H, outline, shapes: shapes.map(({ id, d, bounds }) => ({ id, d, bounds })) });
}
