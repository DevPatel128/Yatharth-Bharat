// Official portals for study, scholarships, skills and jobs. Each link was opened in a browser on 2026-10-10
// and showed the named body's own site. Descriptions say only what the portal is for; nothing on this site
// depends on facts taken from these pages.
import type { Bilingual } from '@/lib/schema';

export type Portal = { id: string; group: 'scholarships' | 'study' | 'jobs'; name: Bilingual; body: Bilingual; what: Bilingual; url: string };

export const PORTALS: Portal[] = [
  {
    id: 'nsp', group: 'scholarships', url: 'https://scholarships.gov.in',
    name: { en: 'National Scholarship Portal (NSP)', hi: 'राष्ट्रीय छात्रवृत्ति पोर्टल (NSP)' },
    body: { en: 'Government of India', hi: 'भारत सरकार' },
    what: { en: 'Apply for Union and many state government scholarships in one place, and track the application.', hi: 'केंद्र और कई राज्य सरकारों की छात्रवृत्तियों के लिए एक ही स्थान पर आवेदन करें और आवेदन की स्थिति देखें।' },
  },
  {
    id: 'swayam', group: 'study', url: 'https://swayam.gov.in',
    name: { en: 'SWAYAM', hi: 'स्वयं (SWAYAM)' },
    body: { en: 'Ministry of Education', hi: 'शिक्षा मंत्रालय' },
    what: { en: 'Online courses from school to postgraduate level by Indian institutions. Studying is free; certification exams may charge a fee.', hi: 'भारतीय संस्थानों के स्कूल से स्नातकोत्तर स्तर तक के ऑनलाइन पाठ्यक्रम। पढ़ाई निःशुल्क है; प्रमाणन परीक्षा के लिए शुल्क लग सकता है।' },
  },
  {
    id: 'nta', group: 'study', url: 'https://nta.ac.in',
    name: { en: 'National Testing Agency (NTA)', hi: 'राष्ट्रीय परीक्षा एजेंसी (NTA)' },
    body: { en: 'Ministry of Education', hi: 'शिक्षा मंत्रालय' },
    what: { en: 'Conducts national entrance and eligibility exams such as JEE (Main), NEET (UG), CUET and UGC-NET.', hi: 'JEE (Main), NEET (UG), CUET और UGC-NET जैसी राष्ट्रीय प्रवेश और पात्रता परीक्षाएं आयोजित करती है।' },
  },
  {
    id: 'nirf', group: 'study', url: 'https://www.nirfindia.org',
    name: { en: 'National Institutional Ranking Framework (NIRF)', hi: 'राष्ट्रीय संस्थागत रैंकिंग फ्रेमवर्क (NIRF)' },
    body: { en: 'Ministry of Education', hi: 'शिक्षा मंत्रालय' },
    what: { en: 'Annual ranking of higher-education institutions, with the data each institution submitted.', hi: 'उच्च शिक्षा संस्थानों की वार्षिक रैंकिंग, प्रत्येक संस्थान द्वारा दिए गए आँकड़ों सहित।' },
  },
  {
    id: 'ugc', group: 'study', url: 'https://www.ugc.gov.in',
    name: { en: 'University Grants Commission (UGC)', hi: 'विश्वविद्यालय अनुदान आयोग (UGC)' },
    body: { en: 'Statutory body, Ministry of Education', hi: 'वैधानिक निकाय, शिक्षा मंत्रालय' },
    what: { en: 'Regulates universities. Publishes the list of recognised universities and notices about unrecognised institutions.', hi: 'विश्वविद्यालयों का विनियमन करता है। मान्यता प्राप्त विश्वविद्यालयों की सूची और बिना मान्यता वाले संस्थानों के बारे में सूचनाएं प्रकाशित करता है।' },
  },
  {
    id: 'aicte', group: 'study', url: 'https://www.aicte.gov.in',
    name: { en: 'All India Council for Technical Education (AICTE)', hi: 'अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE)' },
    body: { en: 'Statutory body, Ministry of Education', hi: 'वैधानिक निकाय, शिक्षा मंत्रालय' },
    what: { en: 'Approves technical institutions (engineering, management, pharmacy and others). Check whether a college and course are approved.', hi: 'तकनीकी संस्थानों (इंजीनियरिंग, प्रबंधन, फार्मेसी आदि) को अनुमोदन देती है। देखें कि कोई कॉलेज और पाठ्यक्रम अनुमोदित है या नहीं।' },
  },
  {
    id: 'digilocker', group: 'study', url: 'https://www.digilocker.gov.in',
    name: { en: 'DigiLocker', hi: 'डिजिलॉकर' },
    body: { en: 'Ministry of Electronics and Information Technology', hi: 'इलेक्ट्रॉनिकी और सूचना प्रौद्योगिकी मंत्रालय' },
    what: { en: 'Keep and share digital copies of mark sheets, certificates and other documents issued by government bodies and boards.', hi: 'सरकारी निकायों और बोर्डों द्वारा जारी अंकतालिकाओं, प्रमाणपत्रों और अन्य दस्तावेज़ों की डिजिटल प्रतियाँ रखें और साझा करें।' },
  },
  {
    id: 'ncs', group: 'jobs', url: 'https://www.ncs.gov.in',
    name: { en: 'National Career Service (NCS)', hi: 'राष्ट्रीय कैरियर सेवा (NCS)' },
    body: { en: 'Ministry of Labour and Employment', hi: 'श्रम और रोज़गार मंत्रालय' },
    what: { en: 'Job portal with jobs, internships, career guidance and job fairs. Helpline 1514.', hi: 'नौकरियों, इंटर्नशिप, करियर मार्गदर्शन और रोज़गार मेलों का पोर्टल। हेल्पलाइन 1514।' },
  },
  {
    id: 'sidh', group: 'jobs', url: 'https://www.skillindiadigital.gov.in',
    name: { en: 'Skill India Digital Hub (SIDH)', hi: 'स्किल इंडिया डिजिटल हब (SIDH)' },
    body: { en: 'Ministry of Skill Development and Entrepreneurship', hi: 'कौशल विकास और उद्यमशीलता मंत्रालय' },
    what: { en: 'Skilling courses and certification, with links to related jobs and apprenticeships.', hi: 'कौशल पाठ्यक्रम और प्रमाणन, साथ ही संबंधित नौकरियों और अप्रेंटिसशिप के लिंक।' },
  },
  {
    id: 'apprenticeship', group: 'jobs', url: 'https://www.apprenticeshipindia.gov.in',
    name: { en: 'Apprenticeship Training Portal', hi: 'अप्रेंटिसशिप प्रशिक्षण पोर्टल' },
    body: { en: 'Ministry of Skill Development and Entrepreneurship', hi: 'कौशल विकास और उद्यमशीलता मंत्रालय' },
    what: { en: 'Register for apprenticeships with a stipend under the Apprentices Act, 1961.', hi: 'शिक्षु अधिनियम, 1961 के तहत वजीफे वाली अप्रेंटिसशिप के लिए पंजीकरण करें।' },
  },
  {
    id: 'upsc', group: 'jobs', url: 'https://upsc.gov.in',
    name: { en: 'Union Public Service Commission (UPSC)', hi: 'संघ लोक सेवा आयोग (UPSC)' },
    body: { en: 'Constitutional body (Article 315)', hi: 'संवैधानिक निकाय (अनुच्छेद 315)' },
    what: { en: 'Conducts the Civil Services Examination and other recruitment for Union government posts.', hi: 'सिविल सेवा परीक्षा और केंद्र सरकार के पदों के लिए अन्य भर्तियां आयोजित करता है।' },
  },
  {
    id: 'ssc', group: 'jobs', url: 'https://ssc.gov.in',
    name: { en: 'Staff Selection Commission (SSC)', hi: 'कर्मचारी चयन आयोग (SSC)' },
    body: { en: 'Department of Personnel and Training', hi: 'कार्मिक और प्रशिक्षण विभाग' },
    what: { en: 'Recruits staff for Union ministries and departments through exams such as CGL, CHSL and MTS.', hi: 'CGL, CHSL और MTS जैसी परीक्षाओं के माध्यम से केंद्रीय मंत्रालयों और विभागों के लिए कर्मचारियों की भर्ती करता है।' },
  },
  {
    id: 'eshram', group: 'jobs', url: 'https://www.eshram.gov.in',
    name: { en: 'e-Shram', hi: 'ई-श्रम' },
    body: { en: 'Ministry of Labour and Employment', hi: 'श्रम और रोज़गार मंत्रालय' },
    what: { en: 'National registration for unorganised workers, which gives a Universal Account Number (UAN) used for social security schemes.', hi: 'असंगठित श्रमिकों का राष्ट्रीय पंजीकरण, जिससे सामाजिक सुरक्षा योजनाओं के लिए यूनिवर्सल अकाउंट नंबर (UAN) मिलता है।' },
  },
];
