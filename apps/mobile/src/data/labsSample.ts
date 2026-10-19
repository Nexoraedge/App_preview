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
  area: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  home: boolean;
  nextSlot: string;
  offers: Segment[];
  factor: number; // price multiplier against BASE
  exclude?: string[];
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
    reportHrs: 24,
    fastingHrs: null,
    about: 'Checks vitamin D level, which matters for bones and immunity.',
    aboutHi: 'शरीर में विटामिन डी का स्तर जांचता है, जो हड्डियों की मजबूती और रोग प्रतिरोधक क्षमता के लिए आवश्यक है।',
    prep: 'No fasting needed.',
    prepHi: 'किसी तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'b12',
    name: 'Vitamin B12',
    nameHi: 'विटामिन बी12 (Vitamin B12)',
    segment: 'lab',
    category: 'vitamins',
    reportHrs: 24,
    fastingHrs: null,
    about: 'Checks B12 level, linked to tiredness, nerves and anaemia.',
    aboutHi: 'विटामिन बी12 के स्तर की जांच, जो थकान, नसों की कमजोरी और स्वस्थ रक्त कोशिकाओं के लिए जरूरी है।',
    prep: 'No fasting needed.',
    prepHi: 'किसी तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'lft',
    name: 'Liver Function Test (LFT)',
    nameHi: 'लिवर फंक्शन टेस्ट (LFT)',
    segment: 'lab',
    category: 'organ',
    reportHrs: 12,
    fastingHrs: 8,
    about: 'Checks liver enzymes and proteins.',
    aboutHi: 'लिवर एंजाइम (SGOT, SGPT), बिलीरुबिन और प्रोटीन की जांच कर लिवर के स्वास्थ्य की स्थिति बताता है।',
    prep: 'Fast for 8 hours.',
    prepHi: '8 घंटे तक खाली पेट रहें।',
  },
  {
    id: 'kft',
    name: 'Kidney Function Test (KFT)',
    nameHi: 'किडनी फंक्शन टेस्ट (KFT / RFT)',
    segment: 'lab',
    category: 'organ',
    reportHrs: 12,
    fastingHrs: null,
    about: 'Checks how well your kidneys filter waste.',
    aboutHi: 'सीरम क्रिएटिनिन, यूरिया और यूरिक एसिड की जांच से किडनी की कार्यक्षमता का पता लगाता है।',
    prep: 'No fasting needed. Drink water normally.',
    prepHi: 'खाली पेट की आवश्यकता नहीं। सामान्य रूप से पानी पिएं।',
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
    about: 'Images of the knee bones and joint.',
    aboutHi: 'घुटने के जोड़, गठिया (आर्थराइटिस) और हड्डियों में फ्रैक्चर की जांच हेतु डिजिटल इमेज।',
    prep: 'No preparation.',
    prepHi: 'किसी तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'xr-spine',
    name: 'X-Ray Lumbar Spine',
    nameHi: 'एक्स-रे लम्बर स्पाइन (कमर की रीढ़)',
    segment: 'scan',
    category: 'xray',
    reportHrs: 2,
    fastingHrs: null,
    about: 'Images of the lower spine.',
    aboutHi: 'कमर और रीढ़ की निचली हड्डियों के अलाइनमेंट और डिस्क स्पेस की डिजिटल इमेजिंग।',
    prep: 'No preparation.',
    prepHi: 'किसी तैयारी की आवश्यकता नहीं है।',
  },
  {
    id: 'usg-abd',
    name: 'Ultrasound Abdomen',
    nameHi: 'अल्ट्रासाउंड पेट (USG Whole Abdomen)',
    segment: 'scan',
    category: 'usg',
    reportHrs: 4,
    fastingHrs: 6,
    about: 'Looks at liver, gallbladder, kidneys and other organs.',
    aboutHi: 'लिवर, पित्ताशय, गुर्दे, पथरी और अन्य पेट के आंतरिक अंगों की संपूर्ण सोनोग्राफी।',
    prep: 'Fast for 6 hours. You may be asked to keep a full bladder.',
    prepHi: '6 घंटे का उपवास रखें। जांच के समय मूत्राशय भरा (पेशाब रोककर) रखें।',
  },
  {
    id: 'ct-head',
    name: 'CT Scan Head',
    nameHi: 'सीटी स्कैन हेड (CT Brain)',
    segment: 'scan',
    category: 'ct',
    reportHrs: 6,
    fastingHrs: null,
    about: 'Detailed images of the brain and skull.',
    aboutHi: 'सिरदर्द, चोट या आंतरिक रक्तस्राव की पहचान के लिए मस्तिष्क और खोपड़ी का 3D सीटी स्कैन।',
    prep: 'Remove metal items. Tell the centre if you are pregnant.',
    prepHi: 'धातु की वस्तुएं उतार दें। यदि गर्भवती हैं तो केंद्र को पहले ही सूचित करें।',
  },
  {
    id: 'ct-chest',
    name: 'CT Scan Chest',
    nameHi: 'सीटी स्कैन चेस्ट (HRCT Chest)',
    segment: 'scan',
    category: 'ct',
    reportHrs: 6,
    fastingHrs: null,
    about: 'Detailed images of the lungs and chest.',
    aboutHi: 'फेफड़ों की संरचना और गंभीर संक्रमण की पहचान के लिए उच्च रिज़ॉल्यूशन वाली सीटी इमेजिंग।',
    prep: 'Remove metal items. Tell the centre if you are pregnant.',
    prepHi: 'धातु की वस्तुएं उतार दें। यदि गर्भवती हैं तो केंद्र को पहले ही सूचित करें।',
  },
  {
    id: 'mri-brain',
    name: 'MRI Brain',
    nameHi: 'एमआरआई ब्रेन (MRI Brain)',
    segment: 'scan',
    category: 'mri',
    reportHrs: 24,
    fastingHrs: null,
    about: 'Detailed images of the brain using magnets.',
    aboutHi: 'शक्तिशाली चुंबकीय तरंगों द्वारा मस्तिष्क के सूक्ष्म ऊतकों, नसों और नसों के स्वास्थ्य की जांच।',
    prep: 'Tell the centre about any implants or pacemaker. No metal on the body.',
    prepHi: 'शरीर पर कोई धातु या पेसमेकर न हो। किसी भी मेडिकल इम्प्लांट की जानकारी केंद्र को दें।',
  },
  {
    id: 'mri-knee',
    name: 'MRI Knee',
    nameHi: 'एमआरआई घुटना (MRI Knee Joint)',
    segment: 'scan',
    category: 'mri',
    reportHrs: 24,
    fastingHrs: null,
    about: 'Detailed images of knee ligaments and cartilage.',
    aboutHi: 'घुटने के लिगामेंट इंजरी (ACL), मेनिस्कस टियर और कार्टिलेज की अत्यंत सटीक इमेजिंग।',
    prep: 'Tell the centre about any implants. No metal on the body.',
    prepHi: 'शरीर पर कोई धातु न हो। केंद्र को किसी भी इम्प्लांट की जानकारी दें।',
  },
  {
    id: 'ecg',
    name: 'ECG (12-lead)',
    nameHi: 'ईसीजी (12-Lead ECG)',
    segment: 'scan',
    category: 'ecg',
    reportHrs: 1,
    fastingHrs: null,
    about: 'Records the electrical activity of your heart.',
    aboutHi: 'हृदय की धड़कन, गति और विद्युत तरंगों को ग्राफ पर रिकॉर्ड कर हृदय स्वास्थ्य की जांच करता है।',
    prep: 'No preparation. Wear loose clothing.',
    prepHi: 'किसी तैयारी की आवश्यकता नहीं। ढीले और आरामदायक कपड़े पहनें।',
  },
  {
    id: 'echo',
    name: 'Echocardiography (2D Echo)',
    nameHi: 'इकोकार्डियोग्राफी (2D Echo)',
    segment: 'scan',
    category: 'ecg',
    reportHrs: 2,
    fastingHrs: null,
    about: 'Ultrasound of the heart showing how it pumps.',
    aboutHi: 'हृदय के वाल्वों, रक्त पंप करने की क्षमता और मांसपेशियों की रीयल-टाइम अल्ट्रासाउंड जांच।',
    prep: 'No preparation.',
    prepHi: 'किसी विशेष तैयारी की आवश्यकता नहीं है।',
  },

  // ---- Packages ----
  {
    id: 'pk-full',
    name: 'Complete Health Checkup',
    nameHi: 'संपूर्ण स्वास्थ्य जांच',
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
  {
    id: 'c1',
    name: 'CityCare Diagnostics',
    area: 'Saket',
    distanceKm: 1.4,
    rating: 4.7,
    reviews: 420,
    home: true,
    nextSlot: 'Today, 5:30 PM',
    offers: ['lab', 'scan', 'package'],
    factor: 1.0,
  },
  {
    id: 'c2',
    name: 'LifeLine Pathology',
    area: 'Malviya Nagar',
    distanceKm: 2.8,
    rating: 4.5,
    reviews: 260,
    home: true,
    nextSlot: 'Tomorrow, 7:00 AM',
    offers: ['lab', 'package'],
    factor: 0.85,
  },
  {
    id: 'c3',
    name: 'Saket Imaging Centre',
    area: 'Saket',
    distanceKm: 1.9,
    rating: 4.6,
    reviews: 310,
    home: false,
    nextSlot: 'Today, 6:15 PM',
    offers: ['scan'],
    factor: 0.9,
    exclude: ['mri-brain', 'mri-knee'],
  },
  {
    id: 'c4',
    name: 'Green Park Labs',
    area: 'Green Park',
    distanceKm: 4.6,
    rating: 4.4,
    reviews: 180,
    home: true,
    nextSlot: 'Tomorrow, 8:00 AM',
    offers: ['lab', 'package'],
    factor: 0.95,
  },
  {
    id: 'c5',
    name: 'Metro Scan & Lab',
    area: 'Nehru Place',
    distanceKm: 7.2,
    rating: 4.8,
    reviews: 540,
    home: false,
    nextSlot: 'Today, 7:45 PM',
    offers: ['lab', 'scan', 'package'],
    factor: 1.1,
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

// Centres that can do EVERY selected item, with the total at each one.
export const centresFor = (items: Item[]): { centre: Centre; total: number }[] => {
  if (!items.length) return [];
  const out: { centre: Centre; total: number }[] = [];
  for (const centre of CENTRES) {
    let total = 0;
    let ok = true;
    for (const it of items) {
      const p = priceAt(it, centre);
      if (p === null) {
        ok = false;
        break;
      }
      total += p;
    }
    if (ok) out.push({ centre, total });
  }
  return out;
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
