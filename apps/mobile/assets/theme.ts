// src/theme.ts
// One place for colours, radius, shadow and the rupee formatter.
// Every screen (Home, OPD, Labs, Pharmacy, IPD) should import from here.

export const C = {
  bg: '#F6F8FC',
  card: '#FFFFFF',
  ink: '#0B1220',
  sub: '#5B6B82',
  mute: '#94A3B8',
  line: '#E6EBF2',
  brand: '#1D4ED8',
  brandDark: '#172554',
  brandSoft: '#EAF1FF',
  good: '#047857',
  goodSoft: '#E7F8F0',
  warn: '#B45309',
  warnSoft: '#FFF4E0',
  danger: '#BE123C',
  dangerSoft: '#FFE9EE',
};

export const R = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 };

export const SHADOW = {
  shadowColor: '#0B1B3F',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

// Indian digit grouping (₹1,10,000) without relying on Intl,
// which is unreliable on some Android builds.
export const inr = (n: number): string => {
  const s = Math.round(n).toString();
  if (s.length <= 3) return '₹' + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '₹' + rest + ',' + last3;
};
