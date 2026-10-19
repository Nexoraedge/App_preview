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
  tagline: 'Healthcare without fear',
  skip: 'Skip',
  next: 'Next',
  start: 'Get started',
  slides: [
    { title: 'Care near you, in one app', body: 'Find doctors, lab tests, pharmacies and hospital admissions close to you.' },
    { title: 'Book in a few taps', body: 'Pick a doctor and a time, then pay in the app to save more.' },
    { title: 'The whole family, one place', body: 'Add family members and book for them. Every booking stays together.' },
  ],
  services: { doctors: 'Doctors', labs: 'Lab tests', pharmacy: 'Pharmacy', hospital: 'Hospital' },
  nearYou: 'Near you',
  mock: {
    doctor: 'Dr. Priya Sharma',
    speciality: 'Paediatrics',
    slots: ['10:30 AM', '11:00 AM', '6:00 PM'],
    payCta: 'Pay in app & save',
    booked: 'Booked',
  },
  family: {
    you: 'You',
    self: 'Account holder',
    mother: 'Mother',
    son: 'Son',
    names: { mother: 'Asha Sharma', son: 'Rohan Sharma' },
    add: 'Add family member',
  },
  loading: ['Getting things ready…', 'Finding care near you…', 'Almost there…'],
  failed: {
    title: "Couldn't load this",
    body: 'Check your internet connection and try again.',
    retry: 'Try again',
  },
};

const hi: LaunchCopy = {
  tagline: 'बिना डर के स्वास्थ्य सेवा',
  skip: 'छोड़ें',
  next: 'आगे',
  start: 'शुरू करें',
  slides: [
    { title: 'आपके पास स्वास्थ्य सेवा, एक ही ऐप में', body: 'अपने पास के डॉक्टर, जांच केंद्र, दवाई की दुकानें और अस्पताल में भर्ती की जानकारी पाएं।' },
    { title: 'कुछ ही टैप में बुकिंग', body: 'डॉक्टर और समय चुनें, फिर ऐप में भुगतान करके ज़्यादा बचाएं।' },
    { title: 'पूरा परिवार, एक ही जगह', body: 'परिवार के सदस्य जोड़ें और उनके लिए बुक करें। सभी बुकिंग एक साथ रहती हैं।' },
  ],
  services: { doctors: 'डॉक्टर', labs: 'जांच', pharmacy: 'दवाइयां', hospital: 'अस्पताल' },
  nearYou: 'आपके पास',
  mock: {
    doctor: 'डॉ. प्रिया शर्मा',
    speciality: 'शिशु रोग',
    slots: ['सुबह 10:30', 'सुबह 11:00', 'शाम 6:00'],
    payCta: 'ऐप में भुगतान करें और बचाएं',
    booked: 'बुक हो गया',
  },
  family: {
    you: 'आप',
    self: 'खाता धारक',
    mother: 'माँ',
    son: 'बेटा',
    names: { mother: 'आशा शर्मा', son: 'रोहन शर्मा' },
    add: 'परिवार का सदस्य जोड़ें',
  },
  loading: ['तैयारी हो रही है…', 'आपके पास की सेवाएं खोज रहे हैं…', 'बस थोड़ा इंतज़ार…'],
  failed: {
    title: 'लोड नहीं हो सका',
    body: 'इंटरनेट कनेक्शन जांचें और फिर कोशिश करें।',
    retry: 'फिर कोशिश करें',
  },
};

export const LAUNCH_COPY = { en, hi };
export const pickCopy = (language?: string): LaunchCopy => (language === 'hi' ? hi : en);
