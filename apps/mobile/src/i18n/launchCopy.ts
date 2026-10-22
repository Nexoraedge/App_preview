// src/i18n/launchCopy.ts
// Every word on the splash, walkthrough and loading states, in English and Hindi.
// Screens read these with pickCopy(language), so no text is written inside the screens.

export interface LaunchCopy {
  tagline: string;
  skip: string;
  next: string;
  start: string;
  slides: { title: string; body: string }[];
  services: { doctors: string; labs: string; pharmacy: string; hospital: string };
  nearYou: string;
  mock: { doctor: string; speciality: string; slots: string[]; payCta: string; booked: string };
  family: { you: string; self: string; mother: string; son: string; names: { mother: string; son: string }; add: string };
  loading: string[];
  failed: { title: string; body: string; retry: string };
}

const en: LaunchCopy = {
  tagline: 'Every Step Toward Better Health',
  skip: 'Skip',
  next: 'Next',
  start: 'Get started',
  slides: [
    {
      title: 'Aadityam Anukampa — Healthcare for All',
      body: 'Inspired by Pujya Muni 108 Shri Aditya Sagar Ji Maharaj & shaped by the vision of Abhishek Jain. Carrying forward Compassion, Service & Dignity.',
    },
    {
      title: 'Fast Priority Care & Transparent Pricing',
      body: 'Book top specialists (OPD), NABL-accredited lab checkups with home sample pickup, and genuine medicines with instant savings.',
    },
    {
      title: 'Dignity in Hospitalization for Every Family',
      body: 'From partner Jain healthcare institutions to top multi-specialty hospitals, cashless TPA support and respectful care for all.',
    },
  ],
  services: { doctors: 'Doctors', labs: 'Lab tests', pharmacy: 'Pharmacy', hospital: 'Hospital' },
  nearYou: 'Near you',
  mock: {
    doctor: 'Dr. Satish Jain',
    speciality: 'Chief ENT Specialist',
    slots: ['10:30 AM', '11:00 AM', '6:00 PM'],
    payCta: 'Pay in app & save 25%',
    booked: 'Booked',
  },
  family: {
    you: 'You',
    self: 'Abhishek Jain',
    mother: 'Mother',
    son: 'Son',
    names: { mother: 'Sunita Jain', son: 'Aarav Jain' },
    add: 'Add family member',
  },
  loading: ['Jai Jinendra…', 'Carrying forward Compassion & Service…', 'Getting your health care ready…'],
  failed: {
    title: "Couldn't load this",
    body: 'Check your internet connection and try again.',
    retry: 'Try again',
  },
};

const hi: LaunchCopy = {
  tagline: 'बेहतर स्वास्थ्य की ओर हर कदम',
  skip: 'छोड़ें',
  next: 'आगे',
  start: 'शुरू करें',
  slides: [
    {
      title: 'आदित्यम् अनुकम्पा — सबके लिए स्वास्थ्य',
      body: 'परम पूज्य मुनि 108 श्री आदित्य सागर जी महाराज की पावन प्रेरणा एवं श्री अभिषेक जैन के संकल्प से: करुणा, सेवा और मर्यादा।',
    },
    {
      title: 'सुलभ, तीव्र व पारदर्शी उपचार',
      body: 'वरिष्ठ विशेषज्ञ डॉक्टरों से प्राथमिकता परामर्श (OPD), NABL प्रमाणित लैब टेस्ट और दवाइयों पर अधिकतम बचत।',
    },
    {
      title: 'पूरे परिवार का स्वास्थ्य व मर्यादा',
      body: 'जैन समाज के प्रतिष्ठित संस्थानों से लेकर प्रमुख अस्पतालों तक, कैशलेस टीपीए व संपूर्ण पारिवारिक सुरक्षा।',
    },
  ],
  services: { doctors: 'डॉक्टर', labs: 'जांच', pharmacy: 'दवाइयां', hospital: 'अस्पताल' },
  nearYou: 'आपके पास',
  mock: {
    doctor: 'डॉ. सतीश जैन',
    speciality: 'वरिष्ठ ईएनटी विशेषज्ञ',
    slots: ['सुबह 10:30', 'सुबह 11:00', 'शाम 6:00'],
    payCta: 'ऐप में भुगतान करें और 25% बचाएं',
    booked: 'बुक हो गया',
  },
  family: {
    you: 'आप',
    self: 'अभिषेक जैन',
    mother: 'माँ',
    son: 'बेटा',
    names: { mother: 'सुनीता जैन', son: 'आरव जैन' },
    add: 'परिवार का सदस्य जोड़ें',
  },
  loading: ['जय जिनेन्द्र…', 'करुणा और सेवा की पावन भावना के साथ…', 'स्वास्थ्य सेवाएं तैयार हो रही हैं…'],
  failed: {
    title: 'लोड नहीं हो सका',
    body: 'इंटरनेट कनेक्शन जांचें और फिर कोशिश करें।',
    retry: 'फिर कोशिश करें',
  },
};

export const LAUNCH_COPY = { en, hi };
export const pickCopy = (language?: string): LaunchCopy => (language === 'hi' ? hi : en);
