// Build public/geo/india-states.topo.json from DataMeet state boundaries at a pinned commit.
// Verifies file hashes, the 36-feature count, and the external boundary's northern and eastern extent
// (Survey of India depiction: Ladakh reaches ~37.08°N and includes Aksai Chin to ~80.3°E).
// Usage: node pipeline/geo.ts   (needs the mapshaper dev dependency)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RegionsFile } from '../src/lib/schema.ts';
import { safeFetch } from './lib/safe-fetch.ts';

const COMMIT = '2c0c306a0c786a83876065a62b7b82646d8a639d'; // datameet/maps, last change to States/ (2021-10-25)
const FILES: Record<string, string> = {
  'Admin2.shp': 'b61ebc11a7487ce1c340d55fc9d0c1a2b63af1f73191fef691c11693c726130d',
  'Admin2.shx': 'dc428a44ed20384b02c3c5971f2b200b15d429923b6cc770cae940d0af21016a',
  'Admin2.dbf': '4ec2f9b83263c85781bc9abf0d281d441b5e02377be124bda6b5d87bd9dc4ccd',
};
const ROOT = new URL('../', import.meta.url);
// Work inside the project folder (owner rule: downloads stay in the project).
const dir = fileURLToPath(new URL('data/raw/build/datameet-states/', ROOT));
mkdirSync(dir, { recursive: true });

for (const [f, want] of Object.entries(FILES)) {
  const r = await safeFetch(`https://raw.githubusercontent.com/datameet/maps/${COMMIT}/States/${f}`, { allowedHosts: ['raw.githubusercontent.com'], maxBytes: 40 * 1024 * 1024 });
  if (r.sha256 !== want) throw new Error(`${f}: sha256 ${r.sha256} does not match pinned ${want}`);
  writeFileSync(join(dir, f), r.body);
}
writeFileSync(join(dir, 'Admin2.prj'), 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]');

const regions = RegionsFile.parse(JSON.parse(readFileSync(new URL('data/records/geo/regions.json', ROOT), 'utf8'))).regions;
const idByBoundary = Object.fromEntries(regions.map((r) => [r.boundaryName, r.id]));
const small = JSON.stringify(['Lakshadweep', 'Dadra and Nagar Haveli and Daman and Diu', 'Puducherry', 'Chandigarh', 'Goa', 'Delhi']);
const out = join(dir, 'states.topo.json');
const mapshaper = fileURLToPath(new URL('node_modules/.bin/mapshaper', ROOT));
// Simplify the whole layer together (shared borders stay consistent), then drop specks only from large states
// so that small island territories (Lakshadweep, Puducherry's enclaves, Diu) keep every part.
execFileSync(mapshaper, [
  '-i', join(dir, 'Admin2.shp'), 'name=all',
  '-simplify', '1%', 'weighted', 'keep-shapes',
  '-filter', `${small}.includes(ST_NM)`, '+', 'name=small',
  '-target', 'all', '-filter', `!${small}.includes(ST_NM)`, '-filter-islands', 'min-area=4km2', '-filter-slivers',
  '-merge-layers', 'target=all,small', 'force', 'name=states',
  '-each', `id = (${JSON.stringify(idByBoundary)})[ST_NM] || ''`,
  '-o', 'format=topojson', 'quantization=30000', 'id-field=id', out,
], { stdio: 'inherit' });

const topo = JSON.parse(readFileSync(out, 'utf8')) as { bbox?: number[]; objects: { states: { geometries: { id?: string; properties: { ST_NM: string } }[] } } };
const geoms = topo.objects.states.geometries;
const missing = geoms.filter((g) => !g.id).map((g) => g.properties.ST_NM);
if (geoms.length !== 36 || missing.length) throw new Error(`boundary join failed: ${geoms.length} features; unmatched ${missing.join(', ')}`);
for (const g of geoms) g.properties = { ST_NM: g.properties.ST_NM };

const info = spawnSync(mapshaper, ['-i', join(dir, 'Admin2.shp'), '-filter', 'ST_NM=="Ladakh"', '-info'], { encoding: 'utf8' });
const ladakh = `${info.stdout}${info.stderr}`; // mapshaper prints -info to stderr
const bounds = /Bounds:\s+([\d.]+),([\d.]+),([\d.]+),([\d.]+)/.exec(ladakh);
if (!bounds || Number(bounds[4]) < 37.0 || Number(bounds[3]) < 80.0) throw new Error(`external boundary check failed for Ladakh: ${bounds?.[0] ?? 'no bounds'}`);

writeFileSync(new URL('public/geo/india-states.topo.json', ROOT), JSON.stringify(topo));
console.log(`geo: 36 features joined; Ladakh bounds ${bounds.slice(1).join(',')}; ${readFileSync(new URL('public/geo/india-states.topo.json', ROOT)).length} bytes`);
