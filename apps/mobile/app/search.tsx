import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ArrowLeft,
  X,
  Clock,
  TrendingUp,
  Stethoscope,
  FlaskConical,
  Pill,
  Building2,
  ChevronRight,
  Bed,
  Star,
  Sparkles,
  MapPin,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { useLanguage } from '../src/context/LanguageContext';
import { C, R, SHADOW, inr } from '../src/theme';

export interface SearchItem {
  id: string;
  title: string;
  titleHi?: string;
  subtitle: string;
  subtitleHi?: string;
  type: 'doctor' | 'hospital' | 'lab' | 'surgery' | 'medicine';
  badge?: string;
  badgeHi?: string;
  route: string;
  price?: number;
  rating?: number;
  location?: string;
  locationHi?: string;
}

const SEARCH_DATABASE: SearchItem[] = [
  // --- Doctors ---
  {
    id: 'd1',
    title: 'Dr. Rohan Mehta',
    titleHi: 'डॉ. रोहन मेहता',
    subtitle: 'Senior General Physician • 12 yrs exp • MBBS, MD',
    subtitleHi: 'वरिष्ठ जनरल फिजिशियन • 12 वर्ष अनुभव',
    type: 'doctor',
    badge: 'Instant Consult',
    badgeHi: 'तुरंत परामर्श',
    route: '/branch-doctors?specialty=General+Physician',
    rating: 4.9,
    location: 'Saket, South Delhi',
    locationHi: 'साकेत, दक्षिण दिल्ली',
  },
  {
    id: 'd2',
    title: 'Dr. Ananya Iyer',
    titleHi: 'डॉ. अनन्या अय्यर',
    subtitle: 'Interventional Cardiologist • Apollo Hospitals • 15 yrs exp',
    subtitleHi: 'हृदय रोग विशेषज्ञ • अपोलो हॉस्पिटल्स • 15 वर्ष अनुभव',
    type: 'doctor',
    badge: 'Heart Care',
    badgeHi: 'हार्ट स्पेशलिस्ट',
    route: '/branch-doctors?specialty=Heart+Specialist',
    rating: 4.95,
    location: 'Sarita Vihar, New Delhi',
    locationHi: 'सरिता विहार, नई दिल्ली',
  },
  {
    id: 'd3',
    title: 'Dr. Rajesh Gupta',
    titleHi: 'डॉ. राजेश गुप्ता',
    subtitle: 'Senior Orthopedic Surgeon • Joint & Spine Specialist • 18 yrs exp',
    subtitleHi: 'हड्डी व जोड़ रोग विशेषज्ञ • 18 वर्ष अनुभव',
    type: 'doctor',
    badge: 'Joint Specialist',
    badgeHi: 'हड्डी विशेषज्ञ',
    route: '/branch-doctors?specialty=Bone+%26+Joints',
    rating: 4.88,
    location: 'Saket, New Delhi',
    locationHi: 'साकेत, नई दिल्ली',
  },
  {
    id: 'd4',
    title: 'Dr. Priya Sharma',
    titleHi: 'डॉ. प्रिया शर्मा',
    subtitle: 'Consultant Pediatrician • Newborn & Child Care • 10 yrs exp',
    subtitleHi: 'शिशु व बाल रोग विशेषज्ञ • 10 वर्ष अनुभव',
    type: 'doctor',
    badge: 'Child Care',
    badgeHi: 'बाल रोग',
    route: '/branch-doctors?specialty=Child+Care',
    rating: 4.92,
    location: 'Malviya Nagar, New Delhi',
    locationHi: 'मालवीय नगर, नई दिल्ली',
  },
  {
    id: 'd5',
    title: 'Dr. Sunita Verma',
    titleHi: 'डॉ. सुनीता वर्मा',
    subtitle: 'Senior Gynecologist & Obstetrician • High-Risk Pregnancy',
    subtitleHi: 'वरिष्ठ स्त्री एवं प्रसूति रोग विशेषज्ञ',
    type: 'doctor',
    badge: 'Women Health',
    badgeHi: 'महिला स्वास्थ्य',
    route: '/branch-doctors',
    rating: 4.9,
    location: 'Hauz Khas, New Delhi',
    locationHi: 'हौज खास, नई दिल्ली',
  },

  // --- Hospitals ---
  {
    id: 'h1',
    title: 'Max Super Speciality Hospital',
    titleHi: 'मैक्स सुपर स्पेशलिटी हॉस्पिटल',
    subtitle: 'Saket, New Delhi • 25% Off OPD • NABH & JCI Accredited',
    subtitleHi: 'साकेत, नई दिल्ली • ओपीडी पर 25% छूट • NABH मान्यता प्राप्त',
    type: 'hospital',
    badge: '25% Off OPD',
    badgeHi: '25% छूट',
    route: '/(tabs)/opd',
    rating: 4.8,
    location: 'Saket, New Delhi',
    locationHi: 'साकेत, नई दिल्ली',
  },
  {
    id: 'h2',
    title: 'Indraprastha Apollo Hospitals',
    titleHi: 'इंद्रप्रस्थ अपोलो हॉस्पिटल्स',
    subtitle: 'Sarita Vihar • 250+ Renowned Specialists • Multi-Speciality',
    subtitleHi: 'सरिता विहार • 250+ वरिष्ठ विशेषज्ञ • मल्टी-स्पेशलिटी',
    type: 'hospital',
    badge: 'JCI Accredited',
    badgeHi: 'JCI मान्यता',
    route: '/(tabs)/opd',
    rating: 4.9,
    location: 'Sarita Vihar, New Delhi',
    locationHi: 'सरिता विहार, नई दिल्ली',
  },
  {
    id: 'h3',
    title: 'Fortis Escorts Heart Institute',
    titleHi: 'फोर्टिस एस्कॉर्ट्स हार्ट इंस्टीट्यूट',
    subtitle: 'Okhla Road • Asia Premier Cardiac Hospital • 24x7 Emergency',
    subtitleHi: 'ओखला रोड • एशिया का प्रतिष्ठित हृदय रोग केंद्र',
    type: 'hospital',
    badge: 'Cardiac Centre',
    badgeHi: 'हृदय केंद्र',
    route: '/(tabs)/opd',
    rating: 4.85,
    location: 'Okhla, New Delhi',
    locationHi: 'ओखला, नई दिल्ली',
  },
  {
    id: 'h4',
    title: 'Manipal Hospital',
    titleHi: 'मणिपाल हॉस्पिटल',
    subtitle: 'Sector 6, Dwarka • Tertiary Healthcare & Robotic Surgery',
    subtitleHi: 'द्वारका, नई दिल्ली • रोबोटिक सर्जरी व आधुनिक उपचार',
    type: 'hospital',
    badge: 'Robotic Surgery',
    badgeHi: 'रोबोटिक सर्जरी',
    route: '/(tabs)/opd',
    rating: 4.75,
    location: 'Dwarka, New Delhi',
    locationHi: 'द्वारका, नई दिल्ली',
  },

  // --- Diagnostic Labs & Scans ---
  {
    id: 'l1',
    title: 'Complete Blood Count (CBC)',
    titleHi: 'कम्प्लीट ब्लड काउंट (CBC)',
    subtitle: 'Report in 6 hrs • No fasting required • 24 parameters',
    subtitleHi: '6 घंटे में रिपोर्ट • खाली पेट जरूरी नहीं • 24 पैरामीटर',
    type: 'lab',
    badge: 'Fast Report',
    badgeHi: 'शीघ्र रिपोर्ट',
    price: 300,
    route: '/(tabs)/labs',
  },
  {
    id: 'l2',
    title: 'HbA1c (3-Month Sugar)',
    titleHi: 'एचबीए1सी (3 माह का शुगर टेस्ट)',
    subtitle: 'Report in 12 hrs • Gold standard diabetes monitoring',
    subtitleHi: '12 घंटे में रिपोर्ट • डायबिटीज की सटीक जांच',
    type: 'lab',
    badge: 'Home Pickup',
    badgeHi: 'घर पर सैंपल',
    price: 470,
    route: '/(tabs)/labs',
  },
  {
    id: 'l3',
    title: 'Thyroid Profile (T3, T4, TSH)',
    titleHi: 'थायरॉइड प्रोफाइल (T3, T4, TSH)',
    subtitle: 'Report in 12 hrs • Complete thyroid hormone screening',
    subtitleHi: '12 घंटे में रिपोर्ट • संपूर्ण थायरॉइड हार्मोन संतुलन जांच',
    type: 'lab',
    badge: 'NABL Labs',
    badgeHi: 'NABL लैब',
    price: 450,
    route: '/(tabs)/labs',
  },
  {
    id: 'l4',
    title: 'Lipid Profile (Cholesterol & Triglycerides)',
    titleHi: 'लिपिड प्रोफाइल (कोलेस्ट्रॉल जांच)',
    subtitle: 'Report in 12 hrs • Fasting 10 hrs • Heart health risk assessment',
    subtitleHi: '12 घंटे में रिपोर्ट • 10 घंटे खाली पेट • हृदय जोखिम जांच',
    type: 'lab',
    badge: 'Fasting 10h',
    badgeHi: '10h खाली पेट',
    price: 550,
    route: '/(tabs)/labs',
  },
  {
    id: 'l5',
    title: 'Complete Health Checkup Package (72 Tests)',
    titleHi: 'संपूर्ण स्वास्थ्य जांच पैकेज (72 टेस्ट)',
    subtitle: 'Covers Blood, Sugar, Liver, Kidney, Thyroid, Lipids & Vitamins',
    subtitleHi: 'रक्त, लिवर, किडनी, थायरॉइड, कोलेस्ट्रॉल व विटामिन्स की संपूर्ण जांच',
    type: 'lab',
    badge: 'Popular',
    badgeHi: 'लोकप्रिय',
    price: 2040,
    route: '/(tabs)/labs',
  },
  {
    id: 'l6',
    title: 'Ultrasound Whole Abdomen (USG)',
    titleHi: 'अल्ट्रासाउंड होल एब्डोमेन (USG)',
    subtitle: 'Same-day imaging • Saket Imaging Centre & CityCare',
    subtitleHi: 'उसी दिन रिपोर्ट • साकेत इमेजिंग व सिटीकेयर',
    type: 'lab',
    badge: 'Imaging Scan',
    badgeHi: 'इमेजिंग स्कैन',
    price: 1200,
    route: '/(tabs)/labs',
  },
  {
    id: 'l7',
    title: 'MRI Brain with Contrast (3T Digital)',
    titleHi: 'एमआरआई ब्रेन (3T डिजिटल)',
    subtitle: 'High-definition 3-Tesla scan • Certified radiologist report',
    subtitleHi: 'हाई-डेफिनिशन 3T स्कैन • प्रमाणित रेडियोलॉजिस्ट रिपोर्ट',
    type: 'lab',
    badge: '3T Digital',
    badgeHi: '3T डिजिटल',
    price: 7000,
    route: '/(tabs)/labs',
  },

  // --- Surgeries & IPD Procedures ---
  {
    id: 's1',
    title: 'Cataract Surgery (Phaco + IOL Lens)',
    titleHi: 'मोतियाबिंद सर्जरी (फेको + आईओएल लेंस)',
    subtitle: 'Daycare procedure • 15 min stitchless surgery • Cashless mediclaim',
    subtitleHi: 'डेकेयर सर्जरी • 15 मिनट में दर्द रहित उपचार • कैशलेस बीमा',
    type: 'surgery',
    badge: 'Daycare',
    badgeHi: 'डेकेयर',
    route: '/(tabs)/ipd',
    price: 24000,
  },
  {
    id: 's2',
    title: 'Total Knee Replacement (TKR)',
    titleHi: 'संपूर्ण घुटना प्रत्यारोपण (TKR)',
    subtitle: 'Robotic assisted • Premium FDA approved implants • 3-day stay',
    subtitleHi: 'रोबोटिक सर्जरी • एफडीए प्रमाणित इम्प्लांट्स • 3 दिन का प्रवास',
    type: 'surgery',
    badge: 'Cashless',
    badgeHi: 'कैशलेस',
    route: '/(tabs)/ipd',
    price: 145000,
  },
  {
    id: 's3',
    title: 'Laparoscopic Gallbladder Stone Removal',
    titleHi: 'पित्त की थैली की पथरी की लैप्रोस्कोपिक सर्जरी',
    subtitle: 'Keyhole minimally invasive surgery • Quick recovery • 1 day',
    subtitleHi: 'दूरबीन विधि द्वारा न्यूनतम चीरा • शीघ्र रिकवरी • 1 दिन',
    type: 'surgery',
    badge: 'Minimally Invasive',
    badgeHi: 'दूरबीन सर्जरी',
    route: '/(tabs)/ipd',
    price: 42000,
  },
  {
    id: 's4',
    title: 'Hernia Repair Surgery (Laparoscopic Mesh)',
    titleHi: 'हर्निया रिपेयर सर्जरी (लैप्रोस्कोपिक मेश)',
    subtitle: 'Painless laparoscopic 3D mesh repair • Fast healing',
    subtitleHi: 'दर्द रहित लैप्रोस्कोपिक 3D मेश रिपेयर',
    type: 'surgery',
    badge: 'Quick Healing',
    badgeHi: 'त्वरित आराम',
    route: '/(tabs)/ipd',
    price: 38000,
  },

  // --- Medicines & Pharmacy ---
  {
    id: 'm1',
    title: 'Paracetamol 650mg (Dolo 650)',
    titleHi: 'पैरासिटामोल 650mg (डोलो 650)',
    subtitle: 'Strip of 15 tablets • Fever & mild-to-moderate pain relief',
    subtitleHi: '15 गोलियों का पत्ता • बुखार व दर्द में तुरंत राहत',
    type: 'medicine',
    badge: '20% Off',
    badgeHi: '20% छूट',
    price: 30.5,
    route: '/(tabs)/pharmacy',
  },
  {
    id: 'm2',
    title: 'Metformin 500mg SR (Glycomet 500)',
    titleHi: 'मेटफॉर्मिन 500mg SR (ग्लाइकोमेट 500)',
    subtitle: 'Strip of 20 tablets • Sustained release type 2 diabetes management',
    subtitleHi: '20 गोलियों का पत्ता • टाइप 2 डायबिटीज नियंत्रण',
    type: 'medicine',
    badge: '18% Off',
    badgeHi: '18% छूट',
    price: 44,
    route: '/(tabs)/pharmacy',
  },
  {
    id: 'm3',
    title: 'Telmisartan 40mg (Telma 40)',
    titleHi: 'टेल्मीसार्टन 40mg (टेल्मा 40)',
    subtitle: 'Strip of 15 tablets • High blood pressure (hypertension) care',
    subtitleHi: '15 गोलियों का पत्ता • हाई ब्लड प्रेशर नियंत्रण',
    type: 'medicine',
    badge: '15% Off',
    badgeHi: '15% छूट',
    price: 110,
    route: '/(tabs)/pharmacy',
  },
  {
    id: 'm4',
    title: 'Vitamin D3 60,000 IU (Calcirol Sachet / Capsule)',
    titleHi: 'विटामिन डी3 60,000 IU',
    subtitle: 'Weekly dose • Bone strength, immunity & joint wellness',
    subtitleHi: 'साप्ताहिक खुराक • हड्डियों की मजबूती व रोग प्रतिरोधक क्षमता',
    type: 'medicine',
    badge: 'Immunity',
    badgeHi: 'इम्यूनिटी',
    price: 130,
    route: '/(tabs)/pharmacy',
  },
];

