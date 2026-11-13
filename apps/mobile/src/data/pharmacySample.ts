// src/data/pharmacySample.ts
// Sample data for partner pharmacies and simulated billing with full bilingual (English & Hindi) support.

export interface Pharmacy {
  id: string;
  name: string;
  nameHi: string;
  area: string;
  areaHi: string;
  lat: number;
  lng: number;
  sampleKm: number; // used when user is not in sample coordinates
  rating: number;
  reviews: number;
  delivery: boolean;
  pickup: boolean;
  appDiscountPct: number;
}

export const PHARMACIES: Pharmacy[] = [
  // --- JAIPUR PARTNER PHARMACIES ---
  {
    id: 'jp1',
    name: 'Surajpole Jan Aushadhi & Medicos',
    nameHi: 'सूरजपोल जन औषधि व मेडिकोज',
    area: 'Surajpole Gate, Mohanbari, Jaipur',
    areaHi: 'सूरजपोल गेट, मोहनबाड़ी, जयपुर',
    lat: 26.9208,
    lng: 75.8445,
    sampleKm: 0.4,
    rating: 4.9,
    reviews: 380,
    delivery: true,
    pickup: true,
    appDiscountPct: 18,
  },
  {
    id: 'jp2',
    name: 'Pink City Care Chemist',
    nameHi: 'पिंक सिटी केयर केमिस्ट',
    area: 'Ramganj Bazar, Pink City, Jaipur',
    areaHi: 'रामगंज बाजार, चारदीवारी, जयपुर',
    lat: 26.9242,
    lng: 75.8315,
    sampleKm: 1.4,
    rating: 4.8,
    reviews: 290,
    delivery: true,
    pickup: true,
    appDiscountPct: 15,
  },
  {
    id: 'jp3',
    name: 'SMS Lifeline Pharmacy',
    nameHi: 'एसएमएस लाइफलाइन फार्मेसी',
    area: 'JLN Marg, Opp. SMS Hospital, Jaipur',
    areaHi: 'जेएलएन मार्ग, एसएमएस अस्पताल के सामने, जयपुर',
    lat: 26.9015,
    lng: 75.8160,
    sampleKm: 2.8,
    rating: 4.9,
    reviews: 540,
    delivery: true,
    pickup: true,
    appDiscountPct: 20,
  },
  {
    id: 'jp4',
    name: 'Apollo Pharmacy & Health Mart',
    nameHi: 'अपोलो फार्मेसी एंड हेल्थ मार्ट',
    area: 'M.I. Road, Panch Batti, Jaipur',
    areaHi: 'एम.आई. रोड, पांच बत्ती, जयपुर',
    lat: 26.9180,
    lng: 75.8130,
    sampleKm: 3.2,
    rating: 4.7,
    reviews: 210,
    delivery: true,
    pickup: true,
    appDiscountPct: 14,
  },
  {
    id: 'jp5',
    name: 'Raja Park Day & Night Medicos',
    nameHi: 'राजा पार्क 24x7 मेडिकोज',
    area: 'Dhruv Marg, Raja Park, Jaipur',
    areaHi: 'ध्रुव मार्ग, राजा पार्क, जयपुर',
    lat: 26.8967,
    lng: 75.8275,
    sampleKm: 3.6,
    rating: 4.8,
    reviews: 190,
    delivery: true,
    pickup: true,
    appDiscountPct: 15,
  },
  {
    id: 'jp6',
    name: 'Malviya Nagar Medicos Jaipur',
    nameHi: 'मालवीय नगर मेडिकोज जयपुर',
    area: 'Gaurav Tower Road, Malviya Nagar, Jaipur',
    areaHi: 'गौरव टॉवर रोड, मालवीय नगर, जयपुर',
    lat: 26.8532,
    lng: 75.8175,
    sampleKm: 7.8,
    rating: 4.8,
    reviews: 310,
    delivery: true,
    pickup: true,
    appDiscountPct: 16,
  },
  {
    id: 'jp7',
    name: 'Mansarovar Medico Hub',
    nameHi: 'मानसरोवर मेडिको हब',
    area: 'Madhyam Marg, Mansarovar, Jaipur',
    areaHi: 'मध्यम मार्ग, मानसरोवर, जयपुर',
    lat: 26.8580,
    lng: 75.7645,
    sampleKm: 8.9,
    rating: 4.6,
    reviews: 160,
    delivery: true,
    pickup: true,
    appDiscountPct: 12,
  },
  {
    id: 'jp8',
    name: 'Vaishali Chemist & Druggists',
    nameHi: 'वैशाली केमिस्ट एंड ड्रगिस्ट्स',
    area: 'Amrapali Circle, Vaishali Nagar, Jaipur',
    areaHi: 'आम्रपाली सर्कल, वैशाली नगर, जयपुर',
    lat: 26.9044,
    lng: 75.7438,
    sampleKm: 9.8,
    rating: 4.7,
    reviews: 240,
    delivery: true,
    pickup: true,
    appDiscountPct: 15,
  },

  // Delhi NCR pharmacies removed for Jaipur launch. Live data fetched from Supabase.
];

export const SAMPLE_AREA = 'Surajpole Gate, Jaipur';

export const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// Simulated itemized bill lines with English and Hindi labels
export interface BillLine {
  id: string;
  name: string;
  nameHi: string;
  qty: number;
  price: number;
}

export const SAMPLE_BILL: BillLine[] = [
  {
    id: 'm1',
    name: 'Paracetamol 500 mg (10 tablets)',
    nameHi: 'पैरासिटामोल 500 मि.ग्रा. (10 गोलियां)',
    qty: 2,
    price: 30,
  },
  {
    id: 'm2',
    name: 'Azithromycin 500 mg (3 tablets)',
    nameHi: 'एज़िथ्रोमाइसिन 500 मि.ग्रा. (3 गोलियां)',
    qty: 1,
    price: 120,
  },
  {
    id: 'm3',
    name: 'Cetirizine 10 mg (10 tablets)',
    nameHi: 'सिट्रीज़िन 10 मि.ग्रा. (10 गोलियां)',
    qty: 1,
    price: 40,
  },
  {
    id: 'm4',
    name: 'Vitamin D3 60000 IU (4 capsules)',
    nameHi: 'विटामिन D3 60000 IU (4 कैप्सूल)',
    qty: 1,
    price: 140,
  },
];

export type RequestStatus = 'sent' | 'reviewing' | 'quoted' | 'paid' | 'ready';
export const STATUS_ORDER: RequestStatus[] = ['sent', 'reviewing', 'quoted', 'paid', 'ready'];

// Helper functions for localized display
export function getPharmacyName(p: Pharmacy | null | undefined, isHi: boolean): string {
  if (!p) return '';
  return isHi && p.nameHi ? p.nameHi : p.name;
}

export function getPharmacyArea(p: Pharmacy | null | undefined, isHi: boolean): string {
  if (!p) return '';
  return isHi && p.areaHi ? p.areaHi : p.area;
}

export function getBillItemName(b: BillLine, isHi: boolean): string {
  return isHi && b.nameHi ? b.nameHi : b.name;
}
