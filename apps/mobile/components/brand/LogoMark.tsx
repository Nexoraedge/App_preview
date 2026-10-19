// components/brand/LogoMark.tsx
// Real logo glyph using Adityam Niramayaa brand asset logo-an.png
import React from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

export function LogoMark({
  size = 56,
  source,
}: {
  size?: number;
  color?: string;
  source?: ImageSourcePropType;
}) {
  const resolvedSource = source || require('../../assets/logo-an.png');
  return (
    <Image
      source={resolvedSource}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
