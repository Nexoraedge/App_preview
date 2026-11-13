// apps/mobile/src/data/ipdData.ts
// Decoupled master data, surgery packages, partner hospitals, room options, and category styles for IPD

export interface PlannedSurgery {
  id: string;
  shortName: string;
  shortNameHi: string;
  name: string; // medical procedure title
  nameHi: string;
  category:
    | 'GeneralSurgery'
    | 'Orthopedics'
    | 'Cardiology'
    | 'Maternity'
    | 'Urology'
    | 'Ophthalmology';
  stayDays: string;
  stayDaysHi: string;
  price: number;
  tag: string;
  tagHi: string;
  whatItInvolves: string;
  whatItInvolvesHi: string;
  recoveryTimeline: string;
  recoveryTimelineHi: string;
}

export interface HospitalAdmissionInfo {
  id: string;
  name: string;
  nameHi: string;
  location: string;
  locationHi: string;
  distance_km: number;
  image_url: string;
  rating: number;
  total_reviews: number;
  tag: string;
  tagHi: string;
  specialties: string[];
  specialtiesHi: string[];
}

// Category Icon Tile Background Palette
export const CATEGORY_ICON_BG: Record<string, string> = {
  GeneralSurgery: '#ECFDF5',
  Orthopedics: '#FFFBEB',
  Cardiology: '#FEF2F2',
  Maternity: '#FDF2F8',
  Urology: '#F5F3FF',
  Ophthalmology: '#EFF6FF',
};

export const CATEGORY_ACCENT: Record<string, string> = {
  GeneralSurgery: '#059669',
  Orthopedics: '#D97706',
  Cardiology: '#DC2626',
  Maternity: '#DB2777',
  Urology: '#7C3AED',
  Ophthalmology: '#2563EB',
};

export type CategoryFilter = 'ALL' | PlannedSurgery['category'];

export const CATEGORY_CHIPS: {
  id: CategoryFilter;
  label: string;
  labelHi: string;
}[] = [
  { id: 'ALL', label: 'All Surgeries', labelHi: 'सभी सर्जरी' },
  { id: 'GeneralSurgery', label: 'Laparoscopy', labelHi: 'लैप्रोस्कोपी' },
  { id: 'Orthopedics', label: 'Bones & joints', labelHi: 'हड्डी व जोड़' },
  { id: 'Cardiology', label: 'Heart', labelHi: 'हृदय रोग' },
  { id: 'Maternity', label: 'Maternity', labelHi: 'प्रसूति' },
  { id: 'Urology', label: 'Urology', labelHi: 'गुर्दे व पथरी' },
  { id: 'Ophthalmology', label: 'Eye', labelHi: 'आंखें' },
];

// Helper for Indian Currency formatting
export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

