// components/brand/LogoMark.tsx
// Real logo glyph using Adityam Niramayaa brand asset logo-an.png
import React from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

export function LogoMark({
  size = 56,
  source,
  widthMultiplier = 1.35,
}: {
  size?: number;
  color?: string;
  source?: ImageSourcePropType;
  widthMultiplier?: number;
}) {
  const resolvedSource = source || require('../../assets/logo-new.png');
  return (
    <Image
      source={resolvedSource}
      style={{ width: size * widthMultiplier, height: size }}
      resizeMode="contain"
    />
  );
}
