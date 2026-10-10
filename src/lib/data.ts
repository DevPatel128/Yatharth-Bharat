// Verified records, read at build time. The data bot changes only the JSON files; adding an indicator is a code
// change (pipeline/indicators.ts + the import below), reviewed like any other code.
import { Indicator, LegislatureFile, TradeFile, RegionalIndicator, RegionsFile, type Indicator as IndicatorT, type Region } from './schema.ts';
import regionsJson from '../../data/records/geo/regions.json';
import unemployment from '../../data/records/indicators/unemployment-rate.json';
import cpi from '../../data/records/indicators/cpi-inflation.json';
import gdpGrowth from '../../data/records/indicators/gdp-growth.json';
import gdpPc from '../../data/records/indicators/gdp-per-capita-usd.json';
import lifeExp from '../../data/records/indicators/life-expectancy.json';
import imr from '../../data/records/indicators/infant-mortality.json';
import electricity from '../../data/records/indicators/electricity-access.json';
import internet from '../../data/records/indicators/internet-users.json';
import ger from '../../data/records/indicators/higher-education-ger.json';
import cpiStates from '../../data/records/regional/cpi-inflation.json';
import gerStates from '../../data/records/regional/higher-education-ger.json';
import lokSabha from '../../data/records/people/lok-sabha-18.json';
import trade from '../../data/records/world/trade.json';

// Parsing again here means a malformed record fails the build instead of reaching a page.
export const INDICATORS: IndicatorT[] = [unemployment, cpi, ger, gdpGrowth, gdpPc, lifeExp, imr, electricity, internet].map((j) => Indicator.parse(j));
export const REGIONS: Region[] = RegionsFile.parse(regionsJson).regions;

/** State/UT-level series, keyed by national indicator id. */
export const REGIONAL = [RegionalIndicator.parse(cpiStates), RegionalIndicator.parse(gerStates)];
export const regionalFor = (regionId: string) =>
  REGIONAL.flatMap((r) => { const s = r.regions[regionId]; const ind = INDICATORS.find((i) => i.id === r.indicatorId); return s && ind ? [{ indicator: ind, series: s }] : []; });

export const TRADE = TradeFile.parse(trade);
export const LOK_SABHA = LegislatureFile.parse(lokSabha);
export const mpsFor = (regionId: string) => LOK_SABHA.members.filter((m) => m.regionId === regionId).sort((a, b) => a.constituency.en.localeCompare(b.constituency.en));

export const getIndicator = (id: string) => INDICATORS.find((i) => i.id === id);
export const getRegion = (id: string) => REGIONS.find((r) => r.id === id);

/** Decimal places to display, matching the precision the source publishes. */
export const DISPLAY_DECIMALS: Record<string, number> = {
  'unemployment-rate': 1, 'cpi-inflation': 2, 'higher-education-ger': 1, 'gdp-growth': 1, 'gdp-per-capita-usd': 0,
  'life-expectancy': 1, 'infant-mortality': 1, 'electricity-access': 1, 'internet-users': 1,
};

/** Home page shows these four: one each for prices, jobs, growth and health. */
export const HEADLINE = ['cpi-inflation', 'unemployment-rate', 'gdp-growth', 'life-expectancy'];
