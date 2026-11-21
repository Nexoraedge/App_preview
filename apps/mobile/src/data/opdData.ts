// apps/mobile/src/data/opdData.ts
// Decoupled categories, sort options, and slot calculation helpers for OPD screen

import type { Doctor } from '@adityam/types';
import { translateSlot } from '../utils/hindiDictionary';

export type SortOption = 'nearest' | 'topRated' | 'today' | 'savings';

export interface SpecialtyCategoryConfig {
  id: string;
  labelEn: string;
  labelHi: string;
  accentColor: string;
  iconName: string;
}

export const OPD_SPECIALTIES: SpecialtyCategoryConfig[] = [
  {
    id: 'All',
    labelEn: 'All Specialties',
    labelHi: 'सभी विशेषज्ञताएं',
    accentColor: '#3B82F6',
    iconName: 'all',
  },
  {
    id: 'Cardiology',
    labelEn: 'Cardiologist',
    labelHi: 'हृदय रोग',
    accentColor: '#E87869',
    iconName: 'heart',
  },
  {
    id: 'ENT',
    labelEn: 'Audiologist & ENT',
    labelHi: 'ऑडियोलॉजिस्ट व कान-नाक-गला',
    accentColor: '#3B82F6',
    iconName: 'audio',
  },
  {
    id: 'General Medicine',
    labelEn: 'General Physician',
    labelHi: 'जनरल फिजिशियन',
    accentColor: '#3B82F6',
    iconName: 'stethoscope',
  },
  {
    id: 'Dentistry',
    labelEn: 'Dentist',
    labelHi: 'दंत चिकित्सक',
    accentColor: '#12AFA5',
    iconName: 'tooth',
  },
  {
    id: 'Orthopedics',
    labelEn: 'Orthopedics',
    labelHi: 'हड्डी व जोड़',
    accentColor: '#4F6BED',
    iconName: 'bone',
  },
  {
    id: 'Pediatrics',
    labelEn: 'Pediatrics',
    labelHi: 'शिशु रोग',
    accentColor: '#CF8A40',
    iconName: 'child',
  },
  {
    id: 'Neurology',
    labelEn: 'Neurology',
    labelHi: 'न्यूरोलॉजिस्ट',
    accentColor: '#8B70D6',
    iconName: 'brain',
  },
  {
    id: 'Dermatology',
    labelEn: 'Dermatologist',
    labelHi: 'त्वचा व बाल',
    accentColor: '#9333EA',
    iconName: 'derma',
  },
];

export interface SortOptionItem {
  id: SortOption;
  labelEn: string;
  labelHi: string;
}

export const SORT_OPTIONS: SortOptionItem[] = [
  { id: 'nearest', labelEn: 'Nearest', labelHi: 'निकटतम' },
  { id: 'topRated', labelEn: 'Top Rated', labelHi: 'टॉप रेटेड' },
  { id: 'today', labelEn: 'Available Today', labelHi: 'आज उपलब्ध' },
  { id: 'savings', labelEn: 'Highest Savings', labelHi: 'अधिकतम बचत' },
];

/**
 * Calculates 1-hour consultation window slots (each window supports 5-8 patients).
 */
export function calculateDoctorSlots(doc: Doctor, isHi: boolean): string[] {
  const s1 = doc.next_available_slot || 'Today, 10:00 AM - 11:00 AM';
  const s2 = 'Today, 05:00 PM - 06:00 PM';
  const s3 = 'Tomorrow, 10:00 AM - 11:00 AM';

  return [
    translateSlot(s1, isHi),
    translateSlot(s2, isHi),
    translateSlot(s3, isHi),
  ];
}
