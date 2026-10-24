// apps/mobile/src/i18n/opdCopy.ts
// Centralized bilingual translation dictionary for OPD Hospital & Doctor directory

export const opdCopy = {
  en: {
    headerTitle: 'OPD Care Concierge',
    headerSubtitle: 'Empanelled hospitals & verified super-specialists',
    tabHospitals: 'Hospitals',
    tabDoctors: 'Doctors',
    searchPlaceholderHospitals: "Search 'Jain ENT', 'CKS Hospital' or specialties...",
    searchPlaceholderDoctors: 'Search doctors by name, specialty, qualification...',
    
    // Sort
    sortByLabel: 'Sort by:',
    
    // Hospital Cards
    partnerPrivilege: 'Adityam Partner Hospital',
    reviewsLabel: 'reviews',
    discountPill: 'Discount on OPD & IPD',
    branchesCount: 'branches in city',
    verifiedDocsCount: 'verified doctors',
    viewDoctorsCta: 'View Doctors & Book ›',

    // Doctor Spotlight
    spotlightTitle: 'Top Specialists',
    spotlightSub: 'Verified senior consultants in your city',
    ratingsLabel: 'rating',
    expLabel: 'Experience',
    inAppFee: 'In-app fee',
    consultationTariff: 'Fair OPD Consultation Tariff',
    callConcierge: 'Call Concierge',
    bookAppointment: 'Book Appointment',
    allSpecialistsHeader: 'All Specialists in Network',

    // Doctor List Item
    availableSlot: 'Next Available Slot',
    payAtClinic: 'Pay at hospital/clinic',
    instantConfirm: 'Zero queue entry',

    // Floating Bar
    selectedSlotFor: 'Slot selected for',
    confirmBookingBar: 'Continue to Booking ›',

    // Booking Modal
    modalConfirmTitle: 'Confirm OPD Consultation',
    modalDoctorDetails: 'Doctor & Hospital Details',
    modalPickSlot: 'Select Preferred Time Slot',
    modalMorning: 'Morning Slots',
    modalEvening: 'Evening Slots',
    modalPatientName: 'Patient Name',
    modalPatientPhone: 'Contact Number',
    modalPaymentNote: 'Pay directly at hospital reception with community tariff guarantee.',
    modalConfirmBtn: 'Confirm Appointment ›',
    modalCancelBtn: 'Cancel',

    // Empty States
    noHospitalsFound: 'No partner hospitals found matching your criteria.',
    noDoctorsFound: 'No verified doctors found matching your criteria.',
    resetFilters: 'Reset Filters',
  },
  hi: {
    headerTitle: 'ओपीडी स्वास्थ्य सेवा',
    headerSubtitle: 'सत्यापित अस्पताल नेटवर्क एवं सुपर-स्पेशलिस्ट डॉक्टर्स',
    tabHospitals: 'अस्पताल',
    tabDoctors: 'डॉक्टर्स',
    searchPlaceholderHospitals: "खोजें 'जैन ईएनटी', 'सीकेएस' या विशेषता...",
    searchPlaceholderDoctors: 'डॉक्टर नाम, विशेषज्ञता या डिग्री खोजें...',

    // Sort
    sortByLabel: 'क्रमबद्ध करें:',

    // Hospital Cards
    partnerPrivilege: 'आदित्यम् पार्टनर अस्पताल',
    reviewsLabel: 'समीक्षाएं',
    discountPill: 'ओपीडी व भर्ती पर छूट',
    branchesCount: 'शाखाएं शहर में',
    verifiedDocsCount: 'सत्यापित विशेषज्ञ',
    viewDoctorsCta: 'डॉक्टर देखें व बुक करें ›',

    // Doctor Spotlight
    spotlightTitle: 'शीर्ष विशेषज्ञ डॉक्टर्स',
    spotlightSub: 'आपके शहर के प्रमुख प्रमाणित विशेषज्ञ',
    ratingsLabel: 'रेटिंग',
    expLabel: 'अनुभव',
    inAppFee: 'ऐप में निर्धारित शुल्क',
    consultationTariff: 'पारदर्शी ओपीडी परामर्श दर',
    callConcierge: 'हेल्पलाइन कॉल',
    bookAppointment: 'अपॉइंटमेंट बुक करें',
    allSpecialistsHeader: 'नेटवर्क के सभी विशेषज्ञ चिकित्सक',

    // Doctor List Item
    availableSlot: 'उपलब्ध परामर्श समय',
    payAtClinic: 'अस्पताल में भुगतान',
    instantConfirm: 'कतार-मुक्त प्रवेश',

    // Floating Bar
    selectedSlotFor: 'स्लॉट चुना गया',
    confirmBookingBar: 'बुकिंग जारी रखें ›',

    // Booking Modal
    modalConfirmTitle: 'ओपीडी परामर्श सुनिश्चित करें',
    modalDoctorDetails: 'डॉक्टर एवं अस्पताल विवरण',
    modalPickSlot: 'सुविधाजनक समय स्लॉट चुनें',
    modalMorning: 'प्रातःकालीन स्लॉट्स',
    modalEvening: 'सायंकालीन स्लॉट्स',
    modalPatientName: 'मरीज का नाम',
    modalPatientPhone: 'संपर्क मोबाइल नंबर',
    modalPaymentNote: 'अस्पताल रिसेप्शन पर पूर्व-निर्धारित संस्थागत दर पर सीधा भुगतान।',
    modalConfirmBtn: 'अपॉइंटमेंट सुनिश्चित करें ›',
    modalCancelBtn: 'रद्द करें',

    // Empty States
    noHospitalsFound: 'आपके चयन अनुसार कोई पार्टनर अस्पताल नहीं मिला।',
    noDoctorsFound: 'आपके चयन अनुसार कोई प्रमाणित डॉक्टर नहीं मिला।',
    resetFilters: 'फ़िल्टर हटाएं',
  },
} as const;
