// src/data/labsSample.ts
// SAMPLE DATA FOR THE PROTOTYPE ONLY.
// Centre names are invented. Prices, report times and ratings are placeholders.
// Later this becomes three Supabase tables: items, centres, centre_prices (centre_id, item_id, price).

export type Segment = 'lab' | 'scan' | 'package';

export interface Category {
  id: string;
  label: string;
  labelHi: string;
  icon: string; // key into ICONS in labs.tsx
  tint: string;
  color: string;
}

export interface Item {
  id: string;
  name: string;
  nameHi: string;
  segment: Segment;
  category: string;
  reportHrs: number;
  fastingHrs: number | null;
  about: string;
  aboutHi: string;
  prep: string;
  prepHi: string;
  testsCount?: number;
  gradient?: [string, string];
}

export interface Centre {
  id: string;
  name: string;
  nameHi?: string;
  area: string;
  areaHi?: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  home: boolean;
  nextSlot: string;
  offers: Segment[];
  factor: number; // price multiplier against BASE
  exclude?: string[];
  lat?: number;
  lng?: number;
  city?: string;
}

export const CATEGORIES: Record<'lab' | 'scan', Category[]> = {
  lab: [
    { id: 'blood', label: 'Blood', labelHi: 'खून की जांच', icon: 'Droplets', tint: '#FEE9EC', color: '#E11D48' },
    { id: 'diabetes', label: 'Diabetes', labelHi: 'डायबिटीज', icon: 'Activity', tint: '#EAF1FF', color: '#2563EB' },
    { id: 'thyroid', label: 'Thyroid', labelHi: 'थायरॉइड', icon: 'Waves', tint: '#F1EBFF', color: '#7C3AED' },
    { id: 'heart', label: 'Heart', labelHi: 'हृदय (Heart)', icon: 'HeartPulse', tint: '#FFECEC', color: '#DC2626' },
    { id: 'vitamins', label: 'Vitamins', labelHi: 'विटामिन्स', icon: 'Sun', tint: '#FFF4E0', color: '#D97706' },
    { id: 'organ', label: 'Liver & Kidney', labelHi: 'लिवर व किडनी', icon: 'FlaskConical', tint: '#E7F8F0', color: '#059669' },
    { id: 'fever', label: 'Fever', labelHi: 'बुखार / संक्रमण', icon: 'Thermometer', tint: '#E6F7FB', color: '#0891B2' },
    { id: 'women', label: "Women's", labelHi: 'महिला स्वास्थ्य', icon: 'Flower2', tint: '#FDEBF4', color: '#DB2777' },
  ],
  scan: [
    { id: 'xray', label: 'X-Ray', labelHi: 'एक्स-रे', icon: 'Bone', tint: '#FFF4E0', color: '#D97706' },
    { id: 'ct', label: 'CT Scan', labelHi: 'सीटी स्कैन', icon: 'ScanLine', tint: '#EAF1FF', color: '#2563EB' },
    { id: 'mri', label: 'MRI', labelHi: 'एमआरआई', icon: 'Brain', tint: '#F1EBFF', color: '#7C3AED' },
    { id: 'usg', label: 'Ultrasound', labelHi: 'अल्ट्रासाउंड', icon: 'Waves', tint: '#E6F7FB', color: '#0891B2' },
    { id: 'ecg', label: 'Heart tests', labelHi: 'ईसीजी / इको', icon: 'Activity', tint: '#FFECEC', color: '#DC2626' },
  ],
};



