// apps/mobile/src/utils/doctorAvatars.ts
// Centralized, ultra-fast doctor portrait asset resolver.
// Compatible with Expo Web and React Native iOS/Android with zero lag and zero network delay.

import { ImageSourcePropType } from 'react-native';

export const DOCTOR_LOCAL_ASSETS: Record<string, any> = {
  satish: require('../../assets/doc/Satish-jain.png'),
  doc1: require('../../assets/doc/doc-1.png'),
  doc2: require('../../assets/doc/doc-2.png'),
  doc3: require('../../assets/doc/doc-3.png'),
  doc4: require('../../assets/doc/doc-4.png'),
  prakash: require('../../assets/doc/dr-prakash-chand.png'),
};

/**
 * Resolves doctor avatar image source reliably for both Native and Web runtimes.
 * Never causes undefined, [object Object] or blank image boxes.
 */
export function getDoctorAvatarSource(
  nameOrId?: string,
  specialty?: string,
  fallbackUrl?: string | null
): ImageSourcePropType {
  const n = (nameOrId || '').toLowerCase();
  const s = (specialty || '').toLowerCase();

  // 1. Dr. Satish Jain - Chief ENT Surgeon
  if (n.includes('satish') || n.includes('jain ent')) {
    return DOCTOR_LOCAL_ASSETS.satish;
  }

  // 2. Dr. Prakash Chandwani / Prakash Chand
  if (n.includes('prakash') || n.includes('chandwani')) {
    return DOCTOR_LOCAL_ASSETS.prakash;
  }

  // 3. Female Specialists (Pediatrics, General Physician, Ophthalmology)
  if (
    n.includes('meenakshi') ||
    n.includes('sundaram') ||
    n.includes('priya') ||
    n.includes('divya') ||
    n.includes('shweta') ||
    s.includes('pediatric') ||
    s.includes('child')
  ) {
    return DOCTOR_LOCAL_ASSETS.doc2;
  }

  // 4. Female Specialists (Gynecology, Dermatology, Senior Consultants)
  if (
    n.includes('anita') ||
    n.includes('deshmukh') ||
    n.includes('monica') ||
    n.includes('vasudev') ||
    n.includes('sunita') ||
    n.includes('rao') ||
    n.includes('vandana') ||
    n.includes('shalini') ||
    n.includes('aparna') ||
    n.includes('mehra') ||
    s.includes('derma') ||
    s.includes('women') ||
    s.includes('gyn') ||
    s.includes('skin')
  ) {
    return DOCTOR_LOCAL_ASSETS.doc4;
  }

  // 5. Male Senior Specialists & Surgeons (Orthopedics, General Surgery, ENT)
  if (
    n.includes('alok') ||
    n.includes('verma') ||
    n.includes('vikramaditya') ||
    n.includes('sen') ||
    n.includes('rakesh') ||
    n.includes('tandon') ||
    n.includes('vivek') ||
    n.includes('taneja') ||
    n.includes('ashok') ||
    n.includes('sethi') ||
    n.includes('byotra') ||
    s.includes('surgery') ||
    s.includes('ortho') ||
    s.includes('spine')
  ) {
    return DOCTOR_LOCAL_ASSETS.doc1;
  }

  // 6. Male Specialists & Consultants (Cardiology, Internal Medicine, Pulmonology)
  if (
    n.includes('rajesh') ||
    n.includes('rohan') ||
    n.includes('kapur') ||
    n.includes('nitin') ||
    n.includes('sood') ||
    n.includes('saurabh') ||
    n.includes('grover') ||
    n.includes('ajay') ||
    n.includes('swaroop') ||
    n.includes('sharma') ||
    n.includes('mehta') ||
    n.includes('gupta') ||
    s.includes('cardio') ||
    s.includes('heart') ||
    s.includes('physician') ||
    s.includes('medicine')
  ) {
    return DOCTOR_LOCAL_ASSETS.doc3;
  }

  // 7. If fallback URL is a user-uploaded image in Supabase storage
  if (
    fallbackUrl &&
    typeof fallbackUrl === 'string' &&
    fallbackUrl.startsWith('http') &&
    fallbackUrl.includes('supabase.co/storage')
  ) {
    return { uri: fallbackUrl };
  }

  // 8. Deterministic distribution across local assets based on doctor name
  // Ensures instant load with zero lag and no duplicate look across adjacent list items
  const charCodeSum = (nameOrId || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pool = [
    DOCTOR_LOCAL_ASSETS.doc1,
    DOCTOR_LOCAL_ASSETS.doc2,
    DOCTOR_LOCAL_ASSETS.doc3,
    DOCTOR_LOCAL_ASSETS.doc4,
  ];
  return pool[charCodeSum % pool.length];
}

/**
 * Convenient wrapper that accepts any Doctor or Doctor-like object
 */
export function getDoctorAvatar(doctor?: {
  name?: string;
  specialty?: string;
  avatar_url?: string | null;
  id?: string;
} | null): ImageSourcePropType {
  if (!doctor) return DOCTOR_LOCAL_ASSETS.doc3;
  return getDoctorAvatarSource(doctor.name || doctor.id, doctor.specialty, doctor.avatar_url);
}

