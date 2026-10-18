import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'hi';

interface Translations {
  appName: string;
  tagline: string;
  locationDefault: string;
  greetingUser: string;
  healthMotto: string;
  healthMatters: string;
  searchPlaceholder: string;
  // 4 Services
  opdTitle: string;
  opdSub: string;
  investigationsTitle: string;
  investigationsSub: string;
  pharmacyTitle: string;
  pharmacySub: string;
  ipdTitle: string;
  ipdSub: string;
  // Checkup Banner
  checkupBadge: string;
  checkupTitle: string;
  checkupSub: string;
  viewOffersBtn: string;
  // Family Vault
  familyVaultTitle: string;
  familyVaultSub: string;
  familyVaultCta: string;
  goldBadge: string;
  // Quick Access
  quickAccessTitle: string;
  viewAll: string;
  upcomingAppointment: string;
  appointmentDoctor: string;
  appointmentDate: string;
  appointmentTime: string;
  // Exclusive Offers
  exclusiveOffers: string;
  offerFlat20: string;
  offerMedicinesSub: string;
  shopNow: string;
  offer50Checkup: string;
  // Specialties
  specialtiesTitle: string;
  specialtiesSub: string;
  generalPhysician: string;
  cardiologist: string;
  orthopedic: string;
  pediatrician: string;
  dermatologist: string;
  dentist: string;
  // Trust Strip
  trustHospitals: string;
  trustLabs: string;
  trustCashless: string;
  trustMeds: string;
  // Checkup Details
  fullBodyPkg: string;
  fullBodyPkgSub: string;
  checkupPkgTestsCount: string;
  checkupPkgOrgans: string;
  nablAccredited: string;
  discount50: string;
  homeSample: string;
  fastReports: string;
  bookConsultPill: string;
  bookNowCta: string;
  // 2x2 Grid Labels
  opdGridTitle: string;
  opdGridSub: string;
  investigationsGridTitle: string;
  investigationsGridSub: string;
  pharmacyGridTitle: string;
  pharmacyGridSub: string;
  ipdGridTitle: string;
  ipdGridSub: string;
  // Checkup Tags
  tagBlood: string;
  tagOrgans: string;
  tagLipid: string;
  // Vault Tags
  vaultCardDesc: string;
  vaultTagAbha: string;
  vaultTagMembers: string;
  vaultTagDiscount: string;
  vaultTagZeroPaperwork: string;
  vaultCardCta: string;
  // Tabs
  tabHome: string;
  tabOpd: string;
  tabLabs: string;
  tabPharmacy: string;
  tabIpd: string;
  tabProfile: string;
  // OPD Page Redesign
  opdPageTitle: string;
  opdPageSub: string;
  searchDoctorPlaceholder: string;
  categoriesTitle: string;
  allSpecialties: string;
  audiologist: string;
  psychiatrist: string;
  neurologist: string;
  nearbyHospitalsTitle: string;
  hospitalNetworksTitle: string;
  loadingSpecialists: string;
  partnerHospitalsCount: string;
  partnerPrivilegeTag: string;
  maskedCallingProtected: string;
  bookConsultationBtn: string;
  kmAway: string;
  offOpd: string;
  clearSearch: string;
  noHospitalsFound: string;
  noHospitalsFoundSub: string;
  noHospitalsSub: string;
  exploreBranchesDoctors: string;
  hideBranchesDoctors: string;
  branchesNearby: string;
  doctorsAvailable: string;
  selectBranch: string;
  doctorsAtBranch: string;
  bookSlot: string;
  experience: string;
  nextSlot: string;
  consultFee: string;
  preferredDoctorTitle: string;
  topSpecialistsTitle: string;
  quickCall: string;
  videoConsult: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appName: 'Adityam Niramayaa',
    tagline: 'Healthcare without fear',
    locationDefault: 'Koramangala, Bengaluru',
    greetingUser: 'Good Morning, Hardik 👋',
    healthMotto: "Take care of your health, it's your greatest asset.",
    healthMatters: 'Your health\nmatters ♡',
    searchPlaceholder: 'Search doctors, hospitals, tests, medicines...',
    opdTitle: 'OPD',
    opdSub: 'Doctor\nConsult',
    investigationsTitle: 'Investigations',
    investigationsSub: 'Tests &\nPackages',
    pharmacyTitle: 'Pharmacy',
    pharmacySub: 'Order\nMedicines',
    ipdTitle: 'IPD',
    ipdSub: 'Hospital\nAdmission',
    checkupBadge: 'Up to 50% Off',
    checkupTitle: 'Health Checkup Packages',
    checkupSub: 'Stay ahead. Stay healthy.',
    viewOffersBtn: 'View Offers ➔',
    familyVaultTitle: 'Adityam Family\nHealth Vault',
    familyVaultSub: 'Protection & discounts for all dependents',
    familyVaultCta: "Secure your family's health card ➔",
    goldBadge: 'Gold',
    quickAccessTitle: 'Your Quick Access',
    viewAll: 'View all ➔',
    upcomingAppointment: 'Upcoming Appointment',
    appointmentDoctor: 'Dr. Rohan Mehta • General Physician',
    appointmentDate: '24 Oct 2026',
    appointmentTime: '10:30 AM',
    exclusiveOffers: 'Exclusive Offers',
    offerFlat20: 'Flat 20% Off',
    offerMedicinesSub: 'on selected medicines',
    shopNow: 'Shop Now ➔',
    offer50Checkup: 'Up to 50% Off\non health packages',
    specialtiesTitle: 'Find Doctors by Specialty',
    specialtiesSub: 'Verified specialists with instant consultation',
    generalPhysician: 'General\nPhysician',
    cardiologist: 'Heart\nSpecialist',
    orthopedic: 'Bone &\nJoints',
    pediatrician: 'Child\nSpecialist',
    dermatologist: 'Skin &\nHair',
    dentist: 'Dental\nCare',
    trustHospitals: '150+ Partner Hospitals',
    trustLabs: '100% NABL Labs',
    trustCashless: '30-Min Cashless TPA',
    trustMeds: 'Genuine Medicines',
    fullBodyPkg: 'Comprehensive Full Body Checkup',
    fullBodyPkgSub: '72 Essential Parameters • Liver, Kidney, Sugar & Lipid',
    checkupPkgTestsCount: '72 essential tests',
    checkupPkgOrgans: 'Liver, kidney, blood sugar and lipid profile',
    nablAccredited: 'NABL-accredited partner lab',
    discount50: '50% OFF',
    homeSample: 'Free home sample pickup',
    fastReports: 'Reports in 12-24 hrs',
    bookConsultPill: 'Book Doctor Consult ➔',
    bookNowCta: 'Book Now ➔',
    opdGridTitle: 'Doctor Consult',
    opdGridSub: 'In-Clinic & Video',
    investigationsGridTitle: 'Lab Tests',
    investigationsGridSub: 'Free Home Sample',
    pharmacyGridTitle: 'Order Medicines',
    pharmacyGridSub: 'Flat 20% Off',
    ipdGridTitle: 'Hospital Care',
    ipdGridSub: 'Cashless Admission',
    tagBlood: 'Blood & Sugar',
    tagOrgans: 'Liver & Kidney',
    tagLipid: 'Lipid & Thyroid',
    vaultCardDesc: 'Zero-paperwork medical vault & 15% discount for family',
    vaultTagAbha: 'ABHA Linked',
    vaultTagMembers: 'Up to 6 Members',
    vaultTagDiscount: 'Flat 15% Off',
    vaultTagZeroPaperwork: 'Zero Paperwork',
    vaultCardCta: 'Access Health Vault ➔',
    tabHome: 'Home',
    tabOpd: 'OPD',
    tabLabs: 'Labs',
    tabPharmacy: 'Pharmacy',
    tabIpd: 'IPD',
    tabProfile: 'Profile',
    // OPD Page Redesign
    opdPageTitle: 'Find Your Health\nSpecialist',
    opdPageSub: 'Verified specialists & top partner hospitals near you',
    searchDoctorPlaceholder: 'Search Doctor, specialty, hospital...',
    categoriesTitle: 'Categories',
    allSpecialties: 'All',
    audiologist: 'Audiologist',
    psychiatrist: 'Psychiatrist',
    neurologist: 'Neurologist',
    nearbyHospitalsTitle: 'Nearby Partner Hospitals',
    hospitalNetworksTitle: 'Nearby Partner Hospitals',
    loadingSpecialists: 'Finding nearby verified specialists...',
    partnerHospitalsCount: 'Hospitals',
    partnerPrivilegeTag: 'Partner Privilege',
    maskedCallingProtected: 'Masked Calling Protected',
    bookConsultationBtn: 'Book Consultation',
    kmAway: 'km away',
    offOpd: 'OFF OPD',
    clearSearch: 'Clear Search',
    noHospitalsFound: 'No hospitals found',
    noHospitalsFoundSub: 'Try searching with another name or specialty',
    noHospitalsSub: 'Try searching with another name or specialty',
    exploreBranchesDoctors: 'Explore Branches & Doctors',
    hideBranchesDoctors: 'Hide Branches & Doctors',
    branchesNearby: 'Branches Nearby',
    doctorsAvailable: 'Verified Doctors',
    selectBranch: 'Select Branch Location',
    doctorsAtBranch: 'Verified Specialists at this Branch',
    bookSlot: 'Book Consult',
    experience: 'yrs exp',
    nextSlot: 'Next Slot',
    consultFee: 'Consult Fee',
    preferredDoctorTitle: 'Top Doctors',
    topSpecialistsTitle: 'All Specialists',
    quickCall: 'Call',
    videoConsult: 'Video',
  },
  hi: {
    appName: 'आदित्यम् निरामया:',
    tagline: 'बिना डर के स्वास्थ्य सेवा',
    locationDefault: 'कोरमंगला, बेंगलुरु',
    greetingUser: 'शुभ प्रभात, हार्दिक 👋',
    healthMotto: 'अपनी सेहत का ख्याल रखें, यह सबसे बड़ी पूंजी है।',
    healthMatters: 'आपकी सेहत\nअनमोल है ♡',
    searchPlaceholder: 'डॉक्टर, अस्पताल, टेस्ट, दवाइयां खोजें...',
    opdTitle: 'ओपीडी',
    opdSub: 'डॉक्टर\nपरामर्श',
    investigationsTitle: 'जांच (लैब्स)',
    investigationsSub: 'टेस्ट्स व\nपैकेजेस',
    pharmacyTitle: 'दवाइयां',
    pharmacySub: 'दवाइयां\nऑर्डर करें',
    ipdTitle: 'आईपीडी',
    ipdSub: 'अस्पताल\nभर्ती',
    checkupBadge: '50% तक छूट',
    checkupTitle: 'हेल्थ चेकअप पैकेज',
    checkupSub: 'आगे रहें। स्वस्थ रहें।',
    viewOffersBtn: 'ऑफर देखें ➔',
    familyVaultTitle: 'आदित्यम् फैमिली\nहेल्थ वॉल्ट',
    familyVaultSub: 'परिवार के सभी सदस्यों के लिए छूट व सुरक्षा',
    familyVaultCta: 'परिवार का हेल्थ कार्ड सुरक्षित करें ➔',
    goldBadge: 'गोल्ड',
    quickAccessTitle: 'क्विक एक्सेस',
    viewAll: 'सभी देखें ➔',
    upcomingAppointment: 'आगामी अपॉइंटमेंट',
    appointmentDoctor: 'डॉ. रोहन मेहता • जनरल फिजिशियन',
    appointmentDate: '24 अक्टूबर 2026',
    appointmentTime: '10:30 पूर्वाह्न',
    exclusiveOffers: 'खास ऑफर्स',
    offerFlat20: 'सीधे 20% छूट',
    offerMedicinesSub: 'काउंटर दवाइयों पर',
    shopNow: 'अभी खरीदें ➔',
    offer50Checkup: '50% तक छूट\nहेल्थ चेकअप पर',
    specialtiesTitle: 'विशेषज्ञ डॉक्टर खोजें',
    specialtiesSub: 'सत्यापित विशेषज्ञ तुरंत परामर्श के लिए उपलब्ध',
    generalPhysician: 'जनरल\nफिजिशियन',
    cardiologist: 'हृदय रोग\nविशेषज्ञ',
    orthopedic: 'हड्डी व\nजोड़',
    pediatrician: 'शिशु रोग\nविशेषज्ञ',
    dermatologist: 'त्वचा व\nबाल',
    dentist: 'दंत\nचिकित्सा',
    trustHospitals: '150+ पार्टनर अस्पताल',
    trustLabs: '100% NABL लैब्स',
    trustCashless: '30 मिनट कैशलेस TPA',
    trustMeds: '100% असली दवाइयां',
    fullBodyPkg: 'संपूर्ण शरीर स्वास्थ्य जांच (72 टेस्ट)',
    fullBodyPkgSub: '72 मुख्य टेस्ट्स • लिवर, किडनी, शुगर व लिपिड',
    checkupPkgTestsCount: '72 आवश्यक टेस्ट्स',
    checkupPkgOrgans: 'लिवर, किडनी, ब्लड शुगर व लिपिड प्रोफाइल',
    nablAccredited: 'NABL-प्रमाणित पार्टनर लैब',
    discount50: '50% छूट',
    homeSample: 'घर से मुफ़्त सैंपल पिकअप',
    fastReports: '12-24 घंटे में रिपोर्ट',
    bookConsultPill: 'डॉक्टर परामर्श लें ➔',
    bookNowCta: 'अभी बुक करें ➔',
    opdGridTitle: 'डॉक्टर परामर्श',
    opdGridSub: 'क्लिनिक व वीडियो',
    investigationsGridTitle: 'लैब टेस्ट्स',
    investigationsGridSub: 'घर से मुफ़्त सैंपल',
    pharmacyGridTitle: 'दवाइयां मंगाएं',
    pharmacyGridSub: 'सीधे 20% छूट',
    ipdGridTitle: 'अस्पताल भर्ती',
    ipdGridSub: 'कैशलेस एडमिशन',
    tagBlood: 'ब्लड व शुगर',
    tagOrgans: 'लिवर व किडनी',
    tagLipid: 'लिपिड व थायरॉइड',
    vaultCardDesc: 'कागज़रहित मेडिकल वॉल्ट व परिवार के लिए 15% छूट',
    vaultTagAbha: 'ABHA लिंक्ड',
    vaultTagMembers: '6 पारिवारिक सदस्य',
    vaultTagDiscount: '15% फैमिली छूट',
    vaultTagZeroPaperwork: 'कागज़रहित वॉल्ट',
    vaultCardCta: 'वॉल्ट कार्ड खोलें ➔',
    tabHome: 'होम',
    tabOpd: 'ओपीडी',
    tabLabs: 'जांच',
    tabPharmacy: 'दवाइयां',
    tabIpd: 'आईपीडी',
    tabProfile: 'प्रोफाइल',
    // OPD Page Redesign
    opdPageTitle: 'स्वास्थ्य विशेषज्ञ\nखोजें',
    opdPageSub: 'सत्यापित विशेषज्ञ डॉक्टर व पार्टनर अस्पताल',
    searchDoctorPlaceholder: 'डॉक्टर, स्पेशलिटी या अस्पताल खोजें...',
    categoriesTitle: 'श्रेणियां',
    allSpecialties: 'सभी',
    audiologist: 'ऑडियोलॉजिस्ट',
    psychiatrist: 'मनोचिकित्सक',
    neurologist: 'न्यूरोलॉजिस्ट',
    nearbyHospitalsTitle: 'नजदीकी पार्टनर अस्पताल',
    hospitalNetworksTitle: 'नजदीकी पार्टनर अस्पताल',
    loadingSpecialists: 'नजदीकी विशेषज्ञ डॉक्टर खोजे जा रहे हैं...',
    partnerHospitalsCount: 'अस्पताल',
    partnerPrivilegeTag: 'पार्टनर प्रिविलेज',
    maskedCallingProtected: 'मास्क्ड कॉलिंग सुरक्षित',
    bookConsultationBtn: 'परामर्श बुक करें',
    kmAway: 'किमी दूर',
    offOpd: 'छूट ओपीडी',
    clearSearch: 'सर्च हटाएं',
    noHospitalsFound: 'कोई अस्पताल नहीं मिला',
    noHospitalsFoundSub: 'कृपया अन्य नाम या स्पेशलिटी से खोजें',
    noHospitalsSub: 'कृपया अन्य नाम या स्पेशलिटी से खोजें',
    exploreBranchesDoctors: 'शाखाएं व डॉक्टर देखें',
    hideBranchesDoctors: 'शाखाएं व डॉक्टर छुपाएं',
    branchesNearby: 'नजदीकी शाखाएं',
    doctorsAvailable: 'सत्यापित डॉक्टर',
    selectBranch: 'शाखा चुनें',
    doctorsAtBranch: 'इस शाखा के सत्यापित विशेषज्ञ डॉक्टर',
    bookSlot: 'परामर्श बुक करें',
    experience: 'वर्ष अनुभव',
    nextSlot: 'अगला स्लॉट',
    consultFee: 'परामर्श शुल्क',
    preferredDoctorTitle: 'शीर्ष डॉक्टर',
    topSpecialistsTitle: 'सभी विशेषज्ञ डॉक्टर',
    quickCall: 'कॉल करें',
    videoConsult: 'वीडियो परामर्श',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