export const MASTER_SURGERIES: PlannedSurgery[] = [
  {
    id: 'surg-gallbladder',
    shortName: 'Gallbladder surgery',
    shortNameHi: 'पित्त की थैली सर्जरी (Gallbladder)',
    name: 'Laparoscopic Cholecystectomy',
    nameHi: 'लैप्रोस्कोपिक कोलेसिस्टेक्टॉमी (Cholecystectomy)',
    category: 'GeneralSurgery',
    stayDays: '1–2 days stay',
    stayDaysHi: '1–2 दिन भर्ती',
    price: 45000,
    tag: 'Minimal invasive',
    tagHi: 'कम चीरा (लैप्रोस्कोपिक)',
    whatItInvolves:
      'Keyhole surgical removal of the inflamed gallbladder containing painful gallstones.',
    whatItInvolvesHi:
      'दर्दनाक पथरी से ग्रस्त पित्त की थैली को लैप्रोस्कोपिक कीहोल विधि द्वारा सुरक्षित निकालना।',
    recoveryTimeline: 'Normal routine resumed in 5–7 days.',
    recoveryTimelineHi: '5–7 दिनों में सामान्य दिनचर्या फिर से शुरू।',
  },
  {
    id: 'surg-knee-replace',
    shortName: 'Knee replacement',
    shortNameHi: 'घुटना प्रत्यारोपण (Knee Replacement)',
    name: 'Total Knee Arthroplasty (TKR)',
    nameHi: 'टोटल नी आर्थ्रोप्लास्टी (TKR Surgery)',
    category: 'Orthopedics',
    stayDays: '3–4 days stay',
    stayDaysHi: '3–4 दिन भर्ती',
    price: 125000,
    tag: 'Implant included',
    tagHi: 'यूएस-एफडीए इम्प्लांट शामिल',
    whatItInvolves:
      'Precision joint resurfacing using US-FDA approved cobalt-chromium implants.',
    whatItInvolvesHi:
      'घिसे हुए जोड़ को उच्च गुणवत्ता वाले कोबाल्ट-क्रोमियम इम्प्लांट से बदलना।',
    recoveryTimeline: 'Assisted walking on day 2. Physiotherapy included.',
    recoveryTimelineHi: 'दूसरे दिन से फिजियोथेरेपी की मदद से चलना शुरू।',
  },
  {
    id: 'surg-hernia',
    shortName: 'Hernia repair',
    shortNameHi: 'हर्निया ऑपरेशन (Hernia Repair)',
    name: 'Laparoscopic Hernioplasty',
    nameHi: 'लैप्रोस्कोपिक हर्नियोप्लास्टी (Mesh Repair)',
    category: 'GeneralSurgery',
    stayDays: '1 day stay',
    stayDaysHi: '1 दिन भर्ती',
    price: 38000,
    tag: 'Daycare / 24 hrs',
    tagHi: '24 घंटे में छुट्टी',
    whatItInvolves:
      'High-grade surgical mesh reinforcement for inguinal or umbilical wall weakness.',
    whatItInvolvesHi:
      'कमजोर पेट की दीवार को मेडिकल मेश (जाली) लगाकर सुरक्षित रूप से मजबूत करना।',
    recoveryTimeline: 'Discharge within 24 hours. Light desk work in 3 days.',
    recoveryTimelineHi: '24 घंटे में डिस्चार्ज। 3 दिन में हल्का काम संभव।',
  },
  {
    id: 'surg-csection',
    shortName: 'Maternity delivery',
    shortNameHi: 'डिलीवरी व प्रसूति (C-Section)',
    name: 'Normal & C-Section Package',
    nameHi: 'नॉर्मल व सिजेरियन डिलीवरी (Maternity)',
    category: 'Maternity',
    stayDays: '2–3 days stay',
    stayDaysHi: '2–3 दिन भर्ती',
    price: 55000,
    tag: 'Baby care included',
    tagHi: 'शिशु देखभाल व कमरा शामिल',
    whatItInvolves:
      'Complete delivery package with pediatrician attendance, baby care, and lactation consult.',
    whatItInvolvesHi:
      'बाल रोग विशेषज्ञ, नवजात शिशु देखभाल और स्तनपान परामर्श सहित संपूर्ण प्रसूति पैकेज।',
    recoveryTimeline: '24–48 hours private room monitoring.',
    recoveryTimelineHi: '24–48 घंटे प्राइवेट रूम में विशेषज्ञ देखरेख।',
  },
  {
    id: 'surg-angioplasty',
    shortName: 'Coronary angioplasty',
    shortNameHi: 'हार्ट एंजियोप्लास्टी (Heart Stent)',
    name: 'PTCA with Drug Eluting Stent',
    nameHi: 'ड्रग एल्यूटिंग स्टेंट एंजियोप्लास्टी (PTCA)',
    category: 'Cardiology',
    stayDays: '2 days stay',
    stayDaysHi: '2 दिन भर्ती',
    price: 110000,
    tag: 'Cardiac desk',
    tagHi: 'कार्डियक डेस्क सहायता',
    whatItInvolves:
      'Radial or femoral artery catheterization to clear blockages with DES stent.',
    whatItInvolvesHi:
      'धमनियों में जमा ब्लॉकेज को हटाकर यूएस-एफडीए स्वीकृत स्टेंट लगाना।',
    recoveryTimeline: 'Radial site recovery with normal walking next morning.',
    recoveryTimelineHi: 'अगली सुबह से सामान्य चलना-फिरना शुरू।',
  },
  {
    id: 'surg-kidney-stone',
    shortName: 'Kidney stone removal',
    shortNameHi: 'गुर्दे की पथरी लेजर (Kidney Stone)',
    name: 'Laser RIRS / PCNL Lithotripsy',
    nameHi: 'लेजर RIRS / PCNL लिथोट्रिप्सी (Laser)',
    category: 'Urology',
    stayDays: '1 day stay',
    stayDaysHi: '1 दिन भर्ती',
    price: 42000,
    tag: 'No-cut laser',
    tagHi: 'बिना चीरे वाली लेजर',
    whatItInvolves:
      'Holmium laser dusting of stones through natural urinary tract with zero incisions.',
    whatItInvolvesHi:
      'होलमियम लेजर द्वारा बिना किसी चीरे के पथरी को पाउडर बनाकर बाहर निकालना।',
    recoveryTimeline: 'Same-day or next-morning discharge.',
    recoveryTimelineHi: 'उसी दिन या अगली सुबह तक डिस्चार्ज।',
  },
  {
    id: 'surg-cataract',
    shortName: 'Cataract eye surgery',
    shortNameHi: 'मोतियाबिंद ऑपरेशन (Cataract)',
    name: 'Micro-Incision Phaco Laser',
    nameHi: 'माइक्रो-इंसीजन फेको लेजर (Phaco Lens)',
    category: 'Ophthalmology',
    stayDays: 'Daycare (4 hrs)',
    stayDaysHi: 'डेकेयर (4 घंटे)',
    price: 24000,
    tag: 'Bladeless phaco',
    tagHi: 'ब्लेडलेस फोल्डेबल लेंस',
    whatItInvolves:
      'Foldable hydrophobic IOL lens implantation under gentle topical drop anesthesia.',
    whatItInvolvesHi:
      'आई-ड्रॉप एनेस्थीसिया के साथ प्रीमियम हाइड्रोफोबिक फोल्डेबल लेंस प्रत्यारोपण।',
    recoveryTimeline: 'Walk home in 4 hours; crystal clear vision next day.',
    recoveryTimelineHi: '4 घंटे में घर जाएं; अगले दिन से स्पष्ट दृष्टि।',
  },
  {
    id: 'surg-appendix',
    shortName: 'Appendectomy',
    shortNameHi: 'अपेंडिक्स सर्जरी (Appendectomy)',
    name: 'Emergency Laparoscopic Appendectomy',
    nameHi: 'इमरजेंसी लैप्रोस्कोपिक अपेंडिसेक्टॉमी',
    category: 'GeneralSurgery',
    stayDays: '1–2 days stay',
    stayDaysHi: '1–2 दिन भर्ती',
    price: 40000,
    tag: 'Emergency fast-track',
    tagHi: 'आपातकालीन त्वरित भर्ती',
    whatItInvolves:
      'Urgent keyhole removal of inflamed appendix to prevent abdominal perforation.',
    whatItInvolvesHi:
      'सूजे हुए अपेंडिक्स को कीहोल सर्जरी से तुरंत सुरक्षित रूप से बाहर निकालना।',
    recoveryTimeline: 'Prompt discharge within 24–36 hours.',
    recoveryTimelineHi: '24–36 घंटों के भीतर सुरक्षित डिस्चार्ज।',
  },
];

