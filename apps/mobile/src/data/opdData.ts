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
 * Calculates 3 realistic, consecutive appointment time slots for a doctor.
 */
export function calculateDoctorSlots(doc: Doctor, isHi: boolean): string[] {
  let raw = doc.next_available_slot || 'Today, 6:30 PM';
  const isToday = raw.toLowerCase().includes('today');

  if (isToday) {
    if (
      raw.includes('1:') ||
      raw.includes('2:') ||
      raw.includes('3:') ||
      raw.includes('4:') ||
      raw.includes('5:') ||
      raw.includes('01:') ||
      raw.includes('02:') ||
      raw.includes('03:') ||
      raw.includes('04:') ||
      raw.includes('05:')
    ) {
      raw = 'Today, 6:30 PM';
    }
  }

  let s1 = raw;
  let s2 = 'Today, 7:45 PM';
  let s3 = 'Tomorrow, 10:30 AM';

  if (s1.toLowerCase().includes('today')) {
    if (s1.includes('6:00') || s1.includes('6:15') || s1.includes('6:30')) {
      s1 = 'Today, 6:30 PM';
      s2 = 'Today, 7:45 PM';
      s3 = 'Tomorrow, 10:30 AM';
    } else if (s1.includes('6:45') || s1.includes('7:00') || s1.includes('7:15')) {
      s1 = 'Today, 7:00 PM';
      s2 = 'Today, 8:15 PM';
      s3 = 'Tomorrow, 11:00 AM';
    } else {
      s1 = 'Today, 7:30 PM';
      s2 = 'Today, 8:30 PM';
      s3 = 'Tomorrow, 11:30 AM';
    }
  } else {
    s1 = s1 || 'Tomorrow, 10:30 AM';
    s2 = 'Tomorrow, 02:30 PM';
    s3 = 'Tomorrow, 05:30 PM';
  }

  return [
    translateSlot(s1, isHi),
    translateSlot(s2, isHi),
    translateSlot(s3, isHi),
  ];
}
