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
  {
    id: 'p1',
    name: 'Saket Care Pharmacy',
    nameHi: 'साकेत केयर फार्मेसी',
    area: 'Saket, South Delhi',
    areaHi: 'साकेत, दक्षिण दिल्ली',
    lat: 28.5275,
    lng: 77.2189,
    sampleKm: 0.8,
    rating: 4.7,
    reviews: 310,
    delivery: true,
    pickup: true,
    appDiscountPct: 15,
  },
  {
    id: 'p2',
    name: 'Malviya Nagar Medicos',
    nameHi: 'मालवीय नगर मेडिकोज',
    area: 'Malviya Nagar, New Delhi',
    areaHi: 'मालवीय नगर, नई दिल्ली',
    lat: 28.5355,
    lng: 77.21,
    sampleKm: 1.9,
    rating: 4.5,
    reviews: 190,
    delivery: true,
    pickup: true,
    appDiscountPct: 12,
  },
  {
    id: 'p3',
    name: 'LifeLine Chemist & Druggist',
    nameHi: 'लाइफलाइन केमिस्ट',
    area: 'Hauz Khas, New Delhi',
    areaHi: 'हौज खास, नई दिल्ली',
    lat: 28.5494,
    lng: 77.2001,
    sampleKm: 3.4,
    rating: 4.6,
    reviews: 260,
    delivery: false,
    pickup: true,
    appDiscountPct: 18,
  },
  {
    id: 'p4',
    name: 'Green Park Dawakhana',
    nameHi: 'ग्रीन पार्क दवाखाना',
    area: 'Green Park, New Delhi',
    areaHi: 'ग्रीन पार्क, नई दिल्ली',
    lat: 28.5589,
    lng: 77.2065,
    sampleKm: 4.7,
    rating: 4.4,
    reviews: 140,
    delivery: true,
    pickup: false,
    appDiscountPct: 10,
  },
  {
    id: 'p5',
    name: 'Nehru Place Medico Hub',
    nameHi: 'नेहरू प्लेस मेडिको हब',
    area: 'Nehru Place, South Delhi',
    areaHi: 'नेहरू प्लेस, दक्षिण दिल्ली',
    lat: 28.5491,
    lng: 77.253,
    sampleKm: 6.2,
    rating: 4.8,
    reviews: 420,
    delivery: true,
    pickup: true,
    appDiscountPct: 14,
  },
];

export const SAMPLE_AREA = 'South Delhi NCR';

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
