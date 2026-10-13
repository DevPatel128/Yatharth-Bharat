// Districts, blocks and cities (NIC Bharat Maps). Kept out of data.ts so the Worker bundle does not carry it.
import { DistrictsFile, type Evidence } from './schema.ts';
import json from '../../data/records/geo/districts.json';

export const DISTRICTS = DistrictsFile.parse(json);
export const districtsOf = (regionId: string) => DISTRICTS.districts.filter((d) => d.regionId === regionId);
export const getDistrict = (regionId: string, id: string) => DISTRICTS.districts.find((d) => d.regionId === regionId && d.id === id);
/** Every city once, at the district where most of it lies. */
export const citiesOf = (regionId: string) => districtsOf(regionId).flatMap((d) => d.cities.filter((c) => c.main === d.id).map((c) => ({ ...c, district: d })));
export const getCity = (regionId: string, districtId: string, cityId: string) => getDistrict(regionId, districtId)?.cities.find((c) => c.id === cityId);

/** The reference shown on every place page: the NIC services and the hash of what was downloaded. */
export function nicEvidence(kind: 'districts' | 'blocks' | 'cities' | 'wards' = 'districts'): Evidence {
  return {
    sourceId: 'nic-bharat-maps',
    url: DISTRICTS.sources[kind],
    retrievedAt: DISTRICTS.lastVerifiedAt,
    snapshotSha256: DISTRICTS.snapshotSha256,
    quote: `${kind} layer, ${kind === 'districts' ? DISTRICTS.districts.length : kind} features, queried as GeoJSON`,
    method: 'pipeline',
  };
}
