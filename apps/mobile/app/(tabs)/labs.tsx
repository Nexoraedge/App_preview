
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FlaskConical,
  Search,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  X,
  Building2,
  Sparkles,
  Activity,
  Award,
  Info,
  Droplets,
  Home as HomeIcon,
  ShoppingBag,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import {
  InvestigationsFlaskIcon,
  HeartPulseIcon,
  BoneJointIcon,
  AllCategoriesIcon,
} from '../../components/ServiceIcons';

interface LabCategory {
  id: string;
  label: string;
  subtitle: string;
  count: string;
  icon: (color: string) => React.ReactNode;
}

interface TestProfile {
  name: string;
  count: number;
  tests: string[];
}

interface HealthPackage {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  testsCount: number;
  fastingTime: string;
  reportTime: string;
  sampleType: string;
  locationType: 'home_or_center' | 'center_only';
  price: number;
  originalPrice: number;
  discountPercent: number;
  category: string;
  keywords: string[];
  profiles: TestProfile[];
}

interface DiagnosticTest {
  id: string;
  name: string;
  category: string;
  parametersCount: number;
  fasting: string;
  reportTime: string;
  sampleType: string;
  locationType: 'home_or_center' | 'center_only';
  price: number;
  originalPrice: number;
  discountPercent: number;
  tag: string;
  keywords: string[];
}

// Smart text normalizer for robust search
const normalizeQuery = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchesSearch = (itemText: string, itemKeywords: string[], query: string) => {
  const normQ = normalizeQuery(query);
  if (!normQ) return true;

  const compactQ = normQ.replace(/\s+/g, '');
  const normItem = normalizeQuery(itemText);
  const compactItem = normItem.replace(/\s+/g, '');

  if (normItem.includes(normQ) || compactItem.includes(compactQ)) {
    return true;
  }

  // Check keywords list
  for (const kw of itemKeywords) {
    const normKw = normalizeQuery(kw);
    const compactKw = normKw.replace(/\s+/g, '');
    if (normKw.includes(normQ) || compactKw.includes(compactQ) || normQ.includes(normKw)) {
      return true;
    }
  }

  // Word token matching: all words in query must appear in either name or keywords
  const qTokens = normQ.split(' ');
  const allTokensMatch = qTokens.every((token) => {
    return normItem.includes(token) || itemKeywords.some((kw) => normalizeQuery(kw).includes(token));
  });

  return allTokensMatch;
};

