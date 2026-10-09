// Verified records, read at build time. The data bot changes only the JSON files; adding an indicator is a code
// change (pipeline/indicators.ts + the import below), reviewed like any other code.
import { Indicator, RegionalIndicator, RegionsFile, type Indicator as IndicatorT, type Region } from './schema.ts';
import regionsJson from '../../data/records/geo/regions.json';
import unemployment from '../../data/records/indicators/unemployment-rate.json';
import cpi from '../../data/records/indicators/cpi-inflation.json';
import gdpGrowth from '../../data/records/indicators/gdp-growth.json';
import gdpPc from '../../data/records/indicators/gdp-per-capita-usd.json';
import lifeExp from '../../data/records/indicators/life-expectancy.json';
import imr from '../../data/records/indicators/infant-mortality.json';
import electricity from '../../data/records/indicators/electricity-access.json';
import internet from '../../data/records/indicators/internet-users.json';
import cpiStates from '../../data/records/regional/cpi-inflation.json';

// Parsing again here means a malformed record fails the build instead of reaching a page.
export const INDICATORS: IndicatorT[] = [unemployment, cpi, gdpGrowth, gdpPc, lifeExp, imr, electricity, internet].map((j) => Indicator.parse(j));
export const REGIONS: Region[] = RegionsFile.parse(regionsJson).regions;

/** State/UT-level series, keyed by national indicator id. */
export const REGIONAL = [RegionalIndicator.parse(cpiStates)];
export const regionalFor = (regionId: string) =>
  REGIONAL.flatMap((r) => { const s = r.regions[regionId]; const ind = INDICATORS.find((i) => i.id === r.indicatorId); return s && ind ? [{ indicator: ind, series: s }] : []; });

export const getIndicator = (id: string) => INDICATORS.find((i) => i.id === id);
export const getRegion = (id: string) => REGIONS.find((r) => r.id === id);

/** Decimal places to display, matching the precision the source publishes. */
export const DISPLAY_DECIMALS: Record<string, number> = {
  'unemployment-rate': 1, 'cpi-inflation': 2, 'gdp-growth': 1, 'gdp-per-capita-usd': 0,
  'life-expectancy': 1, 'infant-mortality': 1, 'electricity-access': 1, 'internet-users': 1,
};

/** Home page shows these four: one each for prices, jobs, growth and health. */
export const HEADLINE = ['cpi-inflation', 'unemployment-rate', 'gdp-growth', 'life-expectancy'];