export const MASTER_HOSPITALS: HospitalAdmissionInfo[] = [
  {
    id: 'hosp-1',
    name: 'Santokba Durlabhji Memorial Hospital (SDMH)',
    nameHi: 'संतोकाबा दुर्लभजी मेमोरियल अस्पताल (SDMH)',
    location: 'Bhawani Singh Marg, Rambagh, Jaipur',
    locationHi: 'भवानी सिंह मार्ग, रामबाग, जयपुर',
    distance_km: 1.8,
    image_url:
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    total_reviews: 680,
    tag: 'Best Hospital • NABH Accredited',
    tagHi: 'सर्वश्रेष्ठ अस्पताल • NABH प्रमाणित',
    specialties: ['ENT & Micro-Surgery', 'General Surgery', 'Orthopaedics'],
    specialtiesHi: ['ईएनटी व माइक्रो-सर्जरी', 'जनरल सर्जरी', 'हड्डी व जोड़'],
  },
  {
    id: 'hosp-2',
    name: 'Eternal Hospital (EHCC)',
    nameHi: 'इटरनल हॉस्पिटल (EHCC)',
    location: 'Jawahar Circle, Malviya Nagar, Jaipur',
    locationHi: 'जवाहर सर्किल, मालवीय नगर, जयपुर',
    distance_km: 3.2,
    image_url:
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
    rating: 5.0,
    total_reviews: 540,
    tag: 'Multi-Specialty • JCI & NABH',
    tagHi: 'मल्टी-स्पेशियलिटी • JCI व NABH',
    specialties: ['Cardiac Surgery', 'Joint Replacement', 'Laparoscopy'],
    specialtiesHi: ['हृदय शल्य चिकित्सा', 'जोड़ प्रत्यारोपण', 'लैप्रोस्कोपी'],
  },
  {
    id: 'hosp-3',
    name: 'Fortis Escorts Hospital Jaipur',
    nameHi: 'फोर्टिस एस्कॉर्ट्स अस्पताल जयपुर',
    location: 'Jawaharlal Nehru Marg, Malviya Nagar, Jaipur',
    locationHi: 'जवाहरलाल नेहरू मार्ग, मालवीय नगर, जयपुर',
    distance_km: 4.1,
    image_url:
      'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    total_reviews: 420,
    tag: 'Advanced Inpatient • NABH',
    tagHi: 'उन्नत भर्ती केंद्र • NABH',
    specialties: ['Cardiology & Cardiac Surgery', 'Neurosurgery', 'Urology'],
    specialtiesHi: ['हृदय रोग व सर्जरी', 'न्यूरोसर्जरी', 'मूत्र रोग'],
  },
  {
    id: 'hosp-4',
    name: 'Sawai Man Singh (SMS) Medical Center',
    nameHi: 'सवाई मानसिंह (SMS) मेडिकल सेंटर',
    location: 'JLN Marg, Ashok Nagar, Jaipur',
    locationHi: 'जेएलएन मार्ग, अशोक नगर, जयपुर',
    distance_km: 2.1,
    image_url:
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
    rating: 4.7,
    total_reviews: 890,
    tag: 'Premier Care & Surgery Center',
    tagHi: 'प्रमुख चिकित्सा व सर्जरी केंद्र',
    specialties: ['General & Laparoscopic Surgery', 'Trauma Care', 'Internal Medicine'],
    specialtiesHi: ['जनरल व लैप्रोस्कोपिक सर्जरी', 'ट्रॉमा केयर', 'आंतरिक चिकित्सा'],
  },
];
