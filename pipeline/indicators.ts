// Indicator definitions: what to fetch, how to validate it, and how to explain it in plain language.
// Hindi text here is authored for this project and passes the deterministic Hindi gate; the model-based
// back-translation check (G8, AI part) runs when an AI key is configured. See HISTORICAL/AI policies in docs/.
import type { Indicator } from '../src/lib/schema.ts';
import { aisheGer, imf, mospiCpiInflation, mospiPlfsMonthlyUR, worldBank, type DualExtraction } from './adapters.ts';
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
const FY = /^\d{4}-\d{2}$/;
// IMF figures after this year include staff projections. Revisit each April/October WEO.
const IMF_LAST_ACTUAL = 2025;


type B = { en: string; hi: string };
/** A World Development Indicators series (international source, always labelled as such). */
function wb(o: { id: string; category: Indicator['category']; code: string; name: B; definition: B; unit: B; direction: Indicator['direction']; from: B; limitations: B; min: number; max: number; minPoints?: number; maxRevision: number }): IndicatorDef {
  return {
    id: o.id, category: o.category, name: o.name, definition: o.definition, unit: o.unit, direction: o.direction, geography: 'IN',
    methodology: { en: `World Bank World Development Indicators (${o.code}), ${o.from.en}.`, hi: `विश्व बैंक विश्व विकास संकेतक (${o.code}), ${o.from.hi}।` },
    limitations: o.limitations, sourceId: 'world-bank-api', series: 'World Bank WDI', extract: () => worldBank(o.code),
    sanity: { min: o.min, max: o.max, periodPattern: YEAR, minPoints: o.minPoints ?? 8 }, maxRevision: o.maxRevision,
    noSecondSourceReason: 'No second machine-readable official series identified yet.', keep: 30,
  };
}

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
    id: 'higher-education-ger',
    category: 'education',
    name: { en: 'Higher education enrolment (GER, 18–23 years)', hi: 'उच्च शिक्षा में नामांकन (सकल नामांकन अनुपात, 18–23 वर्ष)' },
    definition: {
      en: 'Students enrolled in higher education (any age) as a share of the population aged 18 to 23. All social categories, men and women together.',
      hi: 'उच्च शिक्षा में नामांकित विद्यार्थी (किसी भी आयु के), 18 से 23 वर्ष की आबादी के प्रतिशत के रूप में। सभी सामाजिक वर्ग, पुरुष और महिलाएं मिलाकर।',
    },
    unit: { en: '% of population aged 18–23', hi: '18–23 वर्ष की आबादी का %' },
    direction: 'higher',
    geography: 'IN',
    methodology: {
      en: 'All India Survey on Higher Education (AISHE), Ministry of Education, published through the MoSPI data API. Financial-year academic sessions.',
      hi: 'उच्च शिक्षा पर अखिल भारतीय सर्वेक्षण (AISHE), शिक्षा मंत्रालय, MoSPI डेटा API के माध्यम से प्रकाशित। वित्त वर्ष के अनुसार शैक्षणिक सत्र।',
    },
    limitations: {
      en: 'A gross ratio counts students of every age, so it can exceed what the 18–23 population alone would give. Latest available year in the API is older than the latest AISHE report may be.',
      hi: 'सकल अनुपात में हर आयु के विद्यार्थी गिने जाते हैं, इसलिए यह केवल 18–23 आयु वर्ग से बनने वाले अनुपात से अधिक हो सकता है। API में उपलब्ध नवीनतम वर्ष, नवीनतम AISHE रिपोर्ट से पुराना हो सकता है।',
    },
    sourceId: 'mospi-api',
    series: 'AISHE',
    extract: () => aisheGer('All India'),
    sanity: { min: 1, max: 100, periodPattern: FY, minPoints: 3 },
    maxRevision: 1,
    noSecondSourceReason: 'AISHE is the official survey of higher education; the second reading is a consistency check against its separately published Gender Parity Index.',
    keep: 20,
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
  wb({
    id: 'co2-per-capita', category: 'environment', code: 'EN.GHG.CO2.PC.CE.AR5',
    name: { en: 'Carbon dioxide emissions per person', hi: 'प्रति व्यक्ति कार्बन डाइऑक्साइड उत्सर्जन' },
    definition: { en: 'Carbon dioxide emitted in India in a year, divided by the population, excluding land use and forestry.', hi: 'एक वर्ष में भारत में उत्सर्जित कार्बन डाइऑक्साइड, जनसंख्या से विभाजित, भूमि उपयोग और वानिकी को छोड़कर।' },
    unit: { en: 'tonnes of CO2 per person', hi: 'टन CO2 प्रति व्यक्ति' }, direction: 'neutral',
    from: { en: 'from the EDGAR emissions database of the European Commission', hi: 'यूरोपीय आयोग के EDGAR उत्सर्जन डेटाबेस से' },
    limitations: { en: 'Covers carbon dioxide only, not other greenhouse gases, and counts emissions where goods are produced, not where they are consumed. India’s official inventory is reported to the UN climate convention every few years and can differ.', hi: 'इसमें केवल कार्बन डाइऑक्साइड शामिल है, अन्य ग्रीनहाउस गैसें नहीं, और उत्सर्जन वहां गिना जाता है जहां वस्तुएं बनती हैं, जहां उपयोग होती हैं वहां नहीं। भारत की आधिकारिक सूची कुछ वर्षों में संयुक्त राष्ट्र जलवायु सम्मेलन को दी जाती है और भिन्न हो सकती है।' },
    min: 0, max: 20, maxRevision: 0.3,
  }),
  wb({
    id: 'renewable-energy-share', category: 'environment', code: 'EG.FEC.RNEW.ZS',
    name: { en: 'Renewable energy in final energy use', hi: 'अंतिम ऊर्जा उपयोग में नवीकरणीय ऊर्जा' },
    definition: { en: 'Share of all energy finally consumed (by homes, industry, transport) that comes from renewable sources, including traditional biomass such as firewood.', hi: 'कुल अंतिम ऊर्जा खपत (घरों, उद्योग, परिवहन द्वारा) का वह प्रतिशत, जो नवीकरणीय स्रोतों से आता है, जिसमें लकड़ी जैसा पारंपरिक बायोमास भी शामिल है।' },
    unit: { en: '% of final energy consumption', hi: 'अंतिम ऊर्जा खपत का %' }, direction: 'neutral',
    from: { en: 'from International Energy Agency and UN energy statistics', hi: 'अंतरराष्ट्रीय ऊर्जा एजेंसी और संयुक्त राष्ट्र ऊर्जा आंकड़ों से' },
    limitations: { en: 'Includes firewood and dung cakes used for cooking, so a falling share can reflect households moving to LPG rather than less solar or wind power. Not the same as the share of renewables in electricity generation.', hi: 'इसमें खाना पकाने के लिए उपयोग होने वाली लकड़ी और उपले शामिल हैं, इसलिए हिस्सा घटने का कारण घरों का एलपीजी अपनाना हो सकता है, सौर या पवन ऊर्जा का कम होना नहीं। यह बिजली उत्पादन में नवीकरणीय ऊर्जा के हिस्से के समान नहीं है।' },
    min: 0, max: 100, maxRevision: 3,
  }),
  wb({
    id: 'forest-area', category: 'environment', code: 'AG.LND.FRST.ZS',
    name: { en: 'Forest area', hi: 'वन क्षेत्र' },
    definition: { en: 'Land under natural or planted trees at least 5 metres high, as a share of total land area.', hi: 'कम से कम 5 मीटर ऊंचे प्राकृतिक या लगाए गए पेड़ों वाली भूमि, कुल भूमि क्षेत्र के प्रतिशत के रूप में।' },
    unit: { en: '% of land area', hi: 'भूमि क्षेत्र का %' }, direction: 'higher',
    from: { en: 'from the UN Food and Agriculture Organization Global Forest Resources Assessment', hi: 'संयुक्त राष्ट्र खाद्य और कृषि संगठन के वैश्विक वन संसाधन आकलन से' },
    limitations: { en: 'Uses the FAO definition. The Forest Survey of India’s State of Forest Report uses satellite-based forest and tree cover and gives different figures.', hi: 'इसमें FAO की परिभाषा उपयोग होती है। भारतीय वन सर्वेक्षण की वन स्थिति रिपोर्ट उपग्रह-आधारित वन और वृक्ष आवरण का उपयोग करती है और अलग आंकड़े देती है।' },
    min: 0, max: 100, maxRevision: 1,
  }),
  wb({
    id: 'pm25-exposure', category: 'environment', code: 'EN.ATM.PM25.MC.M3',
    name: { en: 'Fine particle (PM2.5) air pollution', hi: 'सूक्ष्म कण (PM2.5) वायु प्रदूषण' },
    definition: { en: 'Average yearly concentration of fine particles (2.5 micrometres or smaller) in the air people breathe, weighted by where people live.', hi: 'लोगों द्वारा सांस ली जाने वाली हवा में सूक्ष्म कणों (2.5 माइक्रोमीटर या उससे छोटे) की औसत वार्षिक सांद्रता, लोगों के निवास स्थान के अनुसार भारित।' },
    unit: { en: 'micrograms per cubic metre', hi: 'माइक्रोग्राम प्रति घन मीटर' }, direction: 'lower',
    from: { en: 'from satellite and ground-monitor estimates compiled for the Global Burden of Disease study', hi: 'वैश्विक रोग भार अध्ययन के लिए संकलित उपग्रह और जमीनी निगरानी अनुमानों से' },
    limitations: { en: 'A national, population-weighted average; it hides large differences between cities and seasons. India’s national ambient standard for PM2.5 is 40 micrograms per cubic metre a year (Central Pollution Control Board).', hi: 'यह राष्ट्रीय, जनसंख्या-भारित औसत है; इसमें शहरों और मौसमों के बीच बड़े अंतर छिप जाते हैं। PM2.5 के लिए भारत का राष्ट्रीय परिवेशी मानक 40 माइक्रोग्राम प्रति घन मीटर प्रति वर्ष है (केंद्रीय प्रदूषण नियंत्रण बोर्ड)।' },
    min: 0, max: 300, maxRevision: 5,
  }),
  wb({
    id: 'clean-cooking', category: 'wellbeing', code: 'EG.CFT.ACCS.ZS',
    name: { en: 'Access to clean cooking fuels', hi: 'स्वच्छ खाना पकाने के ईंधन तक पहुंच' },
    definition: { en: 'Share of the population that mainly cooks with clean fuels and technologies such as LPG, natural gas, electricity or biogas.', hi: 'आबादी का वह प्रतिशत, जो मुख्य रूप से एलपीजी, प्राकृतिक गैस, बिजली या बायोगैस जैसे स्वच्छ ईंधन और तकनीकों से खाना पकाता है।' },
    unit: { en: '% of population', hi: 'आबादी का %' }, direction: 'higher',
    from: { en: 'from World Health Organization household energy estimates', hi: 'विश्व स्वास्थ्य संगठन के घरेलू ऊर्जा अनुमानों से' },
    limitations: { en: 'Modelled from household surveys. Having an LPG connection is not the same as using it for all cooking.', hi: 'घरेलू सर्वेक्षणों से मॉडल किया गया अनुमान। एलपीजी कनेक्शन होना और सारा खाना उसी से पकाना एक बात नहीं है।' },
    min: 0, max: 100, maxRevision: 4,
  }),
  wb({
    id: 'safe-drinking-water', category: 'infrastructure', code: 'SH.H2O.SMDW.ZS',
    name: { en: 'Safely managed drinking water', hi: 'सुरक्षित रूप से प्रबंधित पेयजल' },
    definition: { en: 'Share of the population using an improved water source that is on the premises, available when needed and free from contamination.', hi: 'आबादी का वह प्रतिशत, जो ऐसे बेहतर जल स्रोत का उपयोग करती है जो परिसर में हो, जरूरत पर उपलब्ध हो और संदूषण से मुक्त हो।' },
    unit: { en: '% of population', hi: 'आबादी का %' }, direction: 'higher',
    from: { en: 'from the WHO/UNICEF Joint Monitoring Programme', hi: 'WHO/UNICEF संयुक्त निगरानी कार्यक्रम से' },
    limitations: { en: 'An international estimate with a strict definition. It is not the same as the share of rural households with a tap connection reported by the Jal Jeevan Mission.', hi: 'सख्त परिभाषा वाला अंतरराष्ट्रीय अनुमान। यह जल जीवन मिशन द्वारा बताए गए नल कनेक्शन वाले ग्रामीण घरों के प्रतिशत के समान नहीं है।' },
    min: 0, max: 100, maxRevision: 5,
  }),
  wb({
    id: 'health-expenditure', category: 'healthcare', code: 'SH.XPD.CHEX.GD.ZS',
    name: { en: 'Current health expenditure', hi: 'वर्तमान स्वास्थ्य व्यय' },
    definition: { en: 'All current spending on health in India, by government, households, employers and others, as a share of GDP.', hi: 'भारत में स्वास्थ्य पर सभी वर्तमान खर्च, सरकार, परिवारों, नियोक्ताओं और अन्य द्वारा, जीडीपी के प्रतिशत के रूप में।' },
    unit: { en: '% of GDP', hi: 'जीडीपी का %' }, direction: 'neutral',
    from: { en: 'from the WHO Global Health Expenditure Database', hi: 'WHO वैश्विक स्वास्थ्य व्यय डेटाबेस से' },
    limitations: { en: 'Includes private and out-of-pocket spending, not only government spending. India’s own National Health Accounts estimates are published by the Ministry of Health and can differ.', hi: 'इसमें निजी और जेब से किया गया खर्च भी शामिल है, केवल सरकारी खर्च नहीं। भारत के राष्ट्रीय स्वास्थ्य लेखा अनुमान स्वास्थ्य मंत्रालय प्रकाशित करता है और वे भिन्न हो सकते हैं।' },
    min: 0, max: 20, maxRevision: 0.5,
  }),
  wb({
    id: 'maternal-mortality', category: 'healthcare', code: 'SH.STA.MMRT',
    name: { en: 'Maternal mortality ratio', hi: 'मातृ मृत्यु अनुपात' },
    definition: { en: 'Women who die from pregnancy-related causes during pregnancy or within 42 days after it, per 100,000 live births.', hi: 'गर्भावस्था के दौरान या उसके 42 दिनों के भीतर गर्भावस्था से जुड़े कारणों से मरने वाली महिलाएं, प्रति 100,000 जीवित जन्म।' },
    unit: { en: 'deaths per 100,000 live births', hi: 'मौतें प्रति 100,000 जीवित जन्म' }, direction: 'lower',
    from: { en: 'from the UN Maternal Mortality Estimation Inter-Agency Group (modelled estimate)', hi: 'संयुक्त राष्ट्र मातृ मृत्यु दर आकलन अंतर-एजेंसी समूह से (मॉडल आधारित अनुमान)' },
    limitations: { en: 'A modelled international estimate. India’s official figure comes from the Sample Registration System of the Registrar General and is published for three-year periods.', hi: 'मॉडल आधारित अंतरराष्ट्रीय अनुमान। भारत का आधिकारिक आंकड़ा महापंजीयक की नमूना पंजीकरण प्रणाली से आता है और तीन वर्ष की अवधि के लिए प्रकाशित होता है।' },
    min: 0, max: 1500, maxRevision: 25,
  }),
  wb({
    id: 'poverty-3-dollars', category: 'poverty-inequality', code: 'SI.POV.DDAY',
    name: { en: 'Extreme poverty (US$3.00 a day)', hi: 'अत्यधिक गरीबी (प्रतिदिन 3.00 अमेरिकी डॉलर)' },
    definition: { en: 'Share of the population living on less than US$3.00 a day, adjusted for differences in prices between countries (2021 purchasing power parity).', hi: 'आबादी का वह प्रतिशत, जो प्रतिदिन 3.00 अमेरिकी डॉलर से कम पर जीवन यापन करती है, देशों के बीच कीमतों के अंतर के लिए समायोजित (2021 क्रय शक्ति समता)।' },
    unit: { en: '% of population', hi: 'आबादी का %' }, direction: 'lower',
    from: { en: 'from the World Bank Poverty and Inequality Platform, based on household consumption surveys', hi: 'विश्व बैंक गरीबी और असमानता मंच से, घरेलू उपभोग सर्वेक्षणों के आधार पर' },
    limitations: { en: 'Available only for years with a household consumption survey; the survey method changed in 2022-23, so values before and after are not strictly comparable. India has no current official poverty line.', hi: 'केवल उन वर्षों के लिए उपलब्ध, जिनमें घरेलू उपभोग सर्वेक्षण हुआ; 2022-23 में सर्वेक्षण पद्धति बदली, इसलिए पहले और बाद के मान पूरी तरह तुलनीय नहीं हैं। भारत में वर्तमान में कोई आधिकारिक गरीबी रेखा नहीं है।' },
    min: 0, max: 100, minPoints: 5, maxRevision: 3,
  }),
  wb({
    id: 'gini-index', category: 'poverty-inequality', code: 'SI.POV.GINI',
    name: { en: 'Gini index of consumption', hi: 'उपभोग का गिनी सूचकांक' },
    definition: { en: 'How unequally household consumption is spread: 0 means everyone consumes the same, 100 means one person consumes everything.', hi: 'घरेलू उपभोग कितना असमान रूप से बंटा है: 0 का अर्थ है सभी समान उपभोग करते हैं, 100 का अर्थ है एक ही व्यक्ति सब कुछ उपभोग करता है।' },
    unit: { en: 'index (0 to 100)', hi: 'सूचकांक (0 से 100)' }, direction: 'neutral',
    from: { en: 'from the World Bank Poverty and Inequality Platform', hi: 'विश्व बैंक गरीबी और असमानता मंच से' },
    limitations: { en: 'Measures consumption, not income or wealth, which are usually far more unequal. Not comparable with income-based Gini figures for other countries.', hi: 'यह उपभोग मापता है, आय या संपत्ति नहीं, जो आमतौर पर कहीं अधिक असमान होती हैं। अन्य देशों के आय-आधारित गिनी आंकड़ों से तुलनीय नहीं।' },
    min: 0, max: 100, minPoints: 5, maxRevision: 2,
  }),
  wb({
    id: 'homicide-rate', category: 'public-safety-justice', code: 'VC.IHR.PSRC.P5',
    name: { en: 'Intentional homicides', hi: 'जानबूझकर की गई हत्याएं' },
    definition: { en: 'Unlawful deaths deliberately inflicted on a person, per 100,000 people, as recorded by police.', hi: 'किसी व्यक्ति की जानबूझकर की गई गैरकानूनी मौतें, प्रति 100,000 लोग, पुलिस रिकॉर्ड के अनुसार।' },
    unit: { en: 'per 100,000 people', hi: 'प्रति 100,000 लोग' }, direction: 'lower',
    from: { en: 'from the UN Office on Drugs and Crime, based on National Crime Records Bureau data', hi: 'संयुक्त राष्ट्र ड्रग्स और अपराध कार्यालय से, राष्ट्रीय अपराध रिकॉर्ड ब्यूरो के आंकड़ों पर आधारित' },
    limitations: { en: 'Based on cases recorded by police; recording practices differ between states and over time. The National Crime Records Bureau’s annual Crime in India report is the primary source.', hi: 'पुलिस द्वारा दर्ज मामलों पर आधारित; दर्ज करने की प्रथाएं राज्यों और समय के साथ बदलती हैं। राष्ट्रीय अपराध रिकॉर्ड ब्यूरो की वार्षिक रिपोर्ट "भारत में अपराध" प्राथमिक स्रोत है।' },
    min: 0, max: 50, maxRevision: 0.5,
  }),
  wb({
    id: 'rd-expenditure', category: 'innovation-industry', code: 'GB.XPD.RSDV.GD.ZS',
    name: { en: 'Research and development spending', hi: 'अनुसंधान और विकास पर खर्च' },
    definition: { en: 'Spending on research and development by government, business, universities and non-profits, as a share of GDP.', hi: 'सरकार, व्यवसायों, विश्वविद्यालयों और गैर-लाभकारी संस्थाओं द्वारा अनुसंधान और विकास पर खर्च, जीडीपी के प्रतिशत के रूप में।' },
    unit: { en: '% of GDP', hi: 'जीडीपी का %' }, direction: 'higher',
    from: { en: 'from the UNESCO Institute for Statistics, based on Department of Science and Technology surveys', hi: 'यूनेस्को सांख्यिकी संस्थान से, विज्ञान और प्रौद्योगिकी विभाग के सर्वेक्षणों पर आधारित' },
    limitations: { en: 'Published with a delay of several years. Business research spending is harder to measure than government spending.', hi: 'कई वर्षों की देरी से प्रकाशित। व्यवसायों का अनुसंधान खर्च सरकारी खर्च की तुलना में मापना कठिन है।' },
    min: 0, max: 10, minPoints: 8, maxRevision: 0.1,
  }),
  wb({
    id: 'resident-patents', category: 'innovation-industry', code: 'IP.PAT.RESD',
    name: { en: 'Patent applications by residents', hi: 'निवासियों द्वारा पेटेंट आवेदन' },
    definition: { en: 'Patent applications filed in India by people and organisations resident in India in a year.', hi: 'एक वर्ष में भारत में रहने वाले व्यक्तियों और संगठनों द्वारा भारत में दायर पेटेंट आवेदन।' },
    unit: { en: 'applications', hi: 'आवेदन' }, direction: 'neutral',
    from: { en: 'from the World Intellectual Property Organization, based on the Indian Patent Office', hi: 'विश्व बौद्धिक संपदा संगठन से, भारतीय पेटेंट कार्यालय के आधार पर' },
    limitations: { en: 'Counts applications, not patents granted, and says nothing about their value or use.', hi: 'यह आवेदन गिनता है, स्वीकृत पेटेंट नहीं, और उनके मूल्य या उपयोग के बारे में कुछ नहीं बताता।' },
    min: 0, max: 1000000, maxRevision: 3000,
  }),
  wb({
    id: 'adult-literacy', category: 'education', code: 'SE.ADT.LITR.ZS',
    name: { en: 'Adult literacy rate', hi: 'वयस्क साक्षरता दर' },
    definition: { en: 'Share of people aged 15 and over who can read and write a short simple statement about their everyday life.', hi: '15 वर्ष और उससे अधिक आयु के लोगों का वह प्रतिशत, जो अपने दैनिक जीवन के बारे में एक छोटा सरल वाक्य पढ़ और लिख सकते हैं।' },
    unit: { en: '% of people aged 15+', hi: '15+ आयु के लोगों का %' }, direction: 'higher',
    from: { en: 'from the UNESCO Institute for Statistics, based on Indian census and survey data', hi: 'यूनेस्को सांख्यिकी संस्थान से, भारतीय जनगणना और सर्वेक्षण आंकड़ों पर आधारित' },
    limitations: { en: 'Available only for some years. Self-reported literacy in surveys is not a test of reading ability.', hi: 'केवल कुछ वर्षों के लिए उपलब्ध। सर्वेक्षणों में स्वयं बताई गई साक्षरता पढ़ने की क्षमता की परीक्षा नहीं है।' },
    min: 0, max: 100, minPoints: 5, maxRevision: 3,
  }),
  wb({
    id: 'education-expenditure', category: 'education', code: 'SE.XPD.TOTL.GD.ZS',
    name: { en: 'Government spending on education', hi: 'शिक्षा पर सरकारी खर्च' },
    definition: { en: 'Spending on education by the Union, state and local governments, as a share of GDP.', hi: 'केंद्र, राज्य और स्थानीय सरकारों द्वारा शिक्षा पर खर्च, जीडीपी के प्रतिशत के रूप में।' },
    unit: { en: '% of GDP', hi: 'जीडीपी का %' }, direction: 'neutral',
    from: { en: 'from the UNESCO Institute for Statistics, based on the Ministry of Education’s Analysis of Budgeted Expenditure', hi: 'यूनेस्को सांख्यिकी संस्थान से, शिक्षा मंत्रालय के बजटीय व्यय विश्लेषण पर आधारित' },
    limitations: { en: 'Covers government spending only, not what families spend on private schooling and coaching.', hi: 'इसमें केवल सरकारी खर्च शामिल है, निजी स्कूलों और कोचिंग पर परिवारों का खर्च नहीं।' },
    min: 0, max: 15, maxRevision: 0.5,
  }),
  wb({
    id: 'female-labour-participation', category: 'employment', code: 'SL.TLF.CACT.FE.ZS',
    name: { en: 'Women’s labour force participation', hi: 'महिला श्रम बल भागीदारी' },
    definition: { en: 'Share of women aged 15 and over who are working or looking for work.', hi: '15 वर्ष और उससे अधिक आयु की महिलाओं का वह प्रतिशत, जो काम कर रही हैं या काम खोज रही हैं।' },
    unit: { en: '% of women aged 15+', hi: '15+ आयु की महिलाओं का %' }, direction: 'neutral',
    from: { en: 'from International Labour Organization modelled estimates', hi: 'अंतरराष्ट्रीय श्रम संगठन के मॉडल आधारित अनुमानों से' },
    limitations: { en: 'A modelled international estimate. India’s official figure comes from the Periodic Labour Force Survey (MoSPI), which uses its own definitions and can be markedly different.', hi: 'मॉडल आधारित अंतरराष्ट्रीय अनुमान। भारत का आधिकारिक आंकड़ा आवधिक श्रम बल सर्वेक्षण (MoSPI) से आता है, जिसकी अपनी परिभाषाएं हैं और जो काफी भिन्न हो सकता है।' },
    min: 0, max: 100, maxRevision: 4,
  }),
];
