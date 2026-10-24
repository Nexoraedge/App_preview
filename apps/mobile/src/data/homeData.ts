// apps/mobile/src/data/homeData.ts
// Decoupled static configuration and catalogs for the Adityam Niramayaa Home Screen

import { Building2, CheckCircle2, ShieldCheck, Pill } from 'lucide-react-native';
import {
  OpdStethoscopeIcon,
  InvestigationsFlaskIcon,
  PharmacyCapsuleIcon,
  IpdHospitalBedIcon,
} from '../../components/ServiceIcons';

export interface CoreServiceItem {
  id: 'opd' | 'ipd' | 'labs' | 'pharmacy';
  route: '/opd' | '/ipd' | '/labs' | '/pharmacy';
  titleEn: string;
  titleHi: string;
  subEn: string;
  subHi: string;
  badgeEn: string;
  badgeHi: string;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeFg: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}

export const CORE_SERVICES: CoreServiceItem[] = [
  {
    id: 'opd',
    route: '/opd',
    titleEn: 'Doctor Consult',
    titleHi: 'डॉक्टर परामर्श',
    subEn: 'In-Clinic Visits',
    subHi: 'क्लिनिक अपॉइंटमेंट',
    badgeEn: 'Top Clinics',
    badgeHi: 'क्लिनिक',
    bg: '#F0F7FF',
    border: '#BFDBFE',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    badgeBg: '#DBEAFE',
    badgeFg: '#1E40AF',
    Icon: OpdStethoscopeIcon,
  },
  {
    id: 'ipd',
    route: '/ipd',
    titleEn: 'Hospital Care',
    titleHi: 'अस्पताल भर्ती',
    subEn: 'Planned Treatment',
    subHi: 'नियोजित भर्ती',
    badgeEn: 'Top Hospitals',
    badgeHi: 'अस्पताल',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    iconBg: '#EDE9FE',
    iconColor: '#6D28D9',
    badgeBg: '#EDE9FE',
    badgeFg: '#6D28D9',
    Icon: IpdHospitalBedIcon,
  },
  {
    id: 'labs',
    route: '/labs',
    titleEn: 'Lab Tests',
    titleHi: 'लैब टेस्ट्स',
    subEn: 'Home Sample Pickup',
    subHi: 'घर से सैंपल कलेक्शन',
    badgeEn: 'NABL Labs',
    badgeHi: 'प्रमाणित लैब्स',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconBg: '#D1FAE5',
    iconColor: '#047857',
    badgeBg: '#D1FAE5',
    badgeFg: '#047857',
    Icon: InvestigationsFlaskIcon,
  },
  {
    id: 'pharmacy',
    route: '/pharmacy',
    titleEn: 'Medicines',
    titleHi: 'दवाइयां',
    subEn: 'Partner Pharmacies',
    subHi: 'पार्टनर फार्मेसी',
    badgeEn: 'Save in App',
    badgeHi: 'ऐप में बचत',
    bg: '#FFFBEB',
    border: '#FDE68A',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    badgeBg: '#FEF3C7',
    badgeFg: '#B45309',
    Icon: PharmacyCapsuleIcon,
  },
];

export interface TrustPillarItem {
  id: string;
  titleHi: string;
  titleEn: string;
  subHi: string;
  subEn: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

export const TRUST_PILLARS: TrustPillarItem[] = [
  {
    id: 'hospitals',
    titleHi: '150+ अस्पताल',
    titleEn: '150+ Hospitals',
    subHi: 'पार्टनर नेटवर्क',
    subEn: 'Partner Network',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    borderColor: '#BFDBFE',
    Icon: Building2,
  },
  {
    id: 'labs',
    titleHi: '100% NABL',
    titleEn: '100% NABL',
    subHi: 'प्रमाणित लैब्स',
    subEn: 'Certified Labs',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    borderColor: '#A7F3D0',
    Icon: CheckCircle2,
  },
  {
    id: 'care',
    titleHi: 'विश्वसनीय केयर',
    titleEn: 'Verified Care',
    subHi: 'स्वास्थ्य पार्टनर',
    subEn: 'Healthcare Partners',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    borderColor: '#DDD6FE',
    Icon: ShieldCheck,
  },
  {
    id: 'meds',
    titleHi: 'असली दवाइयां',
    titleEn: 'Genuine Meds',
    subHi: 'पार्टनर फार्मेसी',
    subEn: 'Partner Pharmacy',
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    borderColor: '#FDE68A',
    Icon: Pill,
  },
];

export interface SpecialtyItem {
  id: string;
  labelEn: string;
  labelHi: string;
  specialtyQuery?: string;
  color: string;
  iconName: string;
}

export const HOME_SPECIALTIES: SpecialtyItem[] = [
  { id: 'all', labelEn: 'All', labelHi: 'सभी', color: '#2563EB', iconName: 'all' },
  { id: 'cardiology', labelEn: 'Cardiologist', labelHi: 'हृदय रोग विशेषज्ञ', specialtyQuery: 'Cardiology', color: '#E87869', iconName: 'heart' },
  { id: 'general', labelEn: 'General Physician', labelHi: 'सामान्य चिकित्सक', specialtyQuery: 'General Medicine', color: '#2563EB', iconName: 'stethoscope' },
  { id: 'orthopedics', labelEn: 'Orthopedic', labelHi: 'हड्डी रोग विशेषज्ञ', specialtyQuery: 'Orthopedics', color: '#4F6BED', iconName: 'bone' },
  { id: 'pediatrics', labelEn: 'Pediatrician', labelHi: 'शिशु रोग विशेषज्ञ', specialtyQuery: 'Pediatrics', color: '#CF8A40', iconName: 'child' },
  { id: 'dermatology', labelEn: 'Dermatologist', labelHi: 'त्वचा रोग विशेषज्ञ', specialtyQuery: 'Dermatology', color: '#2563EB', iconName: 'derma' },
  { id: 'dental', labelEn: 'Dentist', labelHi: 'दंत चिकित्सक', specialtyQuery: 'Dentistry', color: '#059669', iconName: 'tooth' },
];
