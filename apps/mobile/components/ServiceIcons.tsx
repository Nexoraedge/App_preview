import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

// 1. Stethoscope Icon (OPD) - Premium Dual-Tone
export const OpdStethoscopeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = '#087F8C',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Binaural headset tubes connected to Y-junction */}
    <Path
      d="M9 5V10C9 13.8 12.2 16.5 16 16.5C19.8 16.5 23 13.8 23 10V5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 9C9 13 12 15.8 16 15.8C20 15.8 23 13 23 9V5H9V9Z"
      fill={color}
      fillOpacity="0.12"
    />
    {/* Eartips */}
    <Circle cx="9" cy="5" r="1.8" fill={color} />
    <Circle cx="23" cy="5" r="1.8" fill={color} />
    {/* Flexible Stem Tube flowing down and looping up */}
    <Path
      d="M16 16.5V21C16 24 18 26.5 21 26.5C23.5 26.5 25.5 24.5 25.5 22V19.5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Chestpiece / Diaphragm Head with Dual-Tone Glow */}
    <Circle cx="25.5" cy="16.5" r="4.5" fill={color} fillOpacity="0.2" />
    <Circle cx="25.5" cy="16.5" r="3.2" stroke={color} strokeWidth="2.2" fill="#FFFFFF" />
    <Circle cx="25.5" cy="16.5" r="1.3" fill={color} />
  </Svg>
);

// 2. Beaker / Flask Icon (Investigations) - Premium Dual-Tone
export const InvestigationsFlaskIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = '#4F6BED',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Flask Neck & Body */}
    <Path
      d="M13 5H19M14 5V12L8 23C7.2 24.5 8.3 26.5 10 26.5H22C23.7 26.5 24.8 24.5 24 23L18 12V5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Colored Liquid Fill in Base */}
    <Path
      d="M9.5 21L8 23C7.2 24.5 8.3 26.5 10 26.5H22C23.7 26.5 24.8 24.5 24 23L22.5 21C20.5 22 18 20 16 21C14 22 11.5 20 9.5 21Z"
      fill={color}
      fillOpacity="0.25"
    />
    {/* Liquid Surface Wave & Bubbles */}
    <Path d="M9.5 21C11.5 20 14 22 16 21C18 20 20.5 22 22.5 21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="16" cy="24" r="1.5" fill={color} />
    <Circle cx="13" cy="23" r="1" fill={color} />
  </Svg>
);

// 3. Capsule / Pill Icon (Pharmacy) - Premium Dual-Tone
export const PharmacyCapsuleIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = '#8B70D6',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Diagonal Rounded Capsule */}
    <Rect
      x="7"
      y="18"
      width="20"
      height="10"
      rx="5"
      transform="rotate(-45 7 18)"
      stroke={color}
      strokeWidth="2.2"
    />
    {/* Bottom half colored fill */}
    <Path
      d="M12.5 13.5L19.5 20.5L17.5 22.5C15.5 24.5 12.5 24.5 10.5 22.5L9.5 21.5C7.5 19.5 7.5 16.5 9.5 14.5L12.5 13.5Z"
      fill={color}
      fillOpacity="0.28"
    />
    {/* Dividing line */}
    <Line x1="12" y1="13" x2="19" y2="20" stroke={color} strokeWidth="2.2" />
  </Svg>
);

// 4. Hospital Bed Icon (IPD) - Premium Dual-Tone
export const IpdHospitalBedIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = '#E87869',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Bed Headboard & Footboard */}
    <Path d="M5 10V24" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M27 14V24" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    {/* Mattress Frame with Soft Fill */}
    <Rect x="5" y="17" width="22" height="4" rx="2" fill={color} fillOpacity="0.22" />
    <Path d="M5 18H27" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    {/* Pillow with clean shape */}
    <Rect x="8" y="13" width="6" height="5" rx="2" fill="#FFFFFF" stroke={color} strokeWidth="1.8" />
    {/* Medical Cross on Bed */}
    <Path d="M20 12V16M18 14H22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// 5. Heart & Pulse Icon (Cardiology) - Premium Dual-Tone
export const HeartPulseIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#E87869',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Heart with soft translucent fill */}
    <Path
      d="M16 26.5S6 19 6 12C6 8.5 8.7 6 12 6C13.8 6 15.2 7 16 8C16.8 7 18.2 6 20 6C23.3 6 26 8.5 26 12C26 19 16 26.5 16 26.5Z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity="0.18"
    />
    {/* Crisp ECG Pulse Line */}
    <Path
      d="M9 14H12L14 10L17.5 18L20 13L21.5 15H23"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 6. Child Care Icon (Pediatrics) - Premium Dual-Tone
export const ChildCareIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#CF8A40',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="14" r="7.5" stroke={color} strokeWidth="2.2" fill={color} fillOpacity="0.15" />
    <Circle cx="13" cy="13" r="1.3" fill={color} />
    <Circle cx="19" cy="13" r="1.3" fill={color} />
    <Path
      d="M13.5 17C14.2 18 17.8 18 18.5 17"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <Path
      d="M16 6.5C14.5 4.5 12 5.5 12 5.5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <Path
      d="M10 26C10 23 12.5 21 16 21C19.5 21 22 23 22 26"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </Svg>
);

