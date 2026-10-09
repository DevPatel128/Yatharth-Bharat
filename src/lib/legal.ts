// Legal page text (EN + HI). DRAFT: written to match how the product actually works today, pending review by a
// qualified lawyer before public launch (WOLF GOVERN: legal text needs a human). Update when the product changes.
import type { Lang } from './schema.ts';

/** Grievance / corrections contact. Set before launch; pages say so while it is null. */
export const CONTACT_EMAIL: string | null = null;
export const LEGAL_UPDATED = '2026-10-10';

type Section = { h: string; p: string[] };
type Page = { title: string; draft: string; sections: Section[] };

const contact = (lang: Lang) =>
  CONTACT_EMAIL ?? (lang === 'hi' ? 'संपर्क पता सार्वजनिक लॉन्च से पहले प्रकाशित किया जाएगा।' : 'A contact address will be published before public launch.');

export function legal(page: 'privacy' | 'terms' | 'corrections', lang: Lang): Page {
  const c = contact(lang);
  if (lang === 'hi') {
    const draft = `मसौदा, कानूनी समीक्षा लंबित। अंतिम अद्यतन ${LEGAL_UPDATED}।`;
    if (page === 'privacy') return { title: 'गोपनीयता नीति', draft, sections: [
      { h: 'हम क्या एकत्र नहीं करते', p: ['यथार्थ भारत पर कोई खाता नहीं बनता। हम आपका नाम, ईमेल, फ़ोन नंबर, पता या कोई पहचान दस्तावेज़ नहीं मांगते और संग्रहीत नहीं करते।', 'साइट पर खोज आपके ब्राउज़र में ही चलती है; आपके खोज शब्द हमें नहीं भेजे जाते।'] },
      { h: 'उपयोग के आंकड़े', p: ['साइट यह समझने के लिए कि कौन से पृष्ठ उपयोगी हैं, कुकी-रहित, समेकित उपयोग आंकड़े (जैसे पृष्ठ देखे जाने की संख्या) एकत्र कर सकती है। इनमें आपकी पहचान करने वाली जानकारी नहीं होती और विज्ञापन के लिए इनका उपयोग नहीं होता।', 'त्रुटि निगरानी (Sentry) केवल तकनीकी त्रुटि विवरण प्राप्त करती है, जिनसे व्यक्तिगत जानकारी हटा दी जाती है।'] },
      { h: 'भविष्य की सुविधाएं', p: ['यदि हम AI प्रश्न या करियर प्रोफ़ाइल जैसी सुविधाएं जोड़ते हैं, तो यह नीति पहले अद्यतन की जाएगी। करियर प्रोफ़ाइल केवल आपके ब्राउज़र में रहने के लिए बनाई जा रही है। आपके डेटा का उपयोग किसी AI मॉडल को प्रशिक्षित करने के लिए नहीं किया जाएगा।'] },
      { h: 'आपके अधिकार', p: ['डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के अंतर्गत आपके अधिकारों से संबंधित किसी भी प्रश्न या शिकायत के लिए संपर्क करें: ' + c] },
    ] };
    if (page === 'terms') return { title: 'उपयोग की शर्तें', draft, sections: [
      { h: 'यह साइट क्या है', p: ['यथार्थ भारत एक स्वतंत्र, निःशुल्क सार्वजनिक-सूचना पहल है जो आधिकारिक और प्राथमिक स्रोतों से जानकारी संकलित करती है। यह किसी भी सरकारी निकाय से संबद्ध नहीं है और किसी राजनीतिक दल का समर्थन नहीं करती।'] },
      { h: 'जानकारी की सीमाएं', p: ['हर आंकड़ा अपने स्रोत से जुड़ा है। हम स्वचालित जांचों से सटीकता सुनिश्चित करने का प्रयास करते हैं, पर पूर्णता, सटीकता या अद्यतनता की गारंटी नहीं देते। कोई भी निर्णय लेने से पहले उद्धृत मूल स्रोत देखें। यह साइट कानूनी, वित्तीय या पेशेवर सलाह नहीं देती।'] },
      { h: 'पुनः उपयोग', p: ['आंकड़े मूल प्रकाशकों के लाइसेंस के अधीन हैं, जो "स्रोत और पद्धति" पृष्ठ पर सूचीबद्ध हैं। पुनः उपयोग करते समय मूल स्रोत का श्रेय दें।'] },
      { h: 'मानचित्र', p: ['मानचित्र प्रदर्शन के लिए सरलीकृत है। भारत की बाहरी सीमा भारतीय सर्वेक्षण विभाग के चित्रण के अनुसार दिखाई गई है। यह कानूनी या सर्वेक्षण उपयोग के लिए नहीं है।'] },
    ] };
    return { title: 'सुधार और हटाने की नीति', draft, sections: [
      { h: 'त्रुटि की सूचना दें', p: ['यदि आपको कोई आंकड़ा गलत, पुराना या भ्रामक लगे, तो पृष्ठ का पता और सही जानकारी का आधिकारिक स्रोत भेजें: ' + c] },
      { h: 'हम क्या करते हैं', p: ['हर सूचना की जांच मूल स्रोत से की जाती है। पुष्टि होने पर सुधार प्रकाशित किया जाता है और पिछला मान संशोधन इतिहास में दिखाई देता रहता है; हम चुपचाप आंकड़े नहीं बदलते।'] },
      { h: 'कानूनी आदेश', p: ['सक्षम न्यायालय या सरकारी प्राधिकरण के वैध आदेश पर, लागू कानून के अनुसार निर्धारित समय-सीमा के भीतर कार्रवाई की जाएगी।'] },
    ] };
  }
  const draft = `Draft, pending legal review. Last updated ${LEGAL_UPDATED}.`;
  if (page === 'privacy') return { title: 'Privacy policy', draft, sections: [
    { h: 'What we do not collect', p: ['Yatharth Bharat has no accounts. We do not ask for or store your name, email, phone number, address or any identity document.', 'Search on this site runs in your browser; your search terms are not sent to us.'] },
    { h: 'Usage statistics', p: ['To learn which pages are useful, the site may collect cookieless, aggregated usage statistics (such as page views). These contain no information that identifies you and are not used for advertising.', 'Error monitoring (Sentry) receives technical error details only, with personal information removed.'] },
    { h: 'Future features', p: ['If we add features such as AI questions or career profiles, this policy will be updated first. Career profiles are being designed to stay in your browser only. Your data will not be used to train any AI model.'] },
    { h: 'Your rights', p: ['For any question or grievance about your rights under the Digital Personal Data Protection Act, 2023, contact: ' + c] },
  ] };
  if (page === 'terms') return { title: 'Terms of use', draft, sections: [
    { h: 'What this site is', p: ['Yatharth Bharat is an independent, free public-information initiative that compiles information from official and primary sources. It is not affiliated with any government body and does not support any political party.'] },
    { h: 'Limits of the information', p: ['Every figure links to its source. We work to ensure accuracy through automated checks but make no warranty of completeness, accuracy or currency. Consult the cited original before making any decision. This site does not give legal, financial or professional advice.'] },
    { h: 'Reuse', p: ['Data remains under the licences of the original publishers, listed on the Sources and method page. Credit the original source when reusing it.'] },
    { h: 'Maps', p: ['The map is simplified for display. India’s external boundary is shown as depicted by the Survey of India. It is not for legal or survey use.'] },
  ] };
  return { title: 'Corrections and takedown policy', draft, sections: [
    { h: 'Report an error', p: ['If a figure looks wrong, outdated or misleading, send the page address and the official source for the correct information to: ' + c] },
    { h: 'What we do', p: ['Every report is checked against the original source. When confirmed, the correction is published and the earlier value stays visible in the revision history; figures are never changed silently.'] },
    { h: 'Legal orders', p: ['On a valid order from a competent court or government authority, action will be taken within the time limits set by applicable law.'] },
  ] };
}
