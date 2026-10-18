import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export const BrandHeartLogo: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Left curved heart lobe in deep teal */}
    <Path
      d="M23 10C17 10 12 15 12 21C12 29 23 38 24 38C24 38 24.5 37.5 25.5 36.5C21 34 18 28 18 22C18 17.5 21 14 24 14"
      fill="#087F8C"
    />
    {/* Right heart lobe in bright mint */}
    <Path
      d="M24 14C27 10 32 10 36 14C40 18 40 24 35 30C30 36 24 38 24 38C25 36 32 30 32 23C32 18 29 16 26 17"
      fill="#12AFA5"
    />
    {/* Medical Cross Center in Mint */}
    <Rect x="21" y="21" width="6" height="2" rx="1" fill="#FFFFFF" />
    <Rect x="23" y="19" width="2" height="6" rx="1" fill="#FFFFFF" />
    <Path
      d="M17 21C17 15.4772 21.4772 11 27 11C31.5 11 35 14.5 35 19C35 26 24 36 24 36C24 36 13 26 13 19C13 18 13.5 16 15 14"
      stroke="#087F8C"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect x="22" y="18" width="4" height="10" rx="1.5" fill="#36CDBB" />
    <Rect x="19" y="21" width="10" height="4" rx="1.5" fill="#36CDBB" />
  </Svg>
);
