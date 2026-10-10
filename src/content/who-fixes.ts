// "Who fixes this?": everyday problems mapped to the level of government that the Constitution's lists and
// schedules assign them to. The Constitution says what *can* be given to local bodies; each state's laws
// decide what actually is, so every answer says so. Quotes are verified in test/content.test.ts.
import type { Responsibility } from '@/lib/schema';

const C = (ref: string, quote: string) => ({ sourceId: 'constitution', ref, quote });
const CITY = { en: 'Municipal corporation, municipal council or nagar panchayat (where state law assigns it)', hi: 'नगर निगम, नगरपालिका परिषद या नगर पंचायत (जहां राज्य कानून यह कार्य सौंपता है)' };
const VILLAGE = { en: 'Panchayat (where state law assigns it)', hi: 'पंचायत (जहां राज्य कानून यह कार्य सौंपता है)' };
const LOCAL_OFFICE = { en: 'Your municipal ward office or gram panchayat office first; then the state grievance portal. Records can be requested under the RTI Act.', hi: 'पहले अपने नगरपालिका वार्ड कार्यालय या ग्राम पंचायत कार्यालय में; फिर राज्य के शिकायत पोर्टल पर। अभिलेख आरटीआई अधिनियम के तहत मांगे जा सकते हैं।' };