// 7. Bone & Joint Icon (Orthopedics) - Clean Medical Bone
export const BoneJointIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#4F6BED',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Clean medical bone with soft fill */}
    <Path
      d="M9 7C7.5 7 6.5 8.2 6.5 9.7C6.5 10.5 6.8 11.2 7.3 11.7C6.8 12.2 6.5 12.9 6.5 13.7C6.5 15.2 7.5 16.4 9 16.4C9.8 16.4 10.5 16 11 15.4L20.6 25C21.1 25.6 21.8 26 22.6 26C24.1 26 25.1 24.8 25.1 23.3C25.1 22.5 24.8 21.8 24.3 21.3C24.8 20.8 25.1 20.1 25.1 19.3C25.1 17.8 24.1 16.6 22.6 16.6C21.8 16.6 21.1 17 20.6 17.6L11 8C10.5 7.4 9.8 7 9 7Z"
      stroke={color}
      strokeWidth="2"
      fill={color}
      fillOpacity="0.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 8. Dental Tooth Icon (Dentistry)
export const DentalToothIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#12AFA5',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path
      d="M10 6C7.5 6 6 8.5 6 12C6 16.5 8 20.5 9.5 26C10 27.2 11.2 27.2 11.8 26C12.8 23 13.8 19 16 19C18.2 19 19.2 23 20.2 26C20.8 27.2 22 27.2 22.5 26C24 20.5 26 16.5 26 12C26 8.5 24.5 6 22 6C19.5 6 18.5 7.8 16 7.8C13.5 7.8 12.5 6 10 6Z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 9. Dermatology / Glow Icon (Skin & Hair)
export const DermatologyIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#8B70D6',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path
      d="M16 4L18.8 12.2L27 15L18.8 17.8L16 26L13.2 17.8L5 15L13.2 12.2L16 4Z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <Circle cx="24" cy="7" r="1.8" fill={color} />
    <Circle cx="8" cy="23" r="1.5" fill={color} />
  </Svg>
);

// 10. Audiologist / Ear Icon (Audiology & ENT)
export const AudiologistIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#4F6BED',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Outer ear contour */}
    <Path
      d="M13 7C9.5 7 7 9.8 7 13.5C7 18 10 21 12 23.5C13.5 25.4 14.5 27 16 27C17.5 27 19 25.5 19 23.5C19 20 16.5 18 15 17C13 15.7 12 14.2 12 13C12 11.5 13 10.5 14.5 10.5C16.2 10.5 17 11.8 17 13.5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Sound waves emitting on right */}
    <Path
      d="M21 10C22.8 11.5 24 13.8 24 16.5C24 19.2 22.8 21.5 21 23"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M24.5 7.5C27 9.8 28.5 13 28.5 16.5C28.5 20 27 23.2 24.5 25.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// 11. Neurology & Psychiatry Icon (Brain / Neural Synapses)
export const NeurologyBrainIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#4F6BED',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Head profile silhouette */}
    <Path
      d="M8 26V23C8 20 10 18.5 11 17C11.5 16.2 11.5 15.5 11 14.5C10.5 13.5 10.5 12 11.5 10.5C13 8 16 7 19 7C22 7 24.5 8.5 25 11"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M8 26H16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Neural nodes and synapse connections in mind */}
    <Circle cx="20" cy="14" r="2.2" stroke={color} strokeWidth="1.8" />
    <Circle cx="16" cy="17" r="1.8" stroke={color} strokeWidth="1.8" />
    <Circle cx="23" cy="18" r="1.8" stroke={color} strokeWidth="1.8" />
    <Circle cx="19" cy="21" r="1.8" stroke={color} strokeWidth="1.8" />
    <Line x1="18.2" y1="15.2" x2="16.8" y2="16.2" stroke={color} strokeWidth="1.5" />
    <Line x1="21.5" y1="15.5" x2="22.2" y2="16.8" stroke={color} strokeWidth="1.5" />
    <Line x1="17.5" y1="18" x2="18.5" y2="19.8" stroke={color} strokeWidth="1.5" />
    <Line x1="21.5" y1="20" x2="20.2" y2="20.5" stroke={color} strokeWidth="1.5" />
  </Svg>
);

// 12. All Categories / Clinical Grid Icon
export const AllCategoriesIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#087F8C',
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Rect x="6" y="6" width="8" height="8" rx="2.5" stroke={color} strokeWidth="2.2" fill={color} fillOpacity="0.2" />
    <Rect x="18" y="6" width="8" height="8" rx="2.5" stroke={color} strokeWidth="2.2" />
    <Rect x="6" y="18" width="8" height="8" rx="2.5" stroke={color} strokeWidth="2.2" />
    <Rect x="18" y="18" width="8" height="8" rx="2.5" stroke={color} strokeWidth="2.2" fill={color} fillOpacity="0.2" />
  </Svg>
);