export const ITEMS: Item[] = [
  // ---- Lab tests ----
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC)',
    nameHi: 'कम्प्लीट ब्लड काउंट (CBC)',
    segment: 'lab',
    category: 'blood',
    reportHrs: 6,
    fastingHrs: null,
    about: 'Counts red cells, white cells and platelets. Used to check for anaemia, infection and general health.',
    aboutHi: 'लाल रक्त कोशिकाओं, सफेद कोशिकाओं और प्लेटलेट्स की संख्या मापता है। एनीमिया, संक्रमण और सामान्य स्वास्थ्य की जांच हेतु।',
    prep: 'No special preparation.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'hba1c',
    name: 'HbA1c (3-month sugar)',
    nameHi: 'एचबीए1सी (HbA1c - 3 माह का शुगर)',
    segment: 'lab',
    category: 'diabetes',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Shows your average blood sugar over about three months. Useful for diabetes monitoring.',
    aboutHi: 'पिछले 3 महीनों का औसत ब्लड शुगर स्तर दिखाता है। डायबिटीज की निरंतर निगरानी के लिए अत्यंत उपयोगी।',
    prep: 'No fasting needed.',
    prepHi: 'खाली पेट रहने की आवश्यकता नहीं है।',
  },
  {
    id: 'fbs',
    name: 'Fasting Blood Sugar',
    nameHi: 'फास्टिंग ब्लड शुगर (FBS)',
    segment: 'lab',
    category: 'diabetes',
    reportHrs: 6,
    fastingHrs: 8,
    about: 'Measures blood sugar after an overnight fast.',
    aboutHi: 'रातभर खाली पेट रहने के बाद शरीर में ग्लूकोज के स्तर की सटीक जांच।',
    prep: 'Do not eat for 8 hours. Plain water is fine.',
    prepHi: '8 घंटे तक कुछ न खाएं। सादा पानी पी सकते हैं।',
  },
  {
    id: 'thyroid',
    name: 'Thyroid Profile (T3, T4, TSH)',
    nameHi: 'थायरॉइड प्रोफाइल (T3, T4, TSH)',
    segment: 'lab',
    category: 'thyroid',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Checks how well your thyroid gland is working.',
    aboutHi: 'आपकी थायरॉइड ग्रंथि के कार्य और हार्मोन संतुलन (T3, T4, TSH) की जांच करता है।',
    prep: 'No fasting needed. Take your usual medicines unless your doctor says otherwise.',
    prepHi: 'खाली पेट की आवश्यकता नहीं। जब तक डॉक्टर न कहें, सामान्य दवाएं लेते रहें।',
  },
  {
    id: 'lipid',
    name: 'Lipid Profile',
    nameHi: 'लिपिड प्रोफाइल (कोलेस्ट्रॉल जांच)',
    segment: 'lab',
    category: 'heart',
    reportHrs: 12,
    fastingHrs: 10,
    about: 'Measures cholesterol and triglycerides to assess heart risk.',
    aboutHi: 'हृदय रोग और ब्लॉकेज के खतरे का आकलन करने हेतु गुड/बैड कोलेस्ट्रॉल और ट्राइग्लिसराइड्स की जांच।',
    prep: 'Fast for 10 hours. Plain water is fine.',
    prepHi: '10 घंटे तक खाली पेट रहें। सादा पानी पी सकते हैं।',
  },
  {
    id: 'vitd',
    name: 'Vitamin D (25-OH)',
    nameHi: 'विटामिन डी (25-OH)',
    segment: 'lab',
    category: 'vitamins',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Checks vitamin D level for bone and muscle strength.',
    aboutHi: 'हड्डियों, जोड़ों और मांसपेशियों की मजबूती के लिए विटामिन डी स्तर का सटीक परीक्षण।',
    prep: 'No special preparation.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'b12',
    name: 'Vitamin B12',
    nameHi: 'विटामिन बी12',
    segment: 'lab',
    category: 'vitamins',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Checks B12 for nerve health and red blood cell production.',
    aboutHi: 'नसों के स्वास्थ्य, थकान मुक्ति और नई लाल रक्त कोशिकाओं के निर्माण हेतु बी12 स्तर की जांच।',
    prep: 'No special preparation.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'lft',
    name: 'Liver Function Test (LFT)',
    nameHi: 'लिवर फंक्शन टेस्ट (LFT)',
    segment: 'lab',
    category: 'organ',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Measures enzymes and proteins to check liver health.',
    aboutHi: 'बिलीरुबिन, एसजीओटी, एसजीपीटी और प्रोटीन जांच से लिवर स्वास्थ्य और पाचन क्षमता का आकलन।',
    prep: 'No fasting needed.',
    prepHi: 'खाली पेट रहने की आवश्यकता नहीं है।',
  },
  {
    id: 'kft',
    name: 'Kidney Function Test (KFT)',
    nameHi: 'किडनी फंक्शन टेस्ट (KFT / RFT)',
    segment: 'lab',
    category: 'organ',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Checks creatinine, urea and electrolytes for kidney health.',
    aboutHi: 'सीरम क्रिएटिनिन, यूरिया और यूरिक एसिड द्वारा गुर्दे (किडनी) के फिल्टर कार्य की जांच।',
    prep: 'No fasting needed.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'dengue',
    name: 'Dengue NS1 Antigen',
    nameHi: 'डेंगू एनएस1 एंटीजन (Dengue NS1)',
    segment: 'lab',
    category: 'fever',
    reportHrs: 6,
    fastingHrs: null,
    about: 'Early test for dengue infection in the first days of fever.',
    aboutHi: 'बुखार के शुरुआती 1-2 दिनों में ही डेंगू वायरस संक्रमण का सटीक पता लगाने हेतु रक्त जांच।',
    prep: 'No preparation.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'typhoid',
    name: 'Typhoid (Widal)',
    nameHi: 'टाइफाइड विडाल टेस्ट (Widal Test)',
    segment: 'lab',
    category: 'fever',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Helps detect typhoid fever.',
    aboutHi: 'साल्मोनेला बैक्टीरिया के कारण होने वाले टाइफाइड और मियादी बुखार के संक्रमण की पहचान।',
    prep: 'No preparation.',
    prepHi: 'किसी तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'bhcg',
    name: 'Pregnancy Test (Beta hCG)',
    nameHi: 'प्रेग्नेंसी टेस्ट (बीटा एचसीजी)',
    segment: 'lab',
    category: 'women',
    reportHrs: 6,
    fastingHrs: null,
    about: 'Blood test that confirms pregnancy early.',
    aboutHi: 'गर्भावस्था की शुरुआती, सटीक और परिमाणात्मक पुष्टि करने वाला क्लीनिकल रक्त परीक्षण।',
    prep: 'No preparation.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },

  // ---- Scans ----
  {
    id: 'xr-chest',
    name: 'Chest X-Ray (PA view)',
    nameHi: 'चेस्ट एक्स-रे (PA View)',
    segment: 'scan',
    category: 'xray',
    reportHrs: 2,
    fastingHrs: null,
    about: 'Images of the lungs and heart outline.',
    aboutHi: 'फेफड़ों के संक्रमण, निमोनिया और हृदय के आकार की डिजिटल एक्स-रे इमेजिंग।',
    prep: 'Remove metal items from the chest area.',
    prepHi: 'छाती के हिस्से से सभी धातु की वस्तुएं और आभूषण हटा दें।',
  },
  {
    id: 'xr-knee',
    name: 'X-Ray Knee (AP & Lateral)',
    nameHi: 'एक्स-रे घुटना (AP और Lateral)',
    segment: 'scan',
    category: 'xray',
    reportHrs: 2,
    fastingHrs: null,
    about: 'Images of knee joint bones to check for arthritis or injury.',
    aboutHi: 'घुटने के जोड़ों, हड्डियों के घिसाव (गठिया/आर्थराइटिस) या चोट की जांच।',
    prep: 'No special prep.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'xr-spine',
    name: 'X-Ray Spine (L-S / Cervical)',
    nameHi: 'एक्स-रे रीढ़ की हड्डी (कमर व गर्दन)',
    segment: 'scan',
    category: 'xray',
    reportHrs: 2,
    fastingHrs: null,
    about: 'Images of the neck or lower back vertebrae.',
    aboutHi: 'गर्दन या कमर की रीढ़ की हड्डी, डिस्क के गैप और सर्वाइकल/लम्बर दर्द की जांच।',
    prep: 'No special prep.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'usg-abd',
    name: 'Ultrasound Whole Abdomen',
    nameHi: 'अल्ट्रासाउंड पेट संपूर्ण (USG Abdomen)',
    segment: 'scan',
    category: 'usg',
    reportHrs: 2,
    fastingHrs: 4,
    about: 'Ultrasound scan of liver, gall bladder, kidneys, spleen and bladder.',
    aboutHi: 'लिवर, पित्त की थैली की पथरी, किडनी और पेट के सभी आंतरिक अंगों की सोनोग्राफी।',
    prep: 'Fast 4 hours. Full urinary bladder needed (drink 4-5 glasses of water).',
    prepHi: '4 घंटे खाली पेट रहें। पेशाब रोक कर रखें (4-5 गिलास पानी पिएं)।',
  },
  {
    id: 'ct-head',
    name: 'CT Scan Head / Brain',
    nameHi: 'सीटी स्कैन सिर व मस्तिष्क (CT Head)',
    segment: 'scan',
    category: 'ct',
    reportHrs: 4,
    fastingHrs: null,
    about: 'Cross-sectional imaging of brain for trauma, stroke or headache.',
    aboutHi: 'सिर की चोट, स्ट्रोक, रक्तस्राव या गंभीर सिरदर्द की जांच हेतु मस्तिष्क का सीटी स्कैन।',
    prep: 'Remove hairpins, earrings and metal objects.',
    prepHi: 'कान की बालियां, हेयरपिन और धातु की सभी वस्तुएं उतार दें।',
  },
  {
    id: 'ct-chest',
    name: 'HRCT Chest',
    nameHi: 'एचआरसीटी चेस्ट (HRCT Chest)',
    segment: 'scan',
    category: 'ct',
    reportHrs: 4,
    fastingHrs: null,
    about: 'High-resolution scan of lung tissues.',
    aboutHi: 'फेफड़ों के संक्रमण, फाइब्रोसिस और एलर्जी की उच्च-रिज़ॉल्यूशन 3D इमेजिंग।',
    prep: 'Wear comfortable loose clothing without metal zips.',
    prepHi: 'धातु की ज़िप रहित आरामदायक ढीले कपड़े पहनें।',
  },
  {
    id: 'mri-brain',
    name: 'MRI Brain',
    nameHi: 'एमआरआई ब्रेन (MRI Brain)',
    segment: 'scan',
    category: 'mri',
    reportHrs: 6,
    fastingHrs: null,
    about: 'Detailed magnetic resonance imaging of brain tissues and nerves.',
    aboutHi: 'मस्तिष्क के ऊतकों, नसों, ट्यूमर और तंत्रिका तंत्र की अत्यंत विस्तृत एमआरआई इमेजिंग।',
    prep: 'Strictly no metallic implants, pacemakers or metallic items allowed.',
    prepHi: 'पेसमेकर या किसी भी प्रकार के धातु इम्प्लांट के साथ अनुमति नहीं है।',
  },
  {
    id: 'mri-knee',
    name: 'MRI Knee Joint',
    nameHi: 'एमआरआई घुटना जोड़ (MRI Knee)',
    segment: 'scan',
    category: 'mri',
    reportHrs: 6,
    fastingHrs: null,
    about: 'Detailed MRI of knee ligaments (ACL/PCL) and cartilage.',
    aboutHi: 'घुटने के लिगामेंट (एसीएल/पीसीएल टियर), कार्टिलेज और मिनिसकस की सूक्ष्म जांच।',
    prep: 'Remove all metallic items before the scan.',
    prepHi: 'जांच से पहले सभी धातु की वस्तुएं उतार दें।',
  },
  {
    id: 'ecg',
    name: 'ECG (12-Lead)',
    nameHi: 'ईसीजी (12-लीड हृदय जांच)',
    segment: 'scan',
    category: 'ecg',
    reportHrs: 1,
    fastingHrs: null,
    about: 'Records electrical activity of the heart for rhythm and ischemia.',
    aboutHi: 'हृदय की धड़कन, गति और दिल के दौरे (एंजाइना) के शुरुआती लक्षणों की 12-लीड जांच।',
    prep: 'No special prep. Keep relaxed.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं। शांत रहें।',
  },
  {
    id: 'echo',
    name: '2D Echocardiography (ECHO)',
    nameHi: '2D इकोकार्डियोग्राफी (2D Echo)',
    segment: 'scan',
    category: 'ecg',
    reportHrs: 2,
    fastingHrs: null,
    about: 'Ultrasound of the beating heart to check pumping and valves.',
    aboutHi: 'हृदय के वाल्व, पंपिंग क्षमता (इजेक्शन फ्रैक्शन) और कार्यप्रणाली का रंगीन अल्ट्रासाउंड।',
    prep: 'No special preparation needed.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },

  // ---- Packages ----
  {
    id: 'pk-full',
    name: 'Complete Health Checkup',
    nameHi: 'संपूर्ण स्वास्थ्य जांच (Full Body Checkup)',
    segment: 'package',
    category: 'package',
    reportHrs: 24,
    fastingHrs: 10,
    testsCount: 72,
    gradient: ['#172554', '#2563EB'],
    about: 'A full-body screen covering blood, sugar, liver, kidney, thyroid, lipids and vitamins.',
    aboutHi: 'रक्त, डायबिटीज, लिवर, किडनी, थायरॉइड, लिपिड प्रोफाइल और विटामिन्स की 72 परीक्षणों वाली संपूर्ण जांच।',
    prep: 'Fast for 10 hours before the sample.',
    prepHi: 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें। सादा पानी पी सकते हैं।',
  },
  {
    id: 'pk-heart',
    name: 'Heart & Diabetes Care',
    nameHi: 'हार्ट व डायबिटीज केयर पैकेज',
    segment: 'package',
    category: 'package',
    reportHrs: 24,
    fastingHrs: 10,
    testsCount: 52,
    gradient: ['#7F1D1D', '#E11D48'],
    about: 'Heart risk and sugar control in one package.',
    aboutHi: 'हृदय रोग के जोखिम कारक, लिपिड प्रोफाइल और 3 माह के शुगर नियंत्रण की एक साथ संपूर्ण जांच।',
    prep: 'Fast for 10 hours before the sample.',
    prepHi: 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें।',
  },
  {
    id: 'pk-senior',
    name: 'Senior Citizen Care',
    nameHi: 'वरिष्ठ नागरिक स्वास्थ्य सुरक्षा',
    segment: 'package',
    category: 'package',
    reportHrs: 24,
    fastingHrs: 10,
    testsCount: 64,
    gradient: ['#064E3B', '#059669'],
    about: 'Screening for bones, kidney, liver, heart and sugar, chosen for older adults.',
    aboutHi: 'हड्डियों, किडनी, लिवर, दिल और शुगर की 60 वर्ष से अधिक उम्र के वरिष्ठ नागरिकों हेतु विशेष जांच।',
    prep: 'Fast for 10 hours before the sample.',
    prepHi: 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें।',
  },
  {
    id: 'pk-women',
    name: "Women's Wellness",
    nameHi: 'महिला संपूर्ण वेलनेस पैकेज',
    segment: 'package',
    category: 'package',
    reportHrs: 24,
    fastingHrs: 10,
    testsCount: 58,
    gradient: ['#831843', '#DB2777'],
    about: 'Blood health, thyroid, vitamins and hormones relevant to women.',
    aboutHi: 'एनीमिया, थायरॉइड असंतुलन, विटामिन डी/बी12 और महिला स्वास्थ्य संबंधी महत्वपूर्ण रक्त परीक्षण।',
    prep: 'Fast for 10 hours before the sample.',
    prepHi: 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें।',
  },
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

const BASE: Record<string, number> = {
  cbc: 350,
  hba1c: 550,
  fbs: 150,
  thyroid: 600,
  lipid: 650,
  vitd: 1200,
  b12: 1000,
  lft: 700,
  kft: 700,
  dengue: 800,
  typhoid: 300,
  bhcg: 500,
  'xr-chest': 500,
  'xr-knee': 700,
  'xr-spine': 700,
  'usg-abd': 1200,
  'ct-head': 3500,
  'ct-chest': 4500,
  'mri-brain': 7500,
  'mri-knee': 7000,
  ecg: 300,
  echo: 1800,
  'pk-full': 2400,
  'pk-heart': 1800,
  'pk-senior': 2800,
  'pk-women': 2600,
};



export const CENTRES: Centre[] = [
  // --- Jaipur Verified Network Centres ---
  {
    id: 'jp-c1',
    name: 'Dr. Lal PathLabs - Surajpole',
    nameHi: 'डॉ. लाल पैथलैब्स - सूरजपोल',
    area: 'Surajpole Gate, Mohanbari, Jaipur',
    areaHi: 'सूरजपोल गेट, मोहनबाड़ी, जयपुर',
    distanceKm: 0.4,
    rating: 4.8,
    reviews: 680,
    home: true,
    nextSlot: 'Today, 5:00 PM',
    offers: ['lab', 'package'],
    factor: 1.0,
    lat: 26.9212,
    lng: 75.8455,
    city: 'Jaipur',
  },
  {
    id: 'jp-c2',
    name: 'Metropolis Healthcare - C-Scheme',
    nameHi: 'मेट्रोपोलिस हेल्थकेयर - सी-स्कीम',
    area: 'Ashok Marg, C-Scheme, Jaipur',
    areaHi: 'अशोक मार्ग, सी-स्कीम, जयपुर',
    distanceKm: 2.1,
    rating: 4.7,
    reviews: 490,
    home: true,
    nextSlot: 'Today, 6:30 PM',
    offers: ['lab', 'scan', 'package'],
    factor: 1.05,
    lat: 26.9125,
    lng: 75.8050,
    city: 'Jaipur',
  },
  {
    id: 'jp-c3',
    name: 'SRL Diagnostics - MI Road',
    nameHi: 'एसआरएल डायग्नोस्टिक्स - एमआई रोड',
    area: 'Mirza Ismail Road, Jaipur',
    areaHi: 'मिर्जा इस्माइल रोड, जयपुर',
    distanceKm: 2.8,
    rating: 4.6,
    reviews: 310,
    home: true,
    nextSlot: 'Tomorrow, 7:00 AM',
    offers: ['lab', 'scan', 'package'],
    factor: 0.95,
    lat: 26.9180,
    lng: 75.8200,
    city: 'Jaipur',
  },
  {
    id: 'jp-c4',
    name: 'SMS Hospital Diagnostic Imaging Centre',
    nameHi: 'एसएमएस अस्पताल डायग्नोस्टिक इमेजिंग सेंटर',
    area: 'JLN Marg, Jaipur',
    areaHi: 'जेएलएन मार्ग, जयपुर',
    distanceKm: 3.6,
    rating: 4.5,
    reviews: 540,
    home: false,
    nextSlot: 'Today, 7:00 PM',
    offers: ['lab', 'scan', 'package'],
    factor: 0.85,
    lat: 26.9038,
    lng: 75.8172,
    city: 'Jaipur',
  },
  {
    id: 'jp-c5',
    name: 'Thyrocare Wellness Centre - Raja Park',
    nameHi: 'थायरोकेयर वेलनेस सेंटर - राजा पार्क',
    area: 'Raja Park, Jaipur',
    areaHi: 'राजा पार्क, जयपुर',
    distanceKm: 4.3,
    rating: 4.4,
    reviews: 220,
    home: true,
    nextSlot: 'Tomorrow, 8:00 AM',
    offers: ['lab', 'package'],
    factor: 0.90,
    lat: 26.8920,
    lng: 75.8300,
    city: 'Jaipur',
  },
];

export const priceAt = (item: Item, c: Centre): number | null => {
  if (!c.offers.includes(item.segment)) return null;
  if (c.exclude?.includes(item.id)) return null;
  return Math.round((BASE[item.id] * c.factor) / 10) * 10;
};

export const fromPrice = (item: Item): number => {
  const prices = CENTRES.map((c) => priceAt(item, c)).filter((p): p is number => p !== null);
  return prices.length ? Math.min(...prices) : 0;
};

export const homeAvailable = (item: Item): boolean =>
  CENTRES.some((c) => c.home && priceAt(item, c) !== null);

// Haversine calculation for dynamic centre distances
function calcLabDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Centres that can do EVERY selected item, with the total at each one.
// Location-aware: recalculates distanceKm dynamically and prioritizes local centres
export const centresFor = (
  items: Item[],
  userCoords?: { lat: number; lng: number } | null,
  city?: string,
  customCentres?: Centre[] | null,
  homeOnly?: boolean
): { centre: Centre; total: number }[] => {
  if (!items.length) return [];
  const sourceCentres = customCentres !== undefined && customCentres !== null ? customCentres : CENTRES;
  const out: { centre: Centre; total: number }[] = [];

  const isJaipurUser = (city || '').toLowerCase().includes('jaipur') ||
    (userCoords && userCoords.lat >= 26.0 && userCoords.lat <= 28.0 && userCoords.lng >= 75.0 && userCoords.lng <= 77.0);

  for (const rawCentre of sourceCentres) {
    if (homeOnly && !rawCentre.home) continue;
    let total = 0;
    let ok = true;
    for (const it of items) {
      const p = priceAt(it, rawCentre);
      if (p === null) {
        ok = false;
        break;
      }
      total += p;
    }
    if (ok) {
      const centre = { ...rawCentre };
      if (userCoords && centre.lat && centre.lng) {
        centre.distanceKm = calcLabDist(userCoords.lat, userCoords.lng, centre.lat, centre.lng);
      }
      out.push({ centre, total });
    }
  }

  // Filter centres within active radius (e.g., Jaipur users only see Jaipur centres)
  if (isJaipurUser) {
    const jpOnly = out.filter(
      (o) => o.centre.city?.toLowerCase().includes('jaipur') || (o.centre.distanceKm && o.centre.distanceKm <= 40)
    );
    if (jpOnly.length > 0) return jpOnly.sort((a, b) => a.centre.distanceKm - b.centre.distanceKm);
  } else if (userCoords) {
    const nearby = out.filter((o) => (o.centre.distanceKm && o.centre.distanceKm <= 45));
    if (nearby.length > 0) return nearby.sort((a, b) => a.centre.distanceKm - b.centre.distanceKm);
  }

  return out.sort((a, b) => a.centre.distanceKm - b.centre.distanceKm);
};

export interface PartialCentreOption {
  centre: Centre;
  total: number;
  availableItems: Item[];
  missingItems: Item[];
}

export const partialCentresFor = (
  items: Item[],
  userCoords?: { lat: number; lng: number } | null,
  city?: string,
  customCentres?: Centre[] | null,
  homeOnly?: boolean
): PartialCentreOption[] => {
  if (items.length <= 1) return [];
  const sourceCentres = customCentres !== undefined && customCentres !== null ? customCentres : CENTRES;
  const out: PartialCentreOption[] = [];
  for (const rawCentre of sourceCentres) {
    if (homeOnly && !rawCentre.home) continue;
    let total = 0;
    const availableItems: Item[] = [];
    const missingItems: Item[] = [];
    for (const it of items) {
      const p = priceAt(it, rawCentre);
      if (p === null) {
        missingItems.push(it);
      } else {
        availableItems.push(it);
        total += p;
      }
    }
    if (availableItems.length > 0 && missingItems.length > 0) {
      const centre = { ...rawCentre };
      if (userCoords && centre.lat && centre.lng) {
        centre.distanceKm = calcLabDist(userCoords.lat, userCoords.lng, centre.lat, centre.lng);
      }
      out.push({ centre, total, availableItems, missingItems });
    }
  }
  const isJaipurUser =
    (city || '').toLowerCase().includes('jaipur') ||
    (userCoords && userCoords.lat >= 26.0 && userCoords.lat <= 28.0 && userCoords.lng >= 75.0 && userCoords.lng <= 77.0);
  const scoped = isJaipurUser
    ? out.filter((o) => o.centre.city?.toLowerCase().includes('jaipur') || (o.centre.distanceKm && o.centre.distanceKm <= 40))
    : out;
  return (scoped.length > 0 ? scoped : out).sort(
    (a, b) => b.availableItems.length - a.availableItems.length || a.centre.distanceKm - b.centre.distanceKm
  );
};

// Helper accessors for Hindi localization
export const getItemName = (item: Item, isHi?: boolean): string =>
  isHi && item.nameHi ? item.nameHi : item.name;

export const getItemAbout = (item: Item, isHi?: boolean): string =>
  isHi && item.aboutHi ? item.aboutHi : item.about;

export const getItemPrep = (item: Item, isHi?: boolean): string =>
  isHi && item.prepHi ? item.prepHi : item.prep;

export const getCategoryLabel = (category: Category, isHi?: boolean): string =>
  isHi && category.labelHi ? category.labelHi : category.label;