export default function LabsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<'all' | 'home' | 'fast' | 'no-fasting'>('all');

  // Track expanded package profiles
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  // Cart state: map of test/package id -> item details
  const [cart, setCart] = useState<
    Record<
      string,
      {
        id: string;
        name: string;
        price: number;
        type: 'package' | 'test';
        locationType: 'home_or_center' | 'center_only';
      }
    >
  >({});

  // Booking Modal State
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedItemForBooking, setSelectedItemForBooking] = useState<{
    id: string;
    title: string;
    price: number;
    type: 'package' | 'test';
    locationType: 'home_or_center' | 'center_only';
  } | null>(null);

  const [collectionMode, setCollectionMode] = useState<'HOME' | 'CENTER'>('HOME');
  const [patientName, setPatientName] = useState(user?.full_name || 'Hardik Gupta');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98112 44550');
  const [address, setAddress] = useState('B-402, Green Glen Layout, Bellandur, Bengaluru');
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedSlot, setSelectedSlot] = useState('07:30 AM - 08:30 AM');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Prescription Upload Modal State
  const [prescriptionModalVisible, setPrescriptionModalVisible] = useState(false);
  const [prescriptionNote, setPrescriptionNote] = useState('');
  const [isSubmittingPrescription, setIsSubmittingPrescription] = useState(false);
  const [prescriptionSuccessRef, setPrescriptionSuccessRef] = useState<string | null>(null);

  // Categories List for Dropdown
  const categories: LabCategory[] = useMemo(
    () => [
      {
        id: 'All',
        label: language === 'hi' ? 'सभी टेस्ट और स्कैन्स' : 'All Tests & Scans',
        subtitle: 'Complete catalog of scans, blood tests & packages',
        count: '26 Tests',
        icon: (color: string) => <AllCategoriesIcon size={24} color={color} />,
      },
      {
        id: 'Radiology',
        label: language === 'hi' ? 'रेडियोलॉजी (X-Ray, CT Scan, MRI)' : 'Radiology (X-Ray, CT, MRI, USG)',
        subtitle: 'Digital X-Rays, High-Res CT Scans, MRI & Ultrasound',
        count: '9 Scans',
        icon: (color: string) => <Activity size={22} color={color} />,
      },
      {
        id: 'Packages',
        label: language === 'hi' ? 'फुल बॉडी चेकअप पैकेज' : 'Full Body Health Packages',
        subtitle: 'Comprehensive preventive screenings with 70+ tests',
        count: '4 Packages',
        icon: (color: string) => <InvestigationsFlaskIcon size={24} color={color} />,
      },
      {
        id: 'Pathology',
        label: language === 'hi' ? 'ब्लड व रूटीन पैथोलॉजी' : 'Blood & Routine Pathology',
        subtitle: 'CBC, Urine Routine, LFT, KFT & Infection panels',
        count: '6 Tests',
        icon: (color: string) => <Droplets size={22} color={color} />,
      },
      {
        id: 'Diabetes',
        label: language === 'hi' ? 'डायबिटीज व शुगर टेस्ट' : 'Diabetes & Blood Sugar',
        subtitle: 'HbA1c, Fasting & Post-Prandial Glucose monitoring',
        count: '3 Tests',
        icon: (color: string) => <HeartPulseIcon size={24} color={color} />,
      },
      {
        id: 'Cardiac',
        label: language === 'hi' ? 'हार्ट, लिपिड व ईसीजी' : 'Cardiac, Lipid & ECG',
        subtitle: 'Lipid Profile, 12-Lead ECG & 2D Echocardiography',
        count: '3 Tests',
        icon: (color: string) => <HeartPulseIcon size={24} color={color} />,
      },
      {
        id: 'Thyroid',
        label: language === 'hi' ? 'थायरॉयड व हार्मोन्स' : 'Thyroid & Hormones',
        subtitle: 'Total T3, T4, TSH & metabolic hormone panels',
        count: '1 Test',
        icon: (color: string) => <Sparkles size={22} color={color} />,
      },
      {
        id: 'Vitamins',
        label: language === 'hi' ? 'विटामिन व बोन हेल्थ' : 'Vitamins & Bone Health',
        subtitle: 'Vitamin D (25-OH), B12 Duo & Calcium profiles',
        count: '1 Test',
        icon: (color: string) => <BoneJointIcon size={24} color={color} />,
      },
    ],
    [language]
  );

  const activeCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory) || categories[0];
  }, [categories, selectedCategory]);

  // Health Packages (Full Body)
  const healthPackages: HealthPackage[] = useMemo(
    () => [
      {
        id: 'pkg-total-shield',
        title: 'Adityam Total Health Shield',
        badge: 'MOST POPULAR',
        tagline: 'Comprehensive 78-parameter total vitality screening',
        testsCount: 78,
        fastingTime: '10-12 hrs fasting',
        reportTime: 'Reports in 12 hrs',
        sampleType: 'Blood & Urine Sample',
        locationType: 'home_or_center',
        price: 1299,
        originalPrice: 2999,
        discountPercent: 57,
        category: 'Packages',
        keywords: [
          'full body',
          'full body checkup',
          'body checkup',
          'total health',
          'health shield',
          'all tests',
          'executive checkup',
          'blood test package',
          'vital checkup',
        ],
        profiles: [
          { name: 'Complete Hemogram (CBC)', count: 24, tests: ['Hemoglobin', 'TLC', 'DLC', 'Platelet Count', 'RBC Count', 'PCV', 'MCV', 'MCH', 'MCHC', 'RDW'] },
          { name: 'Lipid Profile (Heart)', count: 8, tests: ['Total Cholesterol', 'Triglycerides', 'HDL Good Cholesterol', 'LDL Bad Cholesterol', 'VLDL', 'Chol/HDL Ratio'] },
          { name: 'Liver Function Test (LFT)', count: 11, tests: ['SGOT (AST)', 'SGPT (ALT)', 'Bilirubin Total & Direct', 'Alkaline Phosphatase', 'Total Protein', 'Albumin'] },
          { name: 'Kidney Profile (KFT)', count: 7, tests: ['Blood Urea', 'Serum Creatinine', 'Uric Acid', 'BUN', 'eGFR Calculation', 'Electrolytes'] },
          { name: 'Thyroid Function (TFT)', count: 3, tests: ['T3 Total', 'T4 Total', 'TSH Ultra-sensitive'] },
          { name: 'Diabetes Screen', count: 2, tests: ['HbA1c Glycated Hemoglobin', 'Average Blood Glucose (eAG)'] },
          { name: 'Vital Vitamins', count: 2, tests: ['Vitamin D3 (25-OH)', 'Vitamin B12 Cyanocobalamin'] },
          { name: 'Urine Routine & Microscopic', count: 21, tests: ['Color', 'pH', 'Specific Gravity', 'Proteins', 'Glucose', 'Ketones', 'Pus Cells', 'Epithelial Cells'] },
        ],
      },
      {
        id: 'pkg-cardiac-diabetic',
        title: 'Executive Heart & Diabetic Care',
        badge: 'CARDIAC SPECIAL',
        tagline: 'Cardiovascular risk assessment with deep metabolic profile',
        testsCount: 52,
        fastingTime: '10-12 hrs fasting',
        reportTime: 'Reports in 8 hrs',
        sampleType: 'Blood & Urine Sample',
        locationType: 'home_or_center',
        price: 899,
        originalPrice: 2100,
        discountPercent: 58,
        category: 'Cardiac',
        keywords: [
          'heart checkup',
          'diabetic checkup',
          'cardiac package',
          'sugar package',
          'cholesterol and sugar',
          'lipid and hba1c',
          'heart test',
        ],
        profiles: [
          { name: 'Lipid Profile Comprehensive', count: 8, tests: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL'] },
          { name: 'Diabetes Glycated Markers', count: 3, tests: ['HbA1c', 'Average Blood Glucose', 'Fasting Plasma Glucose'] },
          { name: 'Kidney & Renal Health', count: 6, tests: ['Serum Creatinine', 'Uric Acid', 'Urea', 'BUN'] },
          { name: 'Complete Blood Count (CBC)', count: 24, tests: ['Platelets', 'WBC', 'RBC', 'Hemoglobin'] },
          { name: 'Cardiac Risk Factor', count: 1, tests: ['Hs-CRP (High-Sensitivity C-Reactive Protein)'] },
          { name: 'Urine Microalbumin', count: 10, tests: ['Microalbuminuria', 'Urine Creatinine Ratio'] },
        ],
      },
      {
        id: 'pkg-senior-vital',
        title: 'Senior Citizen Vital Care Package',
        badge: 'SENIOR VITAL',
        tagline: 'Specialized age-tuned screening for bone, renal & liver health',
        testsCount: 66,
        fastingTime: '10-12 hrs fasting',
        reportTime: 'Reports in 12 hrs',
        sampleType: 'Blood & Urine Sample',
        locationType: 'home_or_center',
        price: 1499,
        originalPrice: 3500,
        discountPercent: 57,
        category: 'Packages',
        keywords: [
          'senior citizen',
          'elderly checkup',
          'parents checkup',
          'bone and kidney',
          'senior vital',
          'calcium package',
        ],
        profiles: [
          { name: 'Bone & Joint Markers', count: 4, tests: ['Serum Calcium', 'Phosphorus', 'Vitamin D3 Total', 'Alkaline Phosphatase'] },
          { name: 'Kidney Function Screen', count: 7, tests: ['Serum Creatinine', 'Urea', 'Uric Acid', 'eGFR'] },
          { name: 'Liver Function Panel', count: 11, tests: ['SGOT', 'SGPT', 'Bilirubin Total', 'Albumin'] },
          { name: 'Cardio-Lipid Panel', count: 8, tests: ['Cholesterol', 'Triglycerides', 'HDL', 'LDL'] },
          { name: 'Blood Hemogram (CBC)', count: 24, tests: ['Hemoglobin', 'Platelet Count', 'TLC', 'DLC'] },
          { name: 'Urine Examination', count: 12, tests: ['Protein', 'Sugar', 'Microscopic pus & crystals'] },
        ],
      },
      {
        id: 'pkg-women-wellness',
        title: "Women's Wellness & Hormone Panel",
        badge: 'WOMEN CARE',
        tagline: 'Hormonal, iron deficiency, thyroid & bone wellness profile',
        testsCount: 46,
        fastingTime: 'Fasting Preferred',
        reportTime: 'Reports in 8 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 999,
        originalPrice: 2400,
        discountPercent: 58,
        category: 'Thyroid',
        keywords: [
          'women wellness',
          'female health',
          'hormone checkup',
          'pcos',
          'thyroid iron package',
          'ferritin',
          'women checkup',
        ],
        profiles: [
          { name: 'Thyroid Function (TFT)', count: 3, tests: ['T3 Total', 'T4 Total', 'TSH Ultra-sensitive'] },
          { name: 'Iron Deficiency Profile', count: 4, tests: ['Serum Iron', 'Total Iron Binding Capacity (TIBC)', 'Transferrin Saturation', 'Serum Ferritin'] },
          { name: 'Vital Vitamins', count: 2, tests: ['Vitamin D3', 'Vitamin B12'] },
          { name: 'Complete Hemogram (CBC)', count: 24, tests: ['Hemoglobin', 'RBC indices', 'Platelets'] },
          { name: 'Calcium & Bone Health', count: 2, tests: ['Serum Calcium', 'Phosphorus'] },
          { name: 'Urine Routine Screen', count: 11, tests: ['Microscopic analysis'] },
        ],
      },
    ],
    []
  );

  // Individual Diagnostic Tests & Scans (Pathology + Full Radiology Catalog)
  const diagnosticTests: DiagnosticTest[] = useMemo(
    () => [
      // 1. RADIOLOGY & IMAGING SCANS (X-Ray, CT Scan, MRI, Ultrasound)
      {
        id: 'test-xray-chest',
        name: 'Digital Chest X-Ray (PA View)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 2 hrs',
        sampleType: 'Digital X-Ray Scan',
        locationType: 'center_only',
        price: 399,
        originalPrice: 750,
        discountPercent: 47,
        tag: 'X-RAY',
        keywords: ['x ray', 'xray', 'x-ray', 'chest x ray', 'chest xray', 'lungs', 'radiology', 'chest scan', 'digital x ray', 'x rays'],
      },
      {
        id: 'test-xray-knee',
        name: 'X-Ray Knee Joint (AP & Lateral View)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 2 hrs',
        sampleType: 'Digital X-Ray Scan',
        locationType: 'center_only',
        price: 549,
        originalPrice: 1100,
        discountPercent: 50,
        tag: 'X-RAY',
        keywords: ['x ray', 'xray', 'x-ray', 'knee x ray', 'joint x ray', 'bone x ray', 'arthritis', 'knee pain', 'orthopedic scan', 'x rays'],
      },
      {
        id: 'test-xray-spine',
        name: 'X-Ray Lumbar Spine (AP & Lateral)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 2 hrs',
        sampleType: 'Digital X-Ray Scan',
        locationType: 'center_only',
        price: 549,
        originalPrice: 1100,
        discountPercent: 50,
        tag: 'X-RAY',
        keywords: ['x ray', 'xray', 'x-ray', 'spine x ray', 'lumbar spine', 'back pain x ray', 'vertebrae', 'orthopedic x ray', 'x rays'],
      },
      {
        id: 'test-ct-chest',
        name: 'HRCT Chest (High-Resolution Lung CT Scan)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: '4 hrs Fasting for Contrast',
        reportTime: 'Reports in 4 hrs',
        sampleType: 'CT Imaging Scan',
        locationType: 'center_only',
        price: 1999,
        originalPrice: 4000,
        discountPercent: 50,
        tag: 'CT SCAN',
        keywords: ['ct scan', 'ct', 'hrct', 'chest ct', 'computed tomography', 'lung scan', 'thorax ct', 'ct chest', 'lung ct scan'],
      },
      {
        id: 'test-ct-brain',
        name: 'CT Scan Brain / Head (Plain NCCT)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 3 hrs',
        sampleType: 'CT Imaging Scan',
        locationType: 'center_only',
        price: 1499,
        originalPrice: 3000,
        discountPercent: 50,
        tag: 'CT SCAN',
        keywords: ['ct scan', 'ct', 'brain ct', 'head ct', 'computed tomography', 'ncct head', 'ct scan brain', 'head scan'],
      },
      {
        id: 'test-ct-abdomen',
        name: 'CT Scan Whole Abdomen (CECT)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: '4 hrs Fasting Required',
        reportTime: 'Reports in 6 hrs',
        sampleType: 'CT Imaging Scan',
        locationType: 'center_only',
        price: 2999,
        originalPrice: 5500,
        discountPercent: 45,
        tag: 'CT SCAN',
        keywords: ['ct scan', 'ct', 'abdomen ct', 'cect abdomen', 'stomach ct scan', 'pelvis ct', 'computed tomography', 'ct scan abdomen'],
      },
      {
        id: 'test-mri-brain',
        name: 'MRI Brain (1.5 / 3.0 Tesla Digital)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 6 hrs',
        sampleType: 'MRI Imaging Scan',
        locationType: 'center_only',
        price: 3499,
        originalPrice: 6500,
        discountPercent: 46,
        tag: 'MRI SCAN',
        keywords: ['mri', 'mri scan', 'mri brain', 'head mri', 'brain mri scan', 'magnetic resonance', 'neuro mri', 'mri head'],
      },
      {
        id: 'test-mri-spine',
        name: 'MRI Lumbar Spine / Lower Back',
        category: 'Radiology',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 6 hrs',
        sampleType: 'MRI Imaging Scan',
        locationType: 'center_only',
        price: 3499,
        originalPrice: 6500,
        discountPercent: 46,
        tag: 'MRI SCAN',
        keywords: ['mri', 'mri scan', 'mri spine', 'lumbar spine mri', 'back pain mri', 'sciatica mri', 'spine scan', 'mri back'],
      },
      {
        id: 'test-usg-abdomen',
        name: 'Ultrasound Whole Abdomen & Pelvis (USG)',
        category: 'Radiology',
        parametersCount: 1,
        fasting: 'Fasting & Full Bladder',
        reportTime: 'Immediate Digital Report',
        sampleType: 'Ultrasound Imaging',
        locationType: 'center_only',
        price: 899,
        originalPrice: 1600,
        discountPercent: 44,
        tag: 'ULTRASOUND',
        keywords: ['ultrasound', 'usg', 'sonography', 'abdomen ultrasound', 'usg abdomen', 'stomach ultrasound', 'pelvic sonography', 'ultra sound'],
      },

      // 2. CARDIAC SCANS (ECG & ECHO)
      {
        id: 'test-ecg',
        name: 'ECG (12-Lead Electrocardiogram)',
        category: 'Cardiac',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Immediate Report',
        sampleType: 'Cardiac Scan',
        locationType: 'home_or_center',
        price: 199,
        originalPrice: 400,
        discountPercent: 50,
        tag: 'ECG',
        keywords: ['ecg', 'ekg', 'electrocardiogram', 'heart ecg', 'cardiac ecg', 'heart rhythm'],
      },
      {
        id: 'test-echo',
        name: '2D Echocardiography with Color Doppler',
        category: 'Cardiac',
        parametersCount: 1,
        fasting: 'No Fasting Required',
        reportTime: 'Immediate Digital Report',
        sampleType: 'Cardiac Ultrasound',
        locationType: 'center_only',
        price: 1299,
        originalPrice: 2200,
        discountPercent: 41,
        tag: 'ECHO',
        keywords: ['echo', 'echocardiogram', '2d echo', 'heart ultrasound', 'color doppler', 'cardiac echo', 'heart scan'],
      },
      {
        id: 'test-lipid',
        name: 'Lipid Profile Complete (Cholesterol & Heart)',
        category: 'Cardiac',
        parametersCount: 8,
        fasting: '10-12 hrs Fasting',
        reportTime: 'Reports in 8 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 399,
        originalPrice: 800,
        discountPercent: 50,
        tag: 'LIPID',
        keywords: ['lipid profile', 'cholesterol', 'triglycerides', 'hdl', 'ldl', 'heart check', 'cardiac lipid'],
      },

      // 3. PATHOLOGY & BLOOD TESTS
      {
        id: 'test-cbc',
        name: 'Complete Blood Count (CBC - 24 Tests)',
        category: 'Pathology',
        parametersCount: 24,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 6 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 249,
        originalPrice: 500,
        discountPercent: 50,
        tag: 'CBC',
        keywords: ['cbc', 'complete blood count', 'blood test', 'hemoglobin', 'platelet', 'tlc', 'dlc', 'wbc', 'rbc', 'anemia', 'fever', 'blood'],
      },
      {
        id: 'test-hba1c',
        name: 'HbA1c (Glycosylated Hemoglobin for Sugar)',
        category: 'Diabetes',
        parametersCount: 2,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 6 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 299,
        originalPrice: 600,
        discountPercent: 50,
        tag: 'DIABETES',
        keywords: ['hba1c', 'sugar test', 'diabetes test', 'glycated hemoglobin', 'blood sugar', 'glucose 3 months', 'sugar'],
      },
      {
        id: 'test-glucose-fasting',
        name: 'Glucose Fasting (FBS Blood Sugar)',
        category: 'Diabetes',
        parametersCount: 1,
        fasting: '8-10 hrs Fasting',
        reportTime: 'Reports in 4 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 99,
        originalPrice: 200,
        discountPercent: 50,
        tag: 'SUGAR',
        keywords: ['glucose', 'fasting sugar', 'blood sugar', 'fbs', 'sugar test', 'diabetes fasting'],
      },
      {
        id: 'test-glucose-pp',
        name: 'Glucose Post-Prandial (PPBS - After Food)',
        category: 'Diabetes',
        parametersCount: 1,
        fasting: '2 hrs After Meal',
        reportTime: 'Reports in 4 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 99,
        originalPrice: 200,
        discountPercent: 50,
        tag: 'SUGAR',
        keywords: ['ppbs', 'post prandial', 'sugar test', 'blood sugar pp', 'glucose after meal'],
      },
      {
        id: 'test-thyroid',
        name: 'Thyroid Profile Total (T3, T4, TSH)',
        category: 'Thyroid',
        parametersCount: 3,
        fasting: 'Fasting Preferred',
        reportTime: 'Reports in 6 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 349,
        originalPrice: 750,
        discountPercent: 53,
        tag: 'THYROID',
        keywords: ['thyroid', 'thyroid profile', 'tsh', 't3', 't4', 'tft', 'hypothyroidism', 'hyperthyroidism'],
      },
      {
        id: 'test-vit-duo',
        name: 'Vitamin D (25-OH) & Vitamin B12 Duo',
        category: 'Vitamins',
        parametersCount: 2,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 12 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 749,
        originalPrice: 1700,
        discountPercent: 56,
        tag: 'VITAMINS',
        keywords: ['vitamin d', 'vitamin b12', 'vit d', 'vit b12', 'vitamins', 'bone weakness', 'fatigue', 'energy', 'b12', 'vitamin'],
      },
      {
        id: 'test-lft',
        name: 'Liver Function Test (LFT - 11 Parameters)',
        category: 'Pathology',
        parametersCount: 11,
        fasting: '8 hrs Fasting',
        reportTime: 'Reports in 8 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 399,
        originalPrice: 850,
        discountPercent: 53,
        tag: 'LIVER',
        keywords: ['lft', 'liver function test', 'sgot', 'sgpt', 'bilirubin', 'jaundice', 'liver enzymes', 'liver'],
      },
      {
        id: 'test-kft',
        name: 'Kidney Function Test (KFT / RFT - 7 Tests)',
        category: 'Pathology',
        parametersCount: 7,
        fasting: 'Fasting Preferred',
        reportTime: 'Reports in 8 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 399,
        originalPrice: 850,
        discountPercent: 53,
        tag: 'KIDNEY',
        keywords: ['kft', 'rft', 'kidney function test', 'creatinine', 'urea', 'uric acid', 'renal function', 'kidney'],
      },
      {
        id: 'test-urine',
        name: 'Urine Routine & Microscopic Examination',
        category: 'Pathology',
        parametersCount: 21,
        fasting: 'Morning Sample',
        reportTime: 'Reports in 4 hrs',
        sampleType: 'Urine Sample',
        locationType: 'home_or_center',
        price: 199,
        originalPrice: 400,
        discountPercent: 50,
        tag: 'URINE',
        keywords: ['urine routine', 'urine test', 'uti', 'urine culture', 'pus cells', 'urinalysis', 'urine'],
      },
      {
        id: 'test-dengue',
        name: 'Dengue NS1 Antigen & Antibody Duo (Rapid)',
        category: 'Pathology',
        parametersCount: 3,
        fasting: 'No Fasting Required',
        reportTime: 'Reports in 2 hrs',
        sampleType: 'Blood Sample',
        locationType: 'home_or_center',
        price: 499,
        originalPrice: 900,
        discountPercent: 44,
        tag: 'FEVER',
        keywords: ['dengue', 'dengue test', 'ns1', 'platelets dengue', 'fever test', 'mosquito fever', 'dengue fever'],
      },
    ],
    []
  );

  // Filtered packages with robust search
  const filteredPackages = useMemo(() => {
    return healthPackages.filter((pkg) => {
      const matchSearch = matchesSearch(
        `${pkg.title} ${pkg.tagline} ${pkg.badge} ${pkg.profiles.map((p) => p.name).join(' ')}`,
        pkg.keywords,
        searchQuery
      );

      const hasSearch = searchQuery.trim().length > 0;
      const matchCategory =
        selectedCategory === 'All' ||
        selectedCategory === 'Packages' ||
        (hasSearch ? true : pkg.category === selectedCategory);

      const matchQuickFilter =
        activeQuickFilter === 'all' ||
        (activeQuickFilter === 'fast' && pkg.reportTime.includes('8 hrs')) ||
        (activeQuickFilter === 'home');

      return matchSearch && matchCategory && matchQuickFilter;
    });
  }, [healthPackages, searchQuery, selectedCategory, activeQuickFilter]);

  // Filtered tests with robust search
  const filteredTests = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;

    return diagnosticTests.filter((test) => {
      const matchSearch = matchesSearch(
        `${test.name} ${test.category} ${test.tag} ${test.sampleType}`,
        test.keywords,
        searchQuery
      );

      const matchCategory =
        selectedCategory === 'All' ||
        (hasSearch ? true : test.category === selectedCategory);

      const matchQuickFilter =
        activeQuickFilter === 'all' ||
        (activeQuickFilter === 'no-fasting' && test.fasting.includes('No Fasting')) ||
        (activeQuickFilter === 'fast' &&
          (test.reportTime.includes('2 hrs') ||
            test.reportTime.includes('3 hrs') ||
            test.reportTime.includes('4 hrs') ||
            test.reportTime.includes('6 hrs') ||
            test.reportTime.includes('Immediate'))) ||
        (activeQuickFilter === 'home' && test.locationType === 'home_or_center');

      return matchSearch && matchCategory && matchQuickFilter;
    });
  }, [diagnosticTests, searchQuery, selectedCategory, activeQuickFilter]);

  // Cart helper functions
  const toggleCartItem = (
    id: string,
    name: string,
    price: number,
    type: 'package' | 'test',
    locationType: 'home_or_center' | 'center_only'
  ) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = { id, name, price, type, locationType };
      }
      return next;
    });
  };

  const cartItemsCount = Object.keys(cart).length;
  const cartTotalPrice = Object.values(cart).reduce((sum, item) => sum + item.price, 0);

  // Direct Booking Handler
  const handleOpenBookingModal = (item: {
    id: string;
    title: string;
    price: number;
    type: 'package' | 'test';
    locationType: 'home_or_center' | 'center_only';
  }) => {
    setSelectedItemForBooking(item);
    setConfirmedBooking(null);
    setCollectionMode(item.locationType === 'center_only' ? 'CENTER' : 'HOME');
    setBookingModalVisible(true);
  };

  // Open Diagnostic Centers Page for a specific test / scan
  const handleOpenTestCenters = (test: DiagnosticTest) => {
    router.push({
      pathname: '/diagnostic-centers',
      params: {
        id: test.id,
        title: test.name,
        category: test.category,
        price: test.price.toString(),
        originalPrice: test.originalPrice.toString(),
        discountPercent: test.discountPercent.toString(),
        tag: test.tag,
        sampleType: test.sampleType,
        locationType: test.locationType,
        reportTime: test.reportTime,
        fasting: test.fasting,
      },
    });
  };

  // Submit Slot Booking to Supabase
  const handleConfirmLabBooking = async () => {
    if (!selectedItemForBooking) return;
    setIsSubmittingBooking(true);

    const bookingRef = `AN-LAB-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'INVESTIGATION',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: 'NABL Accredited Diagnostic Center',
      doctor_fee: selectedItemForBooking.price,
      slot_time: `${selectedDate}, ${selectedSlot}`,
      specialty_requested: selectedItemForBooking.title,
      status: 'NEW',
      call_status: 'pending',
      notes: `Mode: ${collectionMode === 'HOME' ? 'Home Sample Pickup' : 'Visit Diagnostic Center'
        }. Address: ${collectionMode === 'HOME' ? address : 'Partner Diagnostic Center'}`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback handling
    }

    setTimeout(() => {
      setIsSubmittingBooking(false);
      setConfirmedBooking(newBooking);
      if (cart[selectedItemForBooking.id]) {
        const next = { ...cart };
        delete next[selectedItemForBooking.id];
        setCart(next);
      }
    }, 700);
  };

  // Submit Prescription Callback
  const handleConfirmPrescription = async () => {
    setIsSubmittingPrescription(true);
    const ref = `AN-RX-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: ref,
      service_type: 'INVESTIGATION',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      specialty_requested: "Doctor's Prescription Review",
      status: 'NEW',
      call_status: 'pending',
      notes: `Prescription verification requested. Note: ${prescriptionNote || 'Standard Prescription verification'
        }. Masked caller routing assigned.`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback handling
    }

    setTimeout(() => {
      setIsSubmittingPrescription(false);
      setPrescriptionSuccessRef(ref);
    }, 700);
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: cartItemsCount > 0 ? 100 : 32,
        }}
      >
        {/* 1. Header Section in Royal Medical Blue Gradient (1:1 with OPD & Home) */}
        <LinearGradient
          colors={['#172554', '#1E40AF', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingHorizontal: 16,
            paddingBottom: 22,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            shadowColor: '#1E3A8A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient light glow circle */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -40,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          />

          {/* Top Status & Geolocation Pills - 1:1 Clean with OPD (Responsive for Fold/Small screens) */}
          <View className="flex-row items-center justify-between mb-3.5 gap-2">
            <View className="flex-row items-center space-x-1.5 bg-white/15 border border-white/25 px-2.5 py-1 rounded-full shrink min-w-0">
              <MapPin size={11} color="#BFDBFE" />
              <Text className="text-[10.5px] font-bold text-white shrink" numberOfLines={1}>
                South Delhi NCR • 50 km radius
              </Text>
            </View>

            <View className="flex-row items-center space-x-1 bg-white/20 px-2.5 py-1 rounded-full border border-white/30 shrink-0">
              <ShieldCheck size={11} color="#FFFFFF" />
              <Text className="text-[10px] font-bold text-white">NABL Accredited</Text>
            </View>
          </View>

          {/* Title & Tagline */}
          <Text className="text-[26px] font-black text-white tracking-tight leading-[32px]">
            {language === 'hi' ? 'लैब टेस्ट और डायग्नोस्टिक्स' : 'Diagnostic Tests & Scans'}
          </Text>
          <Text className="text-xs font-medium text-blue-100 mt-1 mb-4">
            {language === 'hi'
              ? 'एक्स-रे, सीटी स्कैन, एमआरआई, ब्लड टेस्ट व फुल बॉडी चेकअप'
              : 'NABL pathology blood tests, Digital X-Rays, CT Scans & MRI'}
          </Text>

          {/* Search Bar - Exact Match to OPD & Home Floating Search Bar */}
          <View className="bg-white rounded-full flex-row items-center pl-4 pr-1.5 py-1.5 shadow-lg shadow-blue-950/20 mb-1">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                language === 'hi'
                  ? 'एक्स-रे, सीटी स्कैन, एमआरआई, सीबीसी खोजें...'
                  : 'Search X-Ray, CT Scan, MRI, Ultrasound, CBC...'
              }
              placeholderTextColor="#94A3B8"
              className="flex-1 text-sm text-slate-800 font-medium py-1 px-1"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center mr-1"
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            )}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2563EB',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Search size={17} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
        </LinearGradient>

        {/* 2. Category Dropdown Trigger (Clean & High-Design, Responsive for Fold/Small screens) */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {language === 'hi' ? 'कैटेगरी चुने' : 'Category / Diagnostic Type'}
            </Text>
            {selectedCategory !== 'All' && (
              <TouchableOpacity
                onPress={() => setSelectedCategory('All')}
                className="flex-row items-center space-x-1"
              >
                <Text className="text-xs font-bold text-[#2563EB]">
                  {language === 'hi' ? 'सभी देखें' : 'Show All'}
                </Text>
                <X size={12} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setCategoryModalVisible(true)}
            activeOpacity={0.88}
            className="bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs flex-row items-center justify-between"
            style={{
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 5,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center space-x-2.5 flex-1 pr-2 min-w-0">
              <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center shrink-0">
                {activeCategoryObj.icon('#2563EB')}
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-black text-[#0F172A]" numberOfLines={1}>
                  {activeCategoryObj.label}
                </Text>
                <Text className="text-[10.5px] text-slate-500 font-medium" numberOfLines={1}>
                  {activeCategoryObj.subtitle}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-1 bg-blue-50/80 border border-blue-100 px-2.5 py-1.5 rounded-xl shrink-0">
              <Text className="text-xs font-bold text-[#2563EB]">Select</Text>
              <ChevronDown size={13} color="#2563EB" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Upload Prescription Interactive Card - Ultra-Premium & Non-Cramped */}
        <View className="px-4 mt-4">
          <TouchableOpacity
            onPress={() => {
              setPrescriptionSuccessRef(null);
              setPrescriptionModalVisible(true);
            }}
            activeOpacity={0.92}
            className="bg-white rounded-3xl p-4 border border-blue-200/90 shadow-sm"
            style={{
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            {/* Header: Status Pills */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full flex-row items-center space-x-1">
                <Sparkles size={11} color="#2563EB" />
                <Text className="text-[9.5px] font-black text-[#2563EB] uppercase tracking-wider">
                  Doctor-Led Concierge
                </Text>
              </View>
              <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex-row items-center space-x-1">
                <Clock size={10} color="#059669" />
                <Text className="text-[9.5px] font-black text-emerald-700">10-MIN FAST CALLBACK</Text>
              </View>
            </View>

            {/* Middle: Icon + Title + Description */}
            <View className="flex-row items-start space-x-3.5">
              <View className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center shrink-0 mt-0.5">
                <FileText size={24} color="#2563EB" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-black text-[#0F172A] leading-snug">
                  {language === 'hi' ? 'डॉक्टर का पर्चा है?' : "Have a Doctor's Prescription?"}
                </Text>
                <Text className="text-[11.5px] text-slate-500 font-medium mt-1 leading-4">
                  {language === 'hi'
                    ? 'पर्चा अपलोड करें • हमारे विशेषज्ञ टेस्ट चुनकर 60% तक छूट पर बुक करेंगे'
                    : 'Upload prescription & let our medical team arrange tests, recommend accredited labs & apply maximum discounts.'}
                </Text>
              </View>
            </View>

            {/* Bottom Row: Trust Chips + Dedicated CTA Button (No Overlaps on any screen) */}
            <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
              <View className="flex-row items-center space-x-2">
                <View className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-slate-600">✓ Up to 60% Off</Text>
                </View>
                <View className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-slate-600">✓ NABL Labs</Text>
                </View>
              </View>

              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="px-4 py-2 rounded-xl flex-row items-center space-x-1.5 shadow-xs"
              >
                <Text className="text-white text-xs font-black">
                  {language === 'hi' ? 'अपलोड करें' : 'Upload Now'}
                </Text>
                <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Quick Micro-Filter Chips */}
        <View className="px-4 mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <TouchableOpacity
              onPress={() => setActiveQuickFilter('all')}
              className={`px-3.5 py-1.5 rounded-full mr-2 border ${activeQuickFilter === 'all'
                  ? 'bg-blue-50 border-[#2563EB]'
                  : 'bg-white border-slate-200'
                }`}
            >
              <Text
                className={`text-[11px] font-bold ${activeQuickFilter === 'all' ? 'text-[#2563EB]' : 'text-slate-600'
                  }`}
              >
                All Options
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveQuickFilter('home')}
              className={`px-3.5 py-1.5 rounded-full mr-2 border flex-row items-center space-x-1 ${activeQuickFilter === 'home'
                  ? 'bg-blue-50 border-[#2563EB]'
                  : 'bg-white border-slate-200'
                }`}
            >
              <HomeIcon size={11} color={activeQuickFilter === 'home' ? '#2563EB' : '#64748B'} />
              <Text
                className={`text-[11px] font-bold ${activeQuickFilter === 'home' ? 'text-[#2563EB]' : 'text-slate-600'
                  }`}
              >
                Home Sample Collection
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveQuickFilter('fast')}
              className={`px-3.5 py-1.5 rounded-full mr-2 border flex-row items-center space-x-1 ${activeQuickFilter === 'fast'
                  ? 'bg-blue-50 border-[#2563EB]'
                  : 'bg-white border-slate-200'
                }`}
            >
              <Clock size={11} color={activeQuickFilter === 'fast' ? '#2563EB' : '#64748B'} />
              <Text
                className={`text-[11px] font-bold ${activeQuickFilter === 'fast' ? 'text-[#2563EB]' : 'text-slate-600'
                  }`}
              >
                Same-Day Results (&lt; 6 hrs)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveQuickFilter('no-fasting')}
              className={`px-3.5 py-1.5 rounded-full mr-2 border ${activeQuickFilter === 'no-fasting'
                  ? 'bg-blue-50 border-[#2563EB]'
                  : 'bg-white border-slate-200'
                }`}
            >
              <Text
                className={`text-[11px] font-bold ${activeQuickFilter === 'no-fasting' ? 'text-[#2563EB]' : 'text-slate-600'
                  }`}
              >
                No Fasting Required
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 5. Health Packages Section (with Interactive Test Breakdown) */}
        {filteredPackages.length > 0 && (
          <View className="mt-5 px-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 pr-2">
                <Text className="text-lg font-black text-[#0F172A]">
                  {language === 'hi' ? 'पॉपुलर हेल्थ पैकेज' : 'Popular Health Packages'}
                </Text>
                <Text className="text-xs text-slate-500 font-medium">
                  {language === 'hi'
                    ? '70+ टेस्ट्स सहित अधिकतम बचत'
                    : 'Full body preventive checkups with maximum savings'}
                </Text>
              </View>
              <View className="bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full shrink-0">
                <Text className="text-[10px] font-black text-amber-700">UP TO 58% OFF</Text>
              </View>
            </View>

            <View style={{ rowGap: 14 }}>
              {filteredPackages.map((pkg) => {
                const isExpanded = expandedPackage === pkg.id;
                const isInCart = !!cart[pkg.id];

                return (
                  <View
                    key={pkg.id}
                    className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm"
                    style={{
                      shadowColor: '#1E3A8A',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    {/* Top Row: Badge & Discount */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                        <Text className="text-[9px] font-black text-[#2563EB] tracking-wider uppercase">
                          {pkg.badge}
                        </Text>
                      </View>
                      <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <Text className="text-[9.5px] font-black text-emerald-700">
                          {pkg.discountPercent}% OFF
                        </Text>
                      </View>
                    </View>

                    {/* Title & Tagline */}
                    <Text className="text-base font-black text-[#0F172A] tracking-tight">
                      {pkg.title}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5 font-medium leading-4">
                      {pkg.tagline}
                    </Text>

                    {/* Specs / Badges */}
                    <View className="flex-row flex-wrap items-center gap-2 mt-3">
                      <View className="bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-xl flex-row items-center space-x-1">
                        <FlaskConical size={12} color="#2563EB" />
                        <Text className="text-[11px] font-bold text-slate-700">
                          {pkg.testsCount} Tests Included
                        </Text>
                      </View>

                      <View className="bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-xl flex-row items-center space-x-1">
                        <Clock size={12} color="#64748B" />
                        <Text className="text-[11px] font-medium text-slate-600">
                          {pkg.fastingTime}
                        </Text>
                      </View>

                      <View className="bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-xl flex-row items-center space-x-1">
                        <HomeIcon size={12} color="#10B981" />
                        <Text className="text-[11px] font-medium text-slate-600">
                          Home Sample Pickup
                        </Text>
                      </View>
                    </View>

                    {/* Expandable Profiles Accordion */}
                    <TouchableOpacity
                      onPress={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                      activeOpacity={0.8}
                      className="mt-3 py-2 px-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center space-x-1.5">
                        <Info size={13} color="#2563EB" />
                        <Text className="text-xs font-bold text-[#2563EB]">
                          {isExpanded
                            ? 'Hide Included Test Profiles'
                            : `View ${pkg.profiles.length} Profiles (${pkg.testsCount} Tests)`}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#2563EB" />
                      ) : (
                        <ChevronDown size={16} color="#2563EB" />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="mt-3 pt-3 border-t border-slate-100">
                        <Text className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                          Breakdown of Included Tests
                        </Text>
                        <View style={{ rowGap: 8 }}>
                          {pkg.profiles.map((profile, idx) => (
                            <View
                              key={idx}
                              className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100"
                            >
                              <View className="flex-row items-center justify-between mb-1">
                                <Text className="text-xs font-bold text-slate-800">
                                  {profile.name}
                                </Text>
                                <Text className="text-[10px] font-black text-blue-600">
                                  {profile.count} Tests
                                </Text>
                              </View>
                              <Text className="text-[10.5px] text-slate-500 leading-4">
                                {profile.tests.join(' • ')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Bottom Row: Price & Actions (Small device safe) */}
                    <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-slate-100 flex-wrap gap-2">
                      <View>
                        <View className="flex-row items-baseline space-x-1.5">
                          <Text className="text-xl font-black text-[#0F172A]">₹{pkg.price}</Text>
                          <Text className="text-xs line-through text-slate-400 font-medium">
                            ₹{pkg.originalPrice}
                          </Text>
                        </View>
                        <Text className="text-[10px] font-bold text-emerald-600">
                          Save ₹{pkg.originalPrice - pkg.price}
                        </Text>
                      </View>

                      <View className="flex-row items-center space-x-2">
                        <TouchableOpacity
                          onPress={() =>
                            toggleCartItem(
                              pkg.id,
                              pkg.title,
                              pkg.price,
                              'package',
                              pkg.locationType
                            )
                          }
                          activeOpacity={0.85}
                          className={`px-3 py-2 rounded-xl border flex-row items-center space-x-1 ${isInCart
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-white border-slate-200'
                            }`}
                        >
                          {isInCart ? (
                            <>
                              <Check size={14} color="#059669" strokeWidth={2.5} />
                              <Text className="text-xs font-bold text-emerald-700">Added</Text>
                            </>
                          ) : (
                            <>
                              <Plus size={14} color="#2563EB" strokeWidth={2.5} />
                              <Text className="text-xs font-bold text-[#2563EB]">Add</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            handleOpenBookingModal({
                              id: pkg.id,
                              title: pkg.title,
                              price: pkg.price,
                              type: 'package',
                              locationType: pkg.locationType,
                            })
                          }
                          activeOpacity={0.88}
                        >
                          <LinearGradient
                            colors={['#2563EB', '#1D4ED8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="px-4 py-2 rounded-xl flex-row items-center space-x-1.5 shadow-2xs"
                          >
                            <Text className="text-white text-xs font-black">Book Slot</Text>
                            <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.5} />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 6. Diagnostic Tests & Imaging Scans (X-Ray, CT, MRI, Pathology) */}
        <View className="mt-6 px-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 pr-2">
              <Text className="text-lg font-black text-[#0F172A]">
                {selectedCategory === 'Radiology'
                  ? 'Radiology & Imaging Scans'
                  : language === 'hi'
                    ? 'डायग्नोस्टिक टेस्ट और स्कैन्स'
                    : 'Diagnostic Tests & Scans'}
              </Text>
              <Text className="text-xs text-slate-500 font-medium">
                {selectedCategory === 'Radiology'
                  ? 'Digital X-Rays, High-Res CT, MRI & Ultrasound scans'
                  : language === 'hi'
                    ? 'एक्स-रे, सीटी स्कैन, एमआरआई और ब्लड टेस्ट'
                    : 'Tap any test to compare nearby accredited centers & offers'}
              </Text>
            </View>
            <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full shrink-0">
              <Text className="text-[10px] font-black text-[#2563EB]">
                {filteredTests.length} Available
              </Text>
            </View>
          </View>

          {filteredTests.length === 0 ? (
            <View className="bg-white rounded-3xl p-6 items-center border border-slate-200/90 shadow-sm my-2">
              <FlaskConical size={36} color="#94A3B8" />
              <Text className="text-sm font-bold text-slate-700 mt-2">
                No matching tests or scans found
              </Text>
              <Text className="text-xs text-slate-400 text-center mt-1">
                Try searching for X-Ray, CT Scan, MRI, Ultrasound, or CBC
              </Text>
            </View>
          ) : (
            <View style={{ rowGap: 12 }}>
              {filteredTests.map((test) => {
                const isInCart = !!cart[test.id];

                return (
                  <TouchableOpacity
                    key={test.id}
                    activeOpacity={0.9}
                    onPress={() => handleOpenTestCenters(test)}
                    className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs"
                    style={{
                      shadowColor: '#1E3A8A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 5,
                      elevation: 1,
                    }}
                  >
                    {/* Top Row: Tag + Modality + Discount Badge */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center space-x-1.5 flex-1 pr-2">
                        <View
                          className={`px-2.5 py-0.5 rounded-full ${test.tag.includes('CT') || test.tag.includes('MRI')
                              ? 'bg-indigo-50 border border-indigo-200'
                              : test.tag.includes('X-RAY')
                                ? 'bg-amber-50 border border-amber-200'
                                : 'bg-blue-50 border border-blue-200/80'
                            }`}
                        >
                          <Text
                            className={`text-[9.5px] font-black uppercase ${test.tag.includes('CT') || test.tag.includes('MRI')
                                ? 'text-indigo-700'
                                : test.tag.includes('X-RAY')
                                  ? 'text-amber-800'
                                  : 'text-[#2563EB]'
                              }`}
                          >
                            {test.tag}
                          </Text>
                        </View>
                        <Text className="text-[11px] font-semibold text-slate-500" numberOfLines={1}>
                          {test.sampleType}
                        </Text>
                      </View>

                      <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        <Text className="text-[9.5px] font-black text-emerald-700">
                          {test.discountPercent}% OFF
                        </Text>
                      </View>
                    </View>

                    {/* Full Width Test Name - Never Cramped on Small Screens */}
                    <Text className="text-[15px] font-black text-[#0F172A] leading-snug">
                      {test.name}
                    </Text>

                    {/* Metadata specs */}
                    <View className="flex-row flex-wrap items-center gap-x-2.5 gap-y-1 mt-2">
                      <View className="flex-row items-center space-x-1">
                        <Clock size={11} color="#64748B" />
                        <Text className="text-[11px] font-medium text-slate-500">
                          {test.reportTime}
                        </Text>
                      </View>
                      <Text className="text-[9px] text-slate-300">•</Text>
                      <Text className="text-[11px] font-medium text-slate-500">
                        {test.fasting}
                      </Text>
                    </View>

                    {/* Center or Home tag */}
                    <View className="mt-2.5 flex-row items-center">
                      {test.locationType === 'center_only' ? (
                        <View className="flex-row items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
                          <Building2 size={11} color="#475569" />
                          <Text className="text-[10.5px] font-semibold text-slate-600">
                            Walk-in Priority at Scanning Center
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center space-x-1.5 bg-emerald-50/80 px-2.5 py-1 rounded-xl border border-emerald-200/80">
                          <HomeIcon size={11} color="#059669" />
                          <Text className="text-[10.5px] font-semibold text-emerald-700">
                            Free Home Sample Collection Available
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom Row: Price on left, Actions on right */}
                    <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
                      <View>
                        <View className="flex-row items-baseline space-x-1.5">
                          <Text className="text-lg font-black text-[#0F172A]">₹{test.price}</Text>
                          <Text className="text-xs line-through text-slate-400 font-medium">
                            ₹{test.originalPrice}
                          </Text>
                        </View>
                        <Text className="text-[10px] font-bold text-emerald-600">
                          Save ₹{test.originalPrice - test.price}
                        </Text>
                      </View>

                      <View className="flex-row items-center space-x-2">
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleCartItem(
                              test.id,
                              test.name,
                              test.price,
                              'test',
                              test.locationType
                            );
                          }}
                          activeOpacity={0.85}
                          className={`px-3 py-2 rounded-xl border flex-row items-center space-x-1 ${isInCart
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-white border-slate-200'
                            }`}
                        >
                          {isInCart ? (
                            <>
                              <Check size={12} color="#059669" strokeWidth={3} />
                              <Text className="text-xs font-bold text-emerald-700">Added</Text>
                            </>
                          ) : (
                            <>
                              <Plus size={12} color="#2563EB" strokeWidth={3} />
                              <Text className="text-xs font-black text-[#2563EB]">Add</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <LinearGradient
                          colors={['#2563EB', '#1D4ED8']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="px-3.5 py-2 rounded-xl flex-row items-center space-x-1 shadow-2xs"
                        >
                          <Text className="text-white text-xs font-black">
                            {test.locationType === 'center_only' ? 'View Centers' : 'Book'}
                          </Text>
                          <ArrowRight size={12} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 7. Trust Banner at bottom */}
        <View className="px-4 mt-6 mb-4">
          <View className="bg-blue-50/70 border border-blue-100 rounded-3xl p-4 flex-row items-center space-x-3.5">
            <View className="w-11 h-11 rounded-2xl bg-white border border-blue-200 items-center justify-center shrink-0">
              <ShieldCheck size={22} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-black text-slate-900">
                Adityam 100% Quality & Hygiene Assurance
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5 leading-4">
                High-field 1.5/3.0 Tesla MRI, multi-slice low-radiation CT scanners, sealed sterile
                vacutainers & temperature-controlled logistics.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FLOATING CART BAR (POSITIONED SNUGLY RIGHT ABOVE TAB BAR) */}
      {cartItemsCount > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            left: 14,
            right: 14,
            shadowColor: '#1E3A8A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={['#172554', '#1E40AF', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="rounded-2xl p-3 flex-row items-center justify-between border border-white/20"
          >
            <View className="flex-row items-center space-x-2.5">
              <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center relative">
                <ShoppingBag size={17} color="#FFFFFF" />
                <View className="w-4 h-4 rounded-full bg-emerald-400 absolute -top-1 -right-1 items-center justify-center">
                  <Text className="text-[9px] font-black text-slate-900">{cartItemsCount}</Text>
                </View>
              </View>
              <View>
                <Text className="text-white text-[11px] font-semibold">
                  {cartItemsCount} {cartItemsCount === 1 ? 'Test Selected' : 'Tests Selected'}
                </Text>
                <Text className="text-white text-sm font-black">Total: ₹{cartTotalPrice}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                const firstItem = Object.values(cart)[0];
                const hasCenterOnly = Object.values(cart).some(
                  (c) => c.locationType === 'center_only'
                );
                handleOpenBookingModal({
                  id: firstItem.id,
                  title: `${cartItemsCount} Selected Tests (${Object.values(cart)
                    .map((c) => c.name)
                    .slice(0, 2)
                    .join(', ')}${cartItemsCount > 2 ? '...' : ''})`,
                  price: cartTotalPrice,
                  type: 'package',
                  locationType: hasCenterOnly ? 'center_only' : 'home_or_center',
                });
              }}
              activeOpacity={0.88}
              className="bg-white rounded-xl px-3.5 py-2 flex-row items-center space-x-1.5 shadow-sm"
            >
              <Text className="text-[#1E40AF] text-xs font-black">Proceed</Text>
              <ArrowRight size={13} color="#1E40AF" strokeWidth={3} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* CATEGORY DROPDOWN MODAL */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[82%]">
            <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100">
              <View>
                <Text className="text-base font-black text-[#0F172A]">
                  Select Diagnostic Category
                </Text>
                <Text className="text-xs text-slate-500">
                  Filter by scan type or medical specialization
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="py-2 mt-1">
              <View style={{ rowGap: 8 }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        setSelectedCategory(cat.id);
                        setCategoryModalVisible(false);
                      }}
                      activeOpacity={0.85}
                      className={`p-3 rounded-2xl border flex-row items-center justify-between ${isSelected
                          ? 'bg-blue-50/90 border-[#2563EB]'
                          : 'bg-white border-slate-200/90'
                        }`}
                    >
                      <View className="flex-row items-center space-x-3 flex-1 pr-2">
                        <View
                          className={`w-10 h-10 rounded-xl items-center justify-center border ${isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-blue-50 border-blue-100'
                            }`}
                        >
                          {cat.icon(isSelected ? '#FFFFFF' : '#2563EB')}
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`text-sm font-black ${isSelected ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                              }`}
                          >
                            {cat.label}
                          </Text>
                          <Text className="text-[11px] text-slate-500 mt-0.5">
                            {cat.subtitle}
                          </Text>
                        </View>
                      </View>

                      {isSelected ? (
                        <View className="w-6 h-6 rounded-full bg-[#2563EB] items-center justify-center">
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : (
                        <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-slate-600">
                            {cat.count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BOOKING MODAL */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[88%]">
            {confirmedBooking ? (
              <View className="py-6 items-center">
                <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-3">
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text className="text-xl font-black text-slate-900 text-center">
                  Appointment Scheduled!
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1 px-4 leading-relaxed">
                  {collectionMode === 'HOME'
                    ? 'Our certified phlebotomist has been booked for home sample collection.'
                    : 'Your priority walk-in pass has been reserved at our accredited scanning center with zero wait time.'}
                </Text>

                <View className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/80 my-4 space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Booking ID</Text>
                    <Text className="text-xs font-black text-blue-600">
                      {confirmedBooking.booking_ref}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Test / Scan</Text>
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                      {confirmedBooking.specialty_requested}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Slot Timing</Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {confirmedBooking.slot_time}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Mode</Text>
                    <Text className="text-xs font-bold text-blue-700">
                      {collectionMode === 'HOME' ? 'Home Sample Pickup' : 'Visit Scanning Center'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Total Amount</Text>
                    <Text className="text-xs font-black text-emerald-600">
                      ₹{confirmedBooking.doctor_fee} (Pay on Visit/Pickup)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setBookingModalVisible(false)}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center"
                >
                  <Text className="text-white text-sm font-black">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-black text-slate-900">
                      Schedule Test / Scan
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {selectedItemForBooking?.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBookingModalVisible(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Price Pill */}
                <View className="bg-blue-50/80 p-3 rounded-2xl border border-blue-100 my-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[11px] font-bold text-[#2563EB] uppercase">
                      Payable Amount
                    </Text>
                    <Text className="text-base font-black text-slate-900">
                      ₹{selectedItemForBooking?.price}
                    </Text>
                  </View>
                  <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
                    <Text className="text-[10px] font-black text-emerald-800">
                      {selectedItemForBooking?.locationType === 'center_only'
                        ? 'PRIORITY CENTER PASS'
                        : 'FREE HOME SAMPLE'}
                    </Text>
                  </View>
                </View>

                {/* Collection Mode Selection */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Test / Scan Location
                </Text>
                <View className="flex-row space-x-2 mb-4">
                  {selectedItemForBooking?.locationType !== 'center_only' && (
                    <TouchableOpacity
                      onPress={() => setCollectionMode('HOME')}
                      className={`flex-1 p-3 rounded-2xl border flex-row items-center space-x-2 ${collectionMode === 'HOME'
                          ? 'bg-blue-50/80 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                        }`}
                    >
                      <HomeIcon
                        size={18}
                        color={collectionMode === 'HOME' ? '#2563EB' : '#64748B'}
                      />
                      <View className="flex-1">
                        <Text
                          className={`text-xs font-black ${collectionMode === 'HOME' ? 'text-[#2563EB]' : 'text-slate-800'
                            }`}
                        >
                          Home Pickup
                        </Text>
                        <Text className="text-[10px] text-slate-500">Free Phlebotomist</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setCollectionMode('CENTER')}
                    className={`flex-1 p-3 rounded-2xl border flex-row items-center space-x-2 ${collectionMode === 'CENTER'
                        ? 'bg-blue-50/80 border-[#2563EB]'
                        : 'bg-white border-slate-200'
                      }`}
                  >
                    <Building2
                      size={18}
                      color={collectionMode === 'CENTER' ? '#2563EB' : '#64748B'}
                    />
                    <View className="flex-1">
                      <Text
                        className={`text-xs font-black ${collectionMode === 'CENTER' ? 'text-[#2563EB]' : 'text-slate-800'
                          }`}
                      >
                        Visit Lab / Scan Center
                      </Text>
                      <Text className="text-[10px] text-slate-500">Zero Wait Time</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Patient Information */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Patient Name
                </Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter patient full name"
                />

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Phone Number
                </Text>
                <TextInput
                  value={patientPhone}
                  onChangeText={setPatientPhone}
                  keyboardType="phone-pad"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter 10-digit mobile number"
                />

                {collectionMode === 'HOME' && (
                  <>
                    <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                      Collection Address
                    </Text>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      multiline
                      numberOfLines={2}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold mb-3"
                      placeholder="Flat, building, street, area, city"
                    />
                  </>
                )}

                {/* Date Selection */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Select Date
                </Text>
                <View className="flex-row space-x-2 mb-3">
                  {['Today', 'Tomorrow', 'Day After'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setSelectedDate(d)}
                      className={`flex-1 py-2 rounded-xl border items-center ${selectedDate === d
                          ? 'bg-blue-50 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                        }`}
                    >
                      <Text
                        className={`text-xs font-bold ${selectedDate === d ? 'text-[#2563EB]' : 'text-slate-600'
                          }`}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Slot Selection */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Select Preferred Slot
                </Text>
                <View style={{ rowGap: 8 }} className="mb-4">
                  {[
                    '07:30 AM - 09:00 AM (Fasting Preferred)',
                    '09:00 AM - 11:30 AM',
                    '11:30 AM - 02:00 PM',
                    '04:00 PM - 07:00 PM',
                  ].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSelectedSlot(s)}
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${selectedSlot === s
                          ? 'bg-blue-50 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                        }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${selectedSlot === s ? 'text-[#2563EB] font-bold' : 'text-slate-700'
                          }`}
                      >
                        {s}
                      </Text>
                      {selectedSlot === s && <CheckCircle2 size={16} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleConfirmLabBooking}
                  disabled={isSubmittingBooking}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center shadow-md shadow-blue-500/20"
                >
                  {isSubmittingBooking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-black">
                      Confirm Booking (Pay ₹{selectedItemForBooking?.price})
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* PRESCRIPTION UPLOAD MODAL */}
      <Modal
        visible={prescriptionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrescriptionModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[85%]">
            {prescriptionSuccessRef ? (
              <View className="py-6 items-center">
                <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-3">
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text className="text-xl font-black text-slate-900 text-center">
                  Prescription Received!
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1 px-4 leading-relaxed">
                  Our licensed diagnostic specialist is reviewing your prescription and will call
                  you on {patientPhone} within 10 minutes to verify tests and apply discounts.
                </Text>

                <View className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/80 my-4 space-y-1">
                  <Text className="text-xs text-slate-500 font-medium">Inquiry Reference</Text>
                  <Text className="text-sm font-black text-blue-600">
                    {prescriptionSuccessRef}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setPrescriptionModalVisible(false)}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center"
                >
                  <Text className="text-white text-sm font-black">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View>
                    <Text className="text-base font-black text-slate-900">
                      Upload Doctor Prescription
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Get expert assistance & platform discounts
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPrescriptionModalVisible(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Prescription Box Preview Simulation */}
                <View className="border-2 border-dashed border-blue-300 rounded-3xl p-5 my-4 items-center justify-center bg-blue-50/40">
                  <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center mb-2">
                    <FileText size={24} color="#2563EB" />
                  </View>
                  <Text className="text-xs font-black text-slate-800">
                    Prescription Ready to Submit
                  </Text>
                  <Text className="text-[11px] text-slate-500 text-center mt-0.5">
                    Tap below to send details to our on-call clinical lab team
                  </Text>
                </View>

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Patient Full Name
                </Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter name"
                />

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </Text>
                <TextInput
                  value={patientPhone}
                  onChangeText={setPatientPhone}
                  keyboardType="phone-pad"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter phone"
                />

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Notes / Specific Tests or Scans (Optional)
                </Text>
                <TextInput
                  value={prescriptionNote}
                  onChangeText={setPrescriptionNote}
                  multiline
                  numberOfLines={2}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold mb-4"
                  placeholder="e.g. Doctor advised Chest X-Ray and Fasting Blood Sugar"
                />

                <TouchableOpacity
                  onPress={handleConfirmPrescription}
                  disabled={isSubmittingPrescription}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center shadow-md shadow-blue-500/20"
                >
                  {isSubmittingPrescription ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-black">
                      Request Call & Book Tests
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