export const RESPONSIBILITIES: Responsibility[] = [
  { id: 'street-lights', issue: { en: 'Street lights not working', hi: 'स्ट्रीट लाइट काम नहीं कर रही' },
    levels: [{ where: 'city', who: CITY, cite: C('Twelfth Schedule, item 17', '17. Public amenities including street lighting, parking lots, bus stops and public conveniences.') }],
    where: LOCAL_OFFICE, explainer: 'municipalities' },
  { id: 'garbage', issue: { en: 'Garbage not collected, drains blocked', hi: 'कचरा नहीं उठाया गया, नालियां जाम' },
    levels: [
      { where: 'city', who: CITY, cite: C('Twelfth Schedule, item 6', '6. Public health, sanitation conservancy and solid waste management.') },
      { where: 'village', who: VILLAGE, cite: C('Eleventh Schedule, item 23', '23. Health and sanitation, including hospitals, primary health centres and dispensaries.') },
    ], where: LOCAL_OFFICE, explainer: 'municipalities' },
  { id: 'local-roads', issue: { en: 'Potholes on a city or village road', hi: 'शहर या गांव की सड़क पर गड्ढे' },
    levels: [
      { where: 'city', who: CITY, cite: C('Twelfth Schedule, item 4', '4. Roads and bridges.') },
      { where: 'village', who: VILLAGE, cite: C('Eleventh Schedule, item 13', '13. Roads, culverts, bridges, ferries, waterways and other means of communication.') },
      { where: 'state', who: { en: 'State public works or road department (state highways and roads not under a local body)', hi: 'राज्य लोक निर्माण या सड़क विभाग (राज्य राजमार्ग और वे सड़कें जो स्थानीय निकाय के अधीन नहीं हैं)' }, cite: C('Seventh Schedule, List II, entry 13', 'Communications, that is to say, roads, bridges, ferries, and other means of communication not specified in List I') },
    ], where: LOCAL_OFFICE, explainer: 'municipalities' },
  { id: 'national-highway', issue: { en: 'Problem on a national highway', hi: 'राष्ट्रीय राजमार्ग पर समस्या' },
    levels: [{ where: 'union', who: { en: 'Union government (Ministry of Road Transport and Highways and its agencies)', hi: 'केंद्र सरकार (सड़क परिवहन और राजमार्ग मंत्रालय और उसकी एजेंसियां)' }, cite: C('Seventh Schedule, List I, entry 23', 'Highways declared by or under law made by Parliament to be national highways.') }],
    where: { en: 'CPGRAMS (Union grievance portal).', hi: 'CPGRAMS (केंद्रीय शिकायत पोर्टल)।' }, explainer: 'prime-minister' },
  { id: 'drinking-water', issue: { en: 'No drinking water supply', hi: 'पेयजल आपूर्ति नहीं' },
    levels: [
      { where: 'city', who: CITY, cite: C('Twelfth Schedule, item 5', '5. Water supply for domestic, industrial and commercial purposes.') },
      { where: 'village', who: VILLAGE, cite: C('Eleventh Schedule, item 11', '11. Drinking water.') },
      { where: 'state', who: { en: 'State water department or water board', hi: 'राज्य जल विभाग या जल बोर्ड' }, cite: C('Seventh Schedule, List II, entry 17', 'Water, that is to say, water supplies, irrigation and canals, drainage and embankments') },
    ], where: LOCAL_OFFICE, explainer: 'municipalities' },
  { id: 'police', issue: { en: 'Crime, police not responding, public order', hi: 'अपराध, पुलिस द्वारा कार्रवाई न होना, लोक व्यवस्था' },
    levels: [{ where: 'state', who: { en: 'State police (under the state government)', hi: 'राज्य पुलिस (राज्य सरकार के अधीन)' }, cite: C('Seventh Schedule, List II, entry 2', 'Police (including railway and village police)') }],
    where: { en: 'The police station first (in an emergency, call 112); then senior police officers and the state grievance portal. Courts can be approached if rights are violated.', hi: 'पहले पुलिस थाने में (आपात स्थिति में 112 पर कॉल करें); फिर वरिष्ठ पुलिस अधिकारियों और राज्य शिकायत पोर्टल पर। अधिकारों के उल्लंघन पर न्यायालय जाया जा सकता है।' }, explainer: 'chief-minister' },
  { id: 'railways', issue: { en: 'Trains, stations and railway services', hi: 'रेलगाड़ियां, स्टेशन और रेल सेवाएं' },
    levels: [{ where: 'union', who: { en: 'Union government (Ministry of Railways)', hi: 'केंद्र सरकार (रेल मंत्रालय)' }, cite: C('Seventh Schedule, List I, entry 22', '22. Railways.') }],
    where: { en: 'CPGRAMS (Union grievance portal), or the Railways’ own grievance channels.', hi: 'CPGRAMS (केंद्रीय शिकायत पोर्टल), या रेलवे के अपने शिकायत माध्यम।' }, explainer: 'prime-minister' },
  { id: 'hospitals', issue: { en: 'Government hospital or health centre services', hi: 'सरकारी अस्पताल या स्वास्थ्य केंद्र की सेवाएं' },
    levels: [
      { where: 'state', who: { en: 'State health department', hi: 'राज्य स्वास्थ्य विभाग' }, cite: C('Seventh Schedule, List II, entry 6', 'Public health and sanitation; hospitals and dispensaries.') },
      { where: 'village', who: VILLAGE, cite: C('Eleventh Schedule, item 23', '23. Health and sanitation, including hospitals, primary health centres and dispensaries.') },
    ], where: { en: 'The hospital administration first; then the state health department or state grievance portal.', hi: 'पहले अस्पताल प्रशासन; फिर राज्य स्वास्थ्य विभाग या राज्य शिकायत पोर्टल।' }, explainer: 'chief-minister' },
  { id: 'birth-death', issue: { en: 'Birth or death certificate', hi: 'जन्म या मृत्यु प्रमाणपत्र' },
    levels: [{ where: 'city', who: CITY, cite: C('Twelfth Schedule, item 16', '16. Vital statistics including registration of births and deaths.') }],
    where: { en: 'The registrar of births and deaths at your municipality or local body.', hi: 'आपकी नगरपालिका या स्थानीय निकाय में जन्म और मृत्यु रजिस्ट्रार।' }, explainer: 'municipalities' },
  { id: 'fire', issue: { en: 'Fire services', hi: 'अग्निशमन सेवाएं' },
    levels: [{ where: 'city', who: CITY, cite: C('Twelfth Schedule, item 7', '7. Fire services.') }],
    where: { en: 'In an emergency, call 112 or 101. For complaints, the municipal or state fire service.', hi: 'आपात स्थिति में 112 या 101 पर कॉल करें। शिकायतों के लिए नगरपालिका या राज्य अग्निशमन सेवा।' }, explainer: 'municipalities' },
  { id: 'building-permission', issue: { en: 'Building permission and illegal construction', hi: 'भवन निर्माण अनुमति और अवैध निर्माण' },
    levels: [{ where: 'city', who: CITY, cite: C('Twelfth Schedule, item 2', '2. Regulation of land-use and construction of buildings.') }],
    where: LOCAL_OFFICE, explainer: 'municipalities' },
  { id: 'schools', issue: { en: 'Government school problems', hi: 'सरकारी विद्यालय की समस्याएं' },
    levels: [
      { where: 'state', who: { en: 'State education department (education is a shared Union–State subject)', hi: 'राज्य शिक्षा विभाग (शिक्षा केंद्र और राज्य दोनों का साझा विषय है)' }, cite: C('Seventh Schedule, List III, entry 25', '25. Education, including technical education, medical education and universities') },
      { where: 'village', who: VILLAGE, cite: C('Eleventh Schedule, item 17', '17. Education, including primary and secondary schools.') },
    ], where: { en: 'The school management committee or head teacher first; then the block or district education office.', hi: 'पहले विद्यालय प्रबंधन समिति या प्रधानाध्यापक; फिर प्रखंड या जिला शिक्षा कार्यालय।' }, explainer: 'chief-minister' },
  { id: 'electricity', issue: { en: 'Electricity supply and billing', hi: 'बिजली आपूर्ति और बिल' },
    levels: [
      { where: 'state', who: { en: 'State electricity distribution company and regulator (electricity is a shared Union–State subject)', hi: 'राज्य बिजली वितरण कंपनी और नियामक (बिजली केंद्र और राज्य दोनों का साझा विषय है)' }, cite: C('Seventh Schedule, List III, entry 38', '38. Electricity.') },
      { where: 'village', who: VILLAGE, cite: C('Eleventh Schedule, item 14', '14. Rural electrification, including distribution of electricity.') },
    ], where: { en: 'Your distribution company’s complaint line first; then its consumer grievance forum.', hi: 'पहले अपनी वितरण कंपनी की शिकायत लाइन; फिर उसका उपभोक्ता शिकायत निवारण मंच।' }, explainer: 'chief-minister' },
  { id: 'voter-list', issue: { en: 'Name missing from the voter list', hi: 'मतदाता सूची में नाम नहीं' },
    levels: [
      { where: 'independent', who: { en: 'Election Commission of India (Lok Sabha and Assembly elections)', hi: 'भारत निर्वाचन आयोग (लोक सभा और विधान सभा चुनाव)' }, cite: C('Article 324(1)', 'the preparation of the electoral rolls for, and the conduct of') },
      { where: 'state', who: { en: 'State Election Commission (panchayat and municipal elections)', hi: 'राज्य निर्वाचन आयोग (पंचायत और नगरपालिका चुनाव)' }, cite: C('Article 243K(1)', 'all elections to the Panchayats shall be vested in a State Election Commission') },
    ], where: { en: 'Your Booth Level Officer or the Election Commission’s official voter services.', hi: 'आपके बूथ स्तरीय अधिकारी या निर्वाचन आयोग की आधिकारिक मतदाता सेवाएं।' }, explainer: 'election-commission' },
];