const RECENT_SEARCHES = [
  'Dr. Rohan Mehta',
  'Complete Health Checkup',
  'Max Hospital Saket',
  'Cataract Surgery',
  'Dolo 650',
];

const TRENDING_TAGS = [
  'Cardiology',
  'Full Body Checkup',
  'Apollo Saket',
  'Knee Replacement',
  'Ultrasound Abdomen',
  'Diabetes Test',
  'Dolo 650',
  'Fortis Escorts',
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage() as any;
  const isHi = language === 'hi';

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'doctor' | 'hospital' | 'lab' | 'surgery' | 'medicine'>('all');
  const [recents, setRecents] = useState<string[]>(RECENT_SEARCHES);

  const filterTabs = [
    { id: 'all', label: isHi ? 'सभी' : 'All' },
    { id: 'doctor', label: isHi ? 'डॉक्टर' : 'Doctors', icon: Stethoscope },
    { id: 'hospital', label: isHi ? 'अस्पताल' : 'Hospitals', icon: Building2 },
    { id: 'lab', label: isHi ? 'लैब व स्कैन' : 'Lab Tests & Scans', icon: FlaskConical },
    { id: 'surgery', label: isHi ? 'सर्जरी (IPD)' : 'Surgeries', icon: Bed },
    { id: 'medicine', label: isHi ? 'दवाइयां' : 'Medicines', icon: Pill },
  ] as const;

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEARCH_DATABASE.filter((item) => {
      const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
      if (!matchesFilter) return false;
      if (!q) return true;

      const titleMatch = item.title.toLowerCase().includes(q) || (item.titleHi && item.titleHi.toLowerCase().includes(q));
      const subMatch = item.subtitle.toLowerCase().includes(q) || (item.subtitleHi && item.subtitleHi.toLowerCase().includes(q));
      const badgeMatch = item.badge && item.badge.toLowerCase().includes(q);
      const locMatch = item.location && item.location.toLowerCase().includes(q);

      return titleMatch || subMatch || badgeMatch || locMatch;
    });
  }, [query, activeFilter]);

  const getTypeStyle = (type: SearchItem['type']) => {
    switch (type) {
      case 'doctor':
        return {
          bg: '#EAF1FF',
          tint: '#1D4ED8',
          label: isHi ? 'डॉक्टर' : 'Doctor',
          Icon: Stethoscope,
        };
      case 'hospital':
        return {
          bg: '#EFF6FF',
          tint: '#2563EB',
          label: isHi ? 'अस्पताल' : 'Hospital',
          Icon: Building2,
        };
      case 'lab':
        return {
          bg: '#E7F8F0',
          tint: '#047857',
          label: isHi ? 'लैब जांच' : 'Lab Test',
          Icon: FlaskConical,
        };
      case 'surgery':
        return {
          bg: '#F3E8FF',
          tint: '#7C3AED',
          label: isHi ? 'सर्जरी' : 'Surgery',
          Icon: Bed,
        };
      case 'medicine':
        return {
          bg: '#FFF4E0',
          tint: '#B45309',
          label: isHi ? 'दवा' : 'Medicine',
          Icon: Pill,
        };
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    // Add to recents if not already there
    if (!recents.includes(item.title)) {
      setRecents((prev) => [item.title, ...prev.slice(0, 5)]);
    }
    router.push(item.route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Royal Header with Gradient */}
      <LinearGradient
        colors={['#0B1B4D', '#172554', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: 14,
          paddingHorizontal: 16,
          borderBottomLeftRadius: R.xl,
          borderBottomRightRadius: R.xl,
          shadowColor: '#0B1B3F',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.28)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Search Input Bar */}
          <View
            style={{
              flex: 1,
              height: 48,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Search size={19} color="#1D4ED8" strokeWidth={2.4} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus={true}
              placeholder={isHi ? 'डॉक्टर, अस्पताल, टेस्ट, सर्जरी खोजें...' : 'Search doctors, hospitals, tests, surgeries...'}
              placeholderTextColor="#94A3B8"
              selectionColor="#1D4ED8"
              returnKeyType="search"
              style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 14.5,
                color: C.ink,
                fontWeight: '600',
                paddingVertical: 0,
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={8}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} color="#64748B" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter Chips Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 12,
            gap: 8,
          }}
        >
          {filterTabs.map((tab) => {
            const active = activeFilter === tab.id;
            const TabIcon = 'icon' in tab ? tab.icon : null;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveFilter(tab.id as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: R.pill,
                  backgroundColor: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.16)',
                  borderWidth: 1,
                  borderColor: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.22)',
                }}
              >
                {TabIcon && (
                  <TabIcon size={14} color={active ? '#1D4ED8' : '#FFFFFF'} strokeWidth={2.2} />
                )}
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: active ? '700' : '600',
                    color: active ? '#1D4ED8' : '#FFFFFF',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 40 + insets.bottom,
        }}
      >
        {query.length === 0 ? (
          <>
            {/* Quick Browse Service Tiles */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                {isHi ? 'त्वरित स्वास्थ्य सेवाएं' : 'Explore by Department'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { title: isHi ? 'डॉक्टर परामर्श' : 'Doctor Consult', sub: isHi ? 'क्लिनिक अपॉइंटमेंट' : 'Top Specialists', icon: Stethoscope, route: '/(tabs)/opd', tint: '#1D4ED8', bg: '#EAF1FF' },
                  { title: isHi ? 'अस्पताल भर्ती' : 'Hospital Care', sub: isHi ? 'प्लांड सर्जरी' : 'NABH Hospitals', icon: Building2, route: '/(tabs)/ipd', tint: '#2563EB', bg: '#EFF6FF' },
                  { title: isHi ? 'लैब व स्कैन' : 'Lab Tests', sub: isHi ? 'घर पर सैंपल' : 'Accurate Scans', icon: FlaskConical, route: '/(tabs)/labs', tint: '#047857', bg: '#E7F8F0' },
                  { title: isHi ? 'दवाइयां' : 'Pharmacy', sub: isHi ? 'सस्ती दवाएं' : '20% Discount', icon: Pill, route: '/(tabs)/pharmacy', tint: '#B45309', bg: '#FFF4E0' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.title}
                      onPress={() => router.push(item.route as any)}
                      activeOpacity={0.8}
                      style={{
                        width: '48%',
                        flexGrow: 1,
                        backgroundColor: '#FFFFFF',
                        borderRadius: R.lg,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: C.line,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        ...SHADOW,
                      }}
                    >
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={item.tint} strokeWidth={2.4} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.ink }}>{item.title}</Text>
                        <Text style={{ fontSize: 11.5, color: C.sub, marginTop: 1 }}>{item.sub}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Recent Searches */}
            {recents.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={15} color={C.sub} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {isHi ? 'हाल की खोजें' : 'Recent Searches'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setRecents([])} hitSlop={8}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.brand }}>
                      {isHi ? 'हटाएं' : 'Clear'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ backgroundColor: '#FFFFFF', borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...SHADOW }}>
                  {recents.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setQuery(item)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: idx < recents.length - 1 ? 1 : 0,
                        borderBottomColor: '#F1F5F9',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Clock size={15} color="#94A3B8" />
                        <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.ink }}>{item}</Text>
                      </View>
                      <ChevronRight size={15} color="#CBD5E1" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Trending Tags */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <TrendingUp size={16} color={C.brand} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {isHi ? 'ट्रेंडिंग सर्च' : 'Trending Searches'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TRENDING_TAGS.map((tag, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setQuery(tag)}
                    activeOpacity={0.75}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: R.pill,
                      borderWidth: 1,
                      borderColor: C.line,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      ...SHADOW,
                    }}
                  >
                    <Sparkles size={12} color={C.brand} />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.ink }}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          /* Live Search Results */
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {isHi ? `परिणाम (${filteredResults.length})` : `Results (${filteredResults.length})`}
              </Text>
              {activeFilter !== 'all' && (
                <TouchableOpacity onPress={() => setActiveFilter('all')}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.brand }}>
                    {isHi ? 'सभी फ़िल्टर हटाएं' : 'Reset Filter'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredResults.length > 0 ? (
              <View style={{ gap: 10 }}>
                {filteredResults.map((item) => {
                  const styleMeta = getTypeStyle(item.type);
                  const Icon = styleMeta.Icon;
                  const title = isHi && item.titleHi ? item.titleHi : item.title;
                  const subtitle = isHi && item.subtitleHi ? item.subtitleHi : item.subtitle;
                  const badge = isHi && item.badgeHi ? item.badgeHi : item.badge;
                  const location = isHi && item.locationHi ? item.locationHi : item.location;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectItem(item)}
                      activeOpacity={0.8}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: R.lg,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: C.line,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        ...SHADOW,
                      }}
                    >
                      {/* Icon */}
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: styleMeta.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={22} color={styleMeta.tint} strokeWidth={2.4} />
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 15, fontWeight: '700', color: C.ink, flexShrink: 1 }}
                          >
                            {title}
                          </Text>
                          {badge && (
                            <View
                              style={{
                                backgroundColor: styleMeta.bg,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: R.pill,
                              }}
                            >
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: styleMeta.tint }}>
                                {badge}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text numberOfLines={2} style={{ fontSize: 12.5, color: C.sub, marginTop: 2, lineHeight: 18 }}>
                          {subtitle}
                        </Text>

                        {/* Extra info row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 }}>
                          {item.price !== undefined && (
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: C.brand }}>
                              {inr(item.price)}
                            </Text>
                          )}
                          {item.rating && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Star size={12} color="#F59E0B" fill="#F59E0B" />
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.ink }}>
                                {item.rating}
                              </Text>
                            </View>
                          )}
                          {location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <MapPin size={11} color={C.sub} />
                              <Text style={{ fontSize: 11.5, color: C.sub }}>
                                {location}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Chevron CTA */}
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#F8FAFC',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ChevronRight size={16} color="#64748B" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              /* Empty state */
              <View
                style={{
                  alignItems: 'center',
                  paddingVertical: 36,
                  paddingHorizontal: 20,
                  backgroundColor: '#FFFFFF',
                  borderRadius: R.xl,
                  borderWidth: 1,
                  borderColor: C.line,
                  marginTop: 10,
                  ...SHADOW,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Search size={30} color="#94A3B8" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, textAlign: 'center' }}>
                  {isHi ? 'कोई सेवा या परिणाम नहीं मिला' : 'No Matching Services Found'}
                </Text>
                <Text style={{ fontSize: 13, color: C.sub, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 320 }}>
                  {isHi
                    ? 'कृपया किसी अन्य कीवर्ड से खोजें, जैसे "अपोलो", "हार्ट", "ब्लड टेस्ट" या "डोलो"।'
                    : 'Try searching with common terms like "Apollo", "Cardiology", "CBC", or "Cataract".'}
                </Text>

                <TouchableOpacity
                  onPress={() => { setQuery(''); setActiveFilter('all'); }}
                  style={{
                    marginTop: 18,
                    height: 40,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                    backgroundColor: C.brandSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13.5 }}>
                    {isHi ? 'खोज साफ़ करें' : 'Clear Search & Filters'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
