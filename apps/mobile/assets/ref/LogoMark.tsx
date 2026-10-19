// components/brand/LogoMark.tsx
// PLACEHOLDER logo glyph. When you have the approved logo file, pass it as `source`:
//   <LogoMark source={require('../../assets/logo.png')} />
import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import { HeartPulse } from 'lucide-react-native';

export function LogoMark({
  size = 56,
  color = '#FFFFFF',
  source,
}: {
  size?: number;
  color?: string;
  source?: ImageSourcePropType;
}) {
  if (source) return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />;
  return <HeartPulse size={size} color={color} strokeWidth={1.8} />;
}
