import {
  Droplets,
  Activity,
  HeartPulse,
  Sun,
  Waves,
  Flower2,
  Thermometer,
  FlaskConical,
  Bone,
  ScanLine,
  Brain,
} from 'lucide-react-native';

import {
  Item,
  Category,
  CATEGORIES,
} from './labsSample';

export const LAB_ICONS: Record<string, any> = {
  Droplets,
  Activity,
  HeartPulse,
  Sun,
  Waves,
  Flower2,
  Thermometer,
  FlaskConical,
  Bone,
  ScanLine,
  Brain,
};

export type TabSegment = 'all' | 'lab' | 'scan' | 'package';

export const getSegments = (
  isHi: boolean
): { id: TabSegment; label: string }[] => [
  { id: 'all', label: isHi ? 'सभी' : 'All' },
  { id: 'lab', label: isHi ? 'लैब टेस्ट' : 'Lab tests' },
  { id: 'scan', label: isHi ? 'स्कैन' : 'Scans' },
  { id: 'package', label: isHi ? 'पैकेज' : 'Packages' },
];

export const reportText = (i: Item, isHi: boolean): string => {
  if (isHi) {
    return i.reportHrs < 24
      ? `${i.reportHrs} घंटे में रिपोर्ट`
      : `${Math.round(i.reportHrs / 24)} दिन में रिपोर्ट`;
  }
  return i.reportHrs < 24
    ? `Report in ${i.reportHrs} hrs`
    : `Report in ${Math.round(i.reportHrs / 24)} day`;
};

export const fastText = (i: Item, isHi: boolean): string => {
  if (isHi) {
    return i.fastingHrs ? `${i.fastingHrs} घंटे खाली पेट` : 'खाली पेट जरूरी नहीं';
  }
  return i.fastingHrs ? `Fasting ${i.fastingHrs} hrs` : 'No fasting';
};

export const findCategory = (i: Item): Category | undefined =>
  i.segment === 'package'
    ? undefined
    : (CATEGORIES as any)[i.segment]?.find((c: Category) => c.id === i.category);

