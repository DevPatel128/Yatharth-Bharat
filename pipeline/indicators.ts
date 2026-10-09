// Indicator definitions: what to fetch, how to validate it, and how to explain it in plain language.
// Hindi text here is authored for this project and passes the deterministic Hindi gate; the model-based
// back-translation check (G8, AI part) runs when an AI key is configured. See HISTORICAL/AI policies in docs/.
import type { Indicator } from '../src/lib/schema.ts';
import { imf, mospiCpiInflation, mospiPlfsMonthlyUR, worldBank, type DualExtraction } from './adapters.ts';
import type { Point } from './gates.ts';

export type IndicatorDef = Omit<Indicator, 'observations' | 'lastVerifiedAt' | 'state'> & {
  extract: () => Promise<DualExtraction>;
  sanity: { min: number; max: number; periodPattern: RegExp; minPoints: number };
  /** Largest change to an already published value accepted without holding for investigation. */
  maxRevision: number;
  series: string;
  cross?: { label: string; fetch: () => Promise<Point[]>; tolerance: number; explainedDivergence?: string };
  noSecondSourceReason?: string;
  /** Observations kept on the site (most recent N). */
  keep: number;
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;
// IMF figures after this year include staff projections. Revisit each April/October WEO.
const IMF_LAST_ACTUAL = 2025;

export const INDICATORS: IndicatorDef[] = [
  {
    id: 'unemployment-rate',
    category: 'employment',
    name: { en: 'Unemployment rate (monthly)', hi: 'बेरोज़गारी दर (मासिक)' },
    definition: {
      en: 'Share of people in the labour force (working or looking for work) who did not find work during the reference week. Persons aged 15 and above, rural and urban combined, all India.',
      hi: 'श्रम बल (काम कर रहे या काम खोज रहे लोग) में से उन लोगों का प्रतिशत, जिन्हें संदर्भ सप्ताह में काम नहीं मिला। 15 वर्ष और उससे अधिक आयु के व्यक्ति, ग्रामीण और शहरी मिलाकर, अखिल भारत।',
    },
    unit: { en: '% of labour force', hi: 'श्रम बल का %' },
    direction: 'lower',
    geography: 'IN',
    methodology: {
      en: 'Periodic Labour Force Survey (PLFS), monthly estimates by current weekly status (CWS), published by the National Statistics Office, MoSPI. Monthly PLFS estimates start in 2025.',
      hi: 'आवधिक श्रम बल सर्वेक्षण (PLFS) के मासिक अनुमान, वर्तमान साप्ताहिक स्थिति (CWS) के आधार पर, राष्ट्रीय सांख्यिकी कार्यालय, MoSPI द्वारा प्रकाशित। मासिक PLFS अनुमान 2025 से शुरू होते हैं।',
    },
    limitations: {
      en: 'Survey estimate with sampling error; month-to-month changes of a few tenths of a point may not be meaningful. Not comparable with the older annual PS+SS series.',
      hi: 'यह सर्वेक्षण-आधारित अनुमान है और इसमें प्रतिदर्श त्रुटि होती है; महीने-दर-महीने कुछ दशमलव अंकों का बदलाव सार्थक नहीं भी हो सकता। पुरानी वार्षिक PS+SS श्रृंखला से तुलनीय नहीं।',
    },
    sourceId: 'mospi-api',
    series: 'PLFS monthly (CWS), from 2025',
    extract: mospiPlfsMonthlyUR,
    sanity: { min: 0, max: 30, periodPattern: MONTH, minPoints: 3 },
    maxRevision: 0.5,
    noSecondSourceReason: 'PLFS is the only official monthly labour survey in India.',
    keep: 24,
  },
  {
    id: 'cpi-inflation',
    category: 'economy',
    name: { en: 'Retail inflation (CPI, year-on-year)', hi: 'खुदरा महंगाई (CPI, वार्षिक आधार पर)' },
    definition: {
      en: 'How much the prices of a fixed basket of goods and services bought by households rose compared with the same month a year earlier. All India, rural and urban combined.',
      hi: 'परिवारों द्वारा खरीदी जाने वाली वस्तुओं और सेवाओं की एक निश्चित टोकरी की कीमतें पिछले वर्ष के उसी महीने की तुलना में कितनी बढ़ीं। अखिल भारत, ग्रामीण और शहरी मिलाकर।',
    },
    unit: { en: '% change over a year earlier', hi: 'एक वर्ष पहले की तुलना में % परिवर्तन' },
    direction: 'neutral',
    geography: 'IN',
    methodology: {
      en: 'Consumer Price Index, General, base year 2024=100, published monthly by the National Statistics Office, MoSPI. The 2024 series replaced the 2012 series from January 2026.',
      hi: 'उपभोक्ता मूल्य सूचकांक, सामान्य, आधार वर्ष 2024=100, राष्ट्रीय सांख्यिकी कार्यालय, MoSPI द्वारा मासिक रूप से प्रकाशित। 2024 श्रृंखला ने जनवरी 2026 से 2012 श्रृंखला का स्थान लिया।',
    },
    limitations: {
      en: 'Values from the 2012=100 series are a different series and are not joined to this line. Latest month is usually provisional and may be revised.',
      hi: '2012=100 श्रृंखला के आंकड़े एक अलग श्रृंखला हैं और इस रेखा में नहीं जोड़े गए हैं। नवीनतम महीने का आंकड़ा प्रायः अनंतिम होता है और संशोधित हो सकता है।',
    },
    sourceId: 'mospi-api',
    series: 'CPI 2024=100',
    extract: mospiCpiInflation,
    sanity: { min: -10, max: 25, periodPattern: MONTH, minPoints: 1 },
    maxRevision: 0.3,
    noSecondSourceReason: 'MoSPI is the sole publisher of the official CPI (2024=100).',
    keep: 24,
  },
  {
    id: 'gdp-growth',
    category: 'economy',
    name: { en: 'Real GDP growth', hi: 'वास्तविक GDP वृद्धि' },
    definition: {
      en: 'How much the total value of goods and services produced in India grew in a year, after removing the effect of price changes.',
      hi: 'भारत में एक वर्ष में उत्पादित वस्तुओं और सेवाओं का कुल मूल्य, कीमतों में बदलाव का असर हटाने के बाद, कितना बढ़ा।',
    },
    unit: { en: '% annual change', hi: '% वार्षिक परिवर्तन' },
    direction: 'higher',
    geography: 'IN',
    methodology: {
      en: 'World Bank World Development Indicators (NY.GDP.MKTP.KD.ZG), based on national accounts data. Shown because the official MoSPI national accounts API was returning errors when last checked. Cross-checked against the IMF World Economic Outlook.',
      hi: 'विश्व बैंक विश्व विकास संकेतक (NY.GDP.MKTP.KD.ZG), राष्ट्रीय लेखा आंकड़ों पर आधारित। यह इसलिए दिखाया गया है क्योंकि पिछली जांच के समय MoSPI का आधिकारिक राष्ट्रीय लेखा API त्रुटियां दे रहा था। IMF विश्व आर्थिक परिदृश्य से मिलान किया गया।',
    },
    limitations: {
      en: 'International compilation, not the Government of India release. India reports on a fiscal-year basis (April to March); the year label follows the World Bank convention. May not yet reflect the 2022-23 base-year revision published by MoSPI in February 2026.',
      hi: 'यह अंतरराष्ट्रीय संकलन है, भारत सरकार की आधिकारिक विज्ञप्ति नहीं। भारत वित्त वर्ष (अप्रैल से मार्च) के आधार पर आंकड़े देता है; वर्ष का लेबल विश्व बैंक की परिपाटी के अनुसार है। हो सकता है इसमें फरवरी 2026 में MoSPI द्वारा जारी 2022-23 आधार वर्ष संशोधन अभी शामिल न हो।',
    },
    sourceId: 'world-bank-api',
    series: 'World Bank WDI, constant prices',
    extract: () => worldBank('NY.GDP.MKTP.KD.ZG'),
    sanity: { min: -15, max: 20, periodPattern: YEAR, minPoints: 10 },
    maxRevision: 1.5,
    cross: { label: 'IMF WEO (NGDP_RPCH)', fetch: () => imf('NGDP_RPCH', IMF_LAST_ACTUAL), tolerance: 1.5 },
    keep: 30,
  },
  {
    id: 'gdp-per-capita-usd',
    category: 'international',
    name: { en: 'GDP per person (current US dollars)', hi: 'प्रति व्यक्ति GDP (वर्तमान अमेरिकी डॉलर)' },
    definition: {
      en: 'Total value of goods and services produced in a year divided by the population, converted to US dollars at market exchange rates. Useful for international comparison, not for measuring living costs.',
      hi: 'एक वर्ष में उत्पादित वस्तुओं और सेवाओं का कुल मूल्य जनसंख्या से विभाजित, बाजार विनिमय दर पर अमेरिकी डॉलर में परिवर्तित। यह अंतरराष्ट्रीय तुलना के लिए उपयोगी है, जीवन-यापन की लागत मापने के लिए नहीं।',
    },
    unit: { en: 'US dollars per person', hi: 'अमेरिकी डॉलर प्रति व्यक्ति' },
    direction: 'higher',
    geography: 'IN',
    methodology: {
      en: 'World Bank World Development Indicators (NY.GDP.PCAP.CD). Cross-checked against IMF World Economic Outlook (NGDPDPC).',
      hi: 'विश्व बैंक विश्व विकास संकेतक (NY.GDP.PCAP.CD)। IMF विश्व आर्थिक परिदृश्य (NGDPDPC) से मिलान किया गया।',
    },
    limitations: {
      en: 'Nominal and in dollars: moves with inflation and the rupee exchange rate, so it is not a measure of real growth. Says nothing about how income is distributed.',
      hi: 'यह नाममात्र और डॉलर में है: महंगाई और रुपये की विनिमय दर के साथ बदलता है, इसलिए यह वास्तविक वृद्धि का माप नहीं है। आय के वितरण के बारे में कुछ नहीं बताता।',
    },
    sourceId: 'world-bank-api',
    series: 'World Bank WDI, current US$',
    extract: () => worldBank('NY.GDP.PCAP.CD'),
    sanity: { min: 50, max: 20000, periodPattern: YEAR, minPoints: 10 },
    maxRevision: 150,
    cross: { label: 'IMF WEO (NGDPDPC)', fetch: () => imf('NGDPDPC', IMF_LAST_ACTUAL), tolerance: 150 },
    keep: 30,
  },
  {
    id: 'life-expectancy',
    category: 'healthcare',
    name: { en: 'Life expectancy at birth', hi: 'जन्म के समय जीवन प्रत्याशा' },
    definition: {
      en: 'The average number of years a newborn would live if death rates at each age stayed as they were in that year.',
      hi: 'यदि हर आयु पर मृत्यु दर उस वर्ष जैसी ही बनी रहे, तो एक नवजात शिशु औसतन कितने वर्ष जीवित रहेगा।',
    },
    unit: { en: 'years', hi: 'वर्ष' },
    direction: 'higher',
    geography: 'IN',
    methodology: {
      en: 'World Bank World Development Indicators (SP.DYN.LE00.IN), derived from UN Population Division estimates.',
      hi: 'विश्व बैंक विश्व विकास संकेतक (SP.DYN.LE00.IN), संयुक्त राष्ट्र जनसंख्या प्रभाग के अनुमानों पर आधारित।',
    },
    limitations: {
      en: 'Modelled international estimate. India’s official life-table estimates come from the Sample Registration System (Office of the Registrar General) and can differ.',
      hi: 'यह अंतरराष्ट्रीय मॉडल-आधारित अनुमान है। भारत के आधिकारिक जीवन-तालिका अनुमान नमूना पंजीकरण प्रणाली (भारत के महापंजीयक का कार्यालय) से आते हैं और भिन्न हो सकते हैं।',
    },
    sourceId: 'world-bank-api',
    series: 'World Bank WDI',
    extract: () => worldBank('SP.DYN.LE00.IN'),
    sanity: { min: 30, max: 90, periodPattern: YEAR, minPoints: 10 },
    maxRevision: 1,
    noSecondSourceReason: 'The official SRS life tables are published as PDF reports; adding them is tracked in the manual-download lane.',
    keep: 30,
  },
  {
    id: 'infant-mortality',
    category: 'healthcare',
    name: { en: 'Infant mortality rate', hi: 'शिशु मृत्यु दर' },
    definition: {
      en: 'Number of babies who die before their first birthday, for every 1,000 babies born alive.',
      hi: 'प्रति 1,000 जीवित जन्मे शिशुओं में से पहले जन्मदिन से पहले मरने वाले शिशुओं की संख्या।',
    },
    unit: { en: 'deaths per 1,000 live births', hi: 'प्रति 1,000 जीवित जन्म पर मृत्यु' },
    direction: 'lower',
    geography: 'IN',
    methodology: {
      en: 'World Bank World Development Indicators (SP.DYN.IMRT.IN), from the UN Inter-agency Group for Child Mortality Estimation.',
      hi: 'विश्व बैंक विश्व विकास संकेतक (SP.DYN.IMRT.IN), संयुक्त राष्ट्र बाल मृत्यु दर अनुमान अंतर-एजेंसी समूह से।',
    },
    limitations: {
      en: 'Modelled international estimate. India’s official figure comes from the Sample Registration System bulletin and can differ.',
      hi: 'यह अंतरराष्ट्रीय मॉडल-आधारित अनुमान है। भारत का आधिकारिक आंकड़ा नमूना पंजीकरण प्रणाली बुलेटिन से आता है और भिन्न हो सकता है।',
    },
    sourceId: 'world-bank-api',
    series: 'World Bank WDI',
    extract: () => worldBank('SP.DYN.IMRT.IN'),
    sanity: { min: 1, max: 200, periodPattern: YEAR, minPoints: 10 },
    maxRevision: 3,
    noSecondSourceReason: 'The official SRS bulletin is a PDF; adding it is tracked in the manual-download lane.',
    keep: 30,
  },
  {
    id: 'electricity-access',
    category: 'infrastructure',
    name: { en: 'Population with access to electricity', hi: 'बिजली तक पहुंच वाली आबादी' },
    definition: {
      en: 'Share of the population living in households that have an electricity connection.',
      hi: 'उन घरों में रहने वाली आबादी का प्रतिशत, जिनके पास बिजली कनेक्शन है।',
    },
    unit: { en: '% of population', hi: 'आबादी का %' },
    direction: 'higher',
    geography: 'IN',
    methodology: {
      en: 'World Bank World Development Indicators (EG.ELC.ACCS.ZS), compiled from household surveys and national sources.',
      hi: 'विश्व बैंक विश्व विकास संकेतक (EG.ELC.ACCS.ZS), घरेलू सर्वेक्षणों और राष्ट्रीय स्रोतों से संकलित।',
    },
    limitations: {
      en: 'Measures a connection, not hours of supply or reliability.',
      hi: 'यह केवल कनेक्शन मापता है, आपूर्ति के घंटे या विश्वसनीयता नहीं।',
    },
    sourceId: 'world-bank-api',
    series: 'World Bank WDI',
    extract: () => worldBank('EG.ELC.ACCS.ZS'),
    sanity: { min: 0, max: 100, periodPattern: YEAR, minPoints: 10 },
    maxRevision: 3,
    noSecondSourceReason: 'No second machine-readable official series identified yet.',
    keep: 30,
  },
  {
    id: 'internet-users',
    category: 'infrastructure',
    name: { en: 'Individuals using the internet', hi: 'इंटरनेट का उपयोग करने वाले व्यक्ति' },
    definition: {
      en: 'Share of the population that used the internet from any location in the last three months.',
      hi: 'आबादी का वह प्रतिशत, जिसने पिछले तीन महीनों में किसी भी स्थान से इंटरनेट का उपयोग किया।',
    },
    unit: { en: '% of population', hi: 'आबादी का %' },
    direction: 'higher',
    geography: 'IN',
    methodology: {
      en: 'World Bank World Development Indicators (IT.NET.USER.ZS), from International Telecommunication Union estimates.',
      hi: 'विश्व बैंक विश्व विकास संकेतक (IT.NET.USER.ZS), अंतरराष्ट्रीय दूरसंचार संघ के अनुमानों से।',
    },
    limitations: {
      en: 'Estimate; definitions of “use” vary across surveys. TRAI subscription counts measure connections, not people, and are not comparable.',
      hi: 'यह अनुमान है; अलग-अलग सर्वेक्षणों में “उपयोग” की परिभाषा भिन्न होती है। TRAI के ग्राहक आंकड़े कनेक्शन मापते हैं, व्यक्ति नहीं, इसलिए तुलनीय नहीं हैं।',
    },
    sourceId: 'world-bank-api',
    series: 'World Bank WDI',
    extract: () => worldBank('IT.NET.USER.ZS'),
    sanity: { min: 0, max: 100, periodPattern: YEAR, minPoints: 5 },
    maxRevision: 5,
    noSecondSourceReason: 'No second machine-readable official series identified yet.',
    keep: 30,
  },
];
