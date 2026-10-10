// Constitutional history: dated milestones, each supported by a verbatim quote from the official text of the
// Constitution (as on 1 May 2026), checked against the stored text by test/content.test.ts. Dates are the
// "with effect from" dates printed in the official footnotes. Only what the quoted text shows is stated.
import type { TimelineEntry } from '@/lib/schema';

const C = (ref: string, quote: string) => ({ sourceId: 'constitution', ref, quote });

export const TIMELINE: TimelineEntry[] = [
  {
    id: 'adoption', date: '1949-11-26',
    title: { en: 'The Constitution is adopted', hi: 'संविधान अंगीकार किया गया' },
    summary: { en: 'The Constituent Assembly adopts the Constitution of India.', hi: 'संविधान सभा भारत के संविधान को अंगीकार करती है।' },
    cite: [C('Preamble', 'IN OUR CONSTITUENT ASSEMBLY this twenty-sixth day of November, 1949, do HEREBY ADOPT, ENACT AND GIVE TO OURSELVES THIS CONSTITUTION.')],
  },
  {
    id: 'commencement', date: '1950-01-26',
    title: { en: 'The Constitution comes into force', hi: 'संविधान लागू होता है' },
    summary: { en: 'Most of the Constitution takes effect on this day, which the Constitution calls its commencement. A few articles, such as those on citizenship and elections, had applied from adoption.', hi: 'संविधान का अधिकांश भाग इस दिन लागू होता है, जिसे संविधान अपना प्रारंभ कहता है। नागरिकता और चुनाव जैसे कुछ अनुच्छेद अंगीकार के समय से ही लागू थे।' },
    cite: [C('Article 394', 'sixth day of January, 1950, which day is referred to in this Constitution as the commencement of this Constitution.'), C('Article 394', 'This article and articles 5, 6, 7, 8, 9, 60, 324, 366, 367, 379, 380, 388, 391, 392 and 393 shall come into force at once')],
  },
  {
    id: 'first-amendment', date: '1951-06-18',
    title: { en: 'First Amendment: special provisions for backward classes', hi: 'पहला संशोधन: पिछड़े वर्गों के लिए विशेष उपबंध' },
    summary: { en: 'Clause (4) is added to Article 15, allowing the State to make special provisions for socially and educationally backward classes and for Scheduled Castes and Scheduled Tribes.', hi: 'अनुच्छेद 15 में खंड (4) जोड़ा जाता है, जिससे राज्य सामाजिक और शैक्षिक रूप से पिछड़े वर्गों तथा अनुसूचित जातियों और अनुसूचित जनजातियों के लिए विशेष उपबंध कर सकता है।' },
    cite: [C('Article 15(4)', 'Nothing in this article or in clause (2) of article 29 shall prevent the State from making any special provision for the advancement of any socially and educationally backward classes of citizens or for the Scheduled Castes and the Scheduled Tribes.'), C('Footnote to Article 15', 'Added by the Constitution (First Amendment) Act, 1951, s. 2 (w.e.f. 18-6-1951).')],
    explainer: 'fundamental-rights',
  },
  {
    id: 'states-reorganisation', date: '1956-11-01',
    title: { en: 'Seventh Amendment: states reorganised', hi: 'सातवां संशोधन: राज्यों का पुनर्गठन' },
    summary: { en: 'The division of states into Part A, Part B, Part C and Part D of the First Schedule ends. States and Union Territories are listed as they are today, in the First Schedule.', hi: 'प्रथम अनुसूची के भाग क, भाग ख, भाग ग और भाग घ में राज्यों का विभाजन समाप्त होता है। राज्य और संघ राज्य क्षेत्र आज की तरह प्रथम अनुसूची में सूचीबद्ध होते हैं।' },
    cite: [C('Footnote to Article 246A', 'The words and letters "specified in Part A or Part B of the First Schedule" omitted by the Constitution (Seventh Amendment) Act, 1956, s. 29 and Sch. (w.e.f. 1-11-1956).'), C('Article 1(2)', '(2) The States and the territories thereof shall be as specified in the First Schedule.')],
  },
  {
    id: 'privy-purses', date: '1971-12-28',
    title: { en: 'Twenty-sixth Amendment: rulers’ privileges end', hi: 'छब्बीसवां संशोधन: शासकों के विशेषाधिकार समाप्त' },
    summary: { en: 'Article 362, which protected the rights and privileges of the former rulers of Indian States, is omitted.', hi: 'अनुच्छेद 362, जो पूर्व भारतीय रियासतों के शासकों के अधिकारों और विशेषाधिकारों की रक्षा करता था, हटा दिया जाता है।' },
    cite: [C('Article 362', '362. [Rights and privileges of Rulers of Indian States.].—Omitted by the Constitution (Twenty-sixth Amendment) Act, 1971, s. 2 (w.e.f. 28-12-1971).')],
  },
  {
    id: 'sikkim', date: '1975-04-26',
    title: { en: 'Thirty-sixth Amendment: Sikkim becomes a State', hi: 'छत्तीसवां संशोधन: सिक्किम राज्य बनता है' },
    summary: { en: 'Article 2A, under which Sikkim was associated with the Union, is omitted as Sikkim becomes a State of India.', hi: 'अनुच्छेद 2क, जिसके अंतर्गत सिक्किम संघ से सहयुक्त था, हटा दिया जाता है क्योंकि सिक्किम भारत का राज्य बनता है।' },
    cite: [C('Article 2A', '[Sikkim to be associated with the Union.].—Omitted by the Constitution (Thirty-sixth Amendment) Act, 1975, s. 5 (w.e.f. 26-4-1975).')],
  },
  {
    id: 'preamble-amended', date: '1977-01-03',
    title: { en: 'Forty-second Amendment: “socialist” and “secular” in the Preamble', hi: 'बयालीसवां संशोधन: उद्देशिका में “समाजवादी” और “पंथनिरपेक्ष”' },
    summary: { en: 'The Preamble’s “Sovereign Democratic Republic” becomes “Sovereign Socialist Secular Democratic Republic”, and “unity of the Nation” becomes “unity and integrity of the Nation”.', hi: 'उद्देशिका में “संपूर्ण प्रभुत्व-संपन्न लोकतंत्रात्मक गणराज्य” के स्थान पर “संपूर्ण प्रभुत्व-संपन्न समाजवादी पंथनिरपेक्ष लोकतंत्रात्मक गणराज्य”, और “राष्ट्र की एकता” के स्थान पर “राष्ट्र की एकता और अखंडता” होता है।' },
    cite: [C('Preamble', 'SOVEREIGN SOCIALIST SECULAR DEMOCRATIC REPUBLIC'), C('Footnote to the Preamble', 'Subs. by the Constitution (Forty-second Amendment) Act, 1976, s.2, for "SOVEREIGN DEMOCRATIC REPUBLIC" (w.e.f. 3-1-1977).')],
  },
  {
    id: 'right-to-property', date: '1979-06-20',
    title: { en: 'Forty-fourth Amendment: property is no longer a Fundamental Right', hi: 'चवालीसवां संशोधन: संपत्ति अब मौलिक अधिकार नहीं' },
    summary: { en: 'Article 31 on compulsory acquisition of property is removed from the Fundamental Rights. Article 300A now says no one may be deprived of property except by authority of law.', hi: 'संपत्ति के अनिवार्य अर्जन से संबंधित अनुच्छेद 31 मौलिक अधिकारों से हटा दिया जाता है। अब अनुच्छेद 300क कहता है कि विधि के प्राधिकार के बिना किसी को संपत्ति से वंचित नहीं किया जाएगा।' },
    cite: [C('Article 31', '31. [Compulsory acquisition of property.].—Omitted by the Constitution (Forty-fourth Amendment) Act, 1978, s. 6 (w.e.f. 20-6-1979).'), C('Article 300A', 'No person shall be deprived of his property save by authority of law.')],
    explainer: 'fundamental-rights',
  },
  {
    id: 'anti-defection', date: '1985-03-01',
    title: { en: 'Fifty-second Amendment: the anti-defection law', hi: 'बावनवां संशोधन: दल-बदल विरोधी कानून' },
    summary: { en: 'The Tenth Schedule is added. It sets out when a member of Parliament or a state legislature is disqualified for defection.', hi: 'दसवीं अनुसूची जोड़ी जाती है। इसमें बताया गया है कि संसद या राज्य विधानमंडल का सदस्य दल-बदल के आधार पर कब निरर्ह होता है।' },
    cite: [C('Tenth Schedule', 'Provisions as to disqualification on ground of defection'), C('Footnote to the Tenth Schedule', 'Tenth Schedule added by the Constitution (Fifty-second Amendment) Act, 1985, s. 6 (w.e.f. 1-3-1985).')],
    explainer: 'parliament',
  },
  {
    id: 'voting-age', date: '1989-03-28',
    title: { en: 'Sixty-first Amendment: voting age lowered to 18', hi: 'इकसठवां संशोधन: मतदान की आयु 18 वर्ष' },
    summary: { en: 'The minimum age to vote in Lok Sabha and state assembly elections is lowered from twenty-one to eighteen years.', hi: 'लोक सभा और राज्य विधान सभा चुनावों में मतदान की न्यूनतम आयु इक्कीस वर्ष से घटाकर अठारह वर्ष की जाती है।' },
    cite: [C('Article 326', 'every person who is a citizen of India and who is not less than 2[eighteen years] of age'), C('Footnote to Article 326', 'Subs. by the Constitution (Sixty-first Amendment) Act, 1988, s. 2, for "twenty-one years" (w.e.f. 28-3-1989).')],
    explainer: 'election-commission',
  },
  {
    id: 'panchayats', date: '1993-04-24',
    title: { en: 'Seventy-third Amendment: panchayats in the Constitution', hi: 'तिहत्तरवां संशोधन: संविधान में पंचायतें' },
    summary: { en: 'Part IX on panchayats is inserted, giving village, intermediate and district panchayats a constitutional basis.', hi: 'पंचायतों से संबंधित भाग IX जोड़ा जाता है, जिससे ग्राम, मध्यवर्ती और जिला पंचायतों को संवैधानिक आधार मिलता है।' },
    cite: [C('Footnote to Part IX', 'subsequently ins. by the Constitution (Seventy-third Amendment) Act, 1992, s. 2 (w.e.f. 24-4-1993).')],
    explainer: 'panchayats',
  },
  {
    id: 'municipalities', date: '1993-06-01',
    title: { en: 'Seventy-fourth Amendment: municipalities in the Constitution', hi: 'चौहत्तरवां संशोधन: संविधान में नगरपालिकाएं' },
    summary: { en: 'Part IXA on municipalities is inserted: nagar panchayats, municipal councils and municipal corporations.', hi: 'नगरपालिकाओं से संबंधित भाग IXA जोड़ा जाता है: नगर पंचायतें, नगरपालिका परिषदें और नगर निगम।' },
    cite: [C('Footnote to Part IXA', 'Part IXA ins. by the Constitution (Seventy-fourth Amendment) Act, 1992, s. 2 (w.e.f. 1-6-1993).'), C('Article 243Q', '(c) a Municipal Corporation for a larger urban area,')],
    explainer: 'municipalities',
  },
  {
    id: 'cabinet-size', date: '2004-01-01',
    title: { en: 'Ninety-first Amendment: limit on the size of the Council of Ministers', hi: 'इक्यानबेवां संशोधन: मंत्रिपरिषद के आकार की सीमा' },
    summary: { en: 'The Union Council of Ministers, including the Prime Minister, may not exceed fifteen per cent of the members of the Lok Sabha.', hi: 'प्रधानमंत्री सहित केंद्रीय मंत्रिपरिषद में मंत्रियों की संख्या लोक सभा के सदस्यों की संख्या के पंद्रह प्रतिशत से अधिक नहीं हो सकती।' },
    cite: [C('Article 75(1A)', 'The total number of Ministers, including the Prime Minister, in the Council of Ministers shall not exceed fifteen per cent. of the total number of members of the House of the People.'), C('Footnote to Article 75', 'Ins. by the Constitution (Ninety-first Amendment) Act, 2003, s. 2 (w.e.f. 1-1-2004).')],
    explainer: 'prime-minister',
  },
  {
    id: 'right-to-education', date: '2010-04-01',
    title: { en: 'Eighty-sixth Amendment: the right to education', hi: 'छियासीवां संशोधन: शिक्षा का अधिकार' },
    summary: { en: 'Article 21A makes free and compulsory education for children aged six to fourteen a Fundamental Right.', hi: 'अनुच्छेद 21क छह से चौदह वर्ष के बच्चों के लिए निःशुल्क और अनिवार्य शिक्षा को मौलिक अधिकार बनाता है।' },
    cite: [C('Article 21A', 'The State shall provide free and compulsory education to all children of the age of six to fourteen years in such manner as the State may, by law, determine.'), C('Footnote to Article 21A', 'Ins. by the Constitution (Eighty-sixth Amendment) Act, 2002, s. 2 (w.e.f. 1-4-2010).')],
    explainer: 'fundamental-rights',
  },
  {
    id: 'gst', date: '2016-09-16',
    title: { en: 'One Hundred and First Amendment: goods and services tax', hi: 'एक सौ एकवां संशोधन: माल और सेवा कर' },
    summary: { en: 'Article 246A gives Parliament and every state legislature the power to make laws on goods and services tax.', hi: 'अनुच्छेद 246क संसद और प्रत्येक राज्य विधानमंडल को माल और सेवा कर पर कानून बनाने की शक्ति देता है।' },
    cite: [C('Article 246A', 'have power to make laws with respect to goods and services tax imposed by the Union or by such State.'), C('Footnote to Article 246A', 'Ins. by the Constitution (One Hundred and First Amendment) Act, 2016, s. 2 (w.e.f. 16-9-2016).')],
  },
  {
    id: 'ews', date: '2019-01-14',
    title: { en: 'One Hundred and Third Amendment: economically weaker sections', hi: 'एक सौ तीनवां संशोधन: आर्थिक रूप से कमजोर वर्ग' },
    summary: { en: 'The State may make special provisions, including up to ten per cent of seats in educational institutions, for economically weaker sections not covered by other reservations.', hi: 'राज्य उन आर्थिक रूप से कमजोर वर्गों के लिए विशेष उपबंध कर सकता है जो अन्य आरक्षणों में शामिल नहीं हैं, जिसमें शैक्षिक संस्थाओं की अधिकतम दस प्रतिशत सीटें शामिल हैं।' },
    cite: [C('Article 15(6)', 'subject to a maximum of ten per cent. of the total seats in each category.'), C('Footnote to Article 15', 'Ins. by the Constitution (One Hundred and Third Amendment) Act, 2019, s. 2 (w.e.f. 14-1-2019).')],
    explainer: 'fundamental-rights',
  },
  {
    id: 'article-370', date: '2019-08-06',
    title: { en: 'Article 370: all provisions of the Constitution apply to Jammu and Kashmir', hi: 'अनुच्छेद 370: जम्मू-कश्मीर पर संविधान के सभी उपबंध लागू' },
    summary: { en: 'By a declaration of the President under Article 370(3), on the recommendation of Parliament, the article’s clauses cease to operate except one, which applies all provisions of the Constitution to Jammu and Kashmir.', hi: 'संसद की सिफारिश पर अनुच्छेद 370(3) के अंतर्गत राष्ट्रपति की घोषणा द्वारा, इस अनुच्छेद के एक खंड को छोड़कर सभी खंड प्रवर्तन में नहीं रहते; वह खंड संविधान के सभी उपबंध जम्मू-कश्मीर पर लागू करता है।' },
    cite: [C('Appendix III (C.O. 273)', 'as from the 6th August, 2019, all clauses of the said article 370 shall cease to be operative except the following which shall read as under'), C('Appendix III (C.O. 273)', 'All provisions of this Constitution, as amended from time to time, without any modifications or exceptions, shall apply to the State of Jammu and Kashmir')],
  },
  {
    id: 'women-reservation', date: '2026-04-16',
    title: { en: 'One Hundred and Sixth Amendment: seats reserved for women', hi: 'एक सौ छहवां संशोधन: महिलाओं के लिए आरक्षित सीटें' },
    summary: { en: 'Articles reserving seats for women in the Lok Sabha and state assemblies are in force from this date. Under Article 334A the reservation itself takes effect after the delimitation that follows the first census published after the amendment.', hi: 'लोक सभा और राज्य विधान सभाओं में महिलाओं के लिए सीटें आरक्षित करने वाले अनुच्छेद इस तिथि से प्रवृत्त हैं। अनुच्छेद 334क के अनुसार आरक्षण स्वयं उस परिसीमन के बाद लागू होगा जो संशोधन के बाद प्रकाशित पहली जनगणना के आंकड़ों के बाद किया जाएगा।' },
    cite: [C('Article 330A', '(1) Seats shall be reserved for women in the House of the People.'), C('Footnote to Article 334A', 'Ins. by the Constitution (One Hundred and Sixth Amendment) Act, 2023, s.4 (w.e.f. 16-4-2026).'), C('Article 334A', 'shall come into effect after an exercise of delimitation is undertaken for this purpose after the relevant figures for the first census taken after commencement of the Constitution (One Hundred and Sixth Amendment) Act, 2023 have been published')],
    explainer: 'parliament',
  },
];
