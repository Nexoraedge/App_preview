// apps/mobile/components/ui/JaiJinendraBlessingModal.tsx
// Opening sacred blessing modal featuring Pujya Muni 108 Shri Aditya Sagar Ji Maharaj
// Engineered for flawless responsiveness across ultra-compact phones (<=360px),
// standard smartphones (iPhone SE, 12, 13, 14, 15, 16, Galaxy, Pixel), tablets, and web.
// Ultra-fast instant asset decode, zero sparkles, and prestigious spiritual healthcare design.

import React from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, HeartHandshake, ShieldCheck, Stethoscope } from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';

const muniBlessingImg = require('../../assets/muni_aditya_blessing_aura.jpg');

// Preload and cache immediately upon module evaluation for zero-lag instant rendering
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const asset = Image.resolveAssetSource(muniBlessingImg);
    if (asset?.uri) {
      const preloadImg = new (window as any).Image();
      preloadImg.src = asset.uri;
      if (typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = asset.uri;
        document.head.appendChild(link);
      }
    }
  } catch {}
} else {
  try {
    const asset = Image.resolveAssetSource(muniBlessingImg);
    if (asset?.uri) {
      Image.prefetch(asset.uri).catch(() => {});
    }
  } catch {}
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function JaiJinendraBlessingModal({ visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const { language } = useLanguage() as any;
  const isHi = language === 'hi';

  // Responsive device heuristics (both width and height aware)
  const isSmallWidth = width < 370;
  const isShortHeight = height < 740;
  const isVeryShortHeight = height < 670;
  const isCompact = isSmallWidth || isShortHeight;
  const isTabletOrWeb = width >= 600;

  // Responsive sizing calculations
  const modalWidth = isTabletOrWeb ? 420 : Math.min(width - 24, 384);
  const modalMaxHeight = isVeryShortHeight
    ? height - 24
    : isShortHeight
    ? height - 36
    : Math.min(height - 48, 620);

  // Tuned harmonious portrait diameter (ensures zero vertical cutoffs on small screens)
  const imgSize = isVeryShortHeight ? 80 : isCompact ? 90 : isTabletOrWeb ? 116 : 102;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Card Container */}
        <View
          style={[
            styles.cardContainer,
            {
              width: modalWidth,
              maxHeight: modalMaxHeight,
            },
          ]}
        >
          {/* Top Sacred Golden Header Banner */}
          <LinearGradient
            colors={['#040816', '#0B1B44', '#061028']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerGradient,
              {
                paddingTop: isCompact ? 12 : 16,
                paddingBottom: isCompact ? 10 : 14,
                paddingHorizontal: 14,
              },
            ]}
          >
            {/* Ambient Gold Halo Glow */}
            <View
              pointerEvents="none"
              style={[
                styles.ambientGlow,
                { left: modalWidth / 2 - 80, top: -35 },
              ]}
            />

            {/* Top Close Button */}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[
                styles.closeBtn,
                {
                  top: isCompact ? 10 : 12,
                  right: isCompact ? 10 : 12,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  borderRadius: isCompact ? 14 : 16,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={isCompact ? 15 : 17} color="#F1F5F9" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Sacred Mantra Capsule Badge (Clean, dignified, zero sparkles) */}
            <View
              style={[
                styles.mantraBadge,
                {
                  paddingHorizontal: isCompact ? 12 : 14,
                  paddingVertical: isCompact ? 3 : 4,
                  marginBottom: isCompact ? 7 : 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.mantraText,
                  {
                    fontSize: isCompact ? 11 : 12,
                    letterSpacing: isCompact ? 0.9 : 1.1,
                  },
                ]}
              >
                {isHi ? '।। ॐ अर्हम् • जय जिनेन्द्र ।।' : 'OM ARHAM • JAI JINENDRA'}
              </Text>
            </View>

            {/* Divine Image Container with Concentric Golden Radiance Frames */}
            <View
              style={[
                styles.outerHaloFrame,
                {
                  borderRadius: (imgSize + 12) / 2,
                  padding: 3,
                },
              ]}
            >
              <View
                style={[
                  styles.imgFrame,
                  {
                    width: imgSize,
                    height: imgSize,
                    borderRadius: imgSize / 2,
                  },
                ]}
              >
                <Image
                  source={muniBlessingImg}
                  style={{ width: '100%', height: '100%', borderRadius: imgSize / 2 }}
                  resizeMode="cover"
                  fadeDuration={0}
                />
              </View>
            </View>

            {/* Title & Honorific */}
            <Text
              style={[
                styles.muniTitle,
                {
                  fontSize: isCompact ? 14 : 16,
                  lineHeight: isCompact ? 18 : 21,
                  marginTop: isCompact ? 6 : 8,
                },
              ]}
            >
              {isHi
                ? 'परम पूज्य मुनि 108 श्री आदित्य सागर जी महाराज'
                : 'Pujya Muni 108 Shri Aditya Sagar Ji Maharaj'}
            </Text>
            <Text
              style={[
                styles.muniSub,
                {
                  fontSize: isCompact ? 10.5 : 11.5,
                  marginTop: 2,
                },
              ]}
            >
              {isHi ? 'पावन प्रेरणा एवं मंगल आशीर्वाद' : 'Divine Inspiration & Sacred Blessings'}
            </Text>
          </LinearGradient>

          {/* Body Content - Scrollable flex area */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={[
              styles.bodyContent,
              {
                paddingHorizontal: isCompact ? 12 : 16,
                paddingTop: isCompact ? 10 : 12,
                paddingBottom: isCompact ? 12 : 14,
                gap: isCompact ? 8 : 10,
              },
            ]}
            style={{ flexGrow: 0, flexShrink: 1 }}
          >
            {/* Origin & Initiative Card */}
            <View
              style={[
                styles.initiativeCard,
                {
                  padding: isCompact ? 9 : 12,
                  borderRadius: isCompact ? 14 : 16,
                },
              ]}
            >
              <View
                style={[
                  styles.anukampaBadge,
                  {
                    paddingHorizontal: isCompact ? 10 : 12,
                    paddingVertical: isCompact ? 2.5 : 3.5,
                    marginBottom: isCompact ? 5 : 7,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.anukampaBadgeText,
                    {
                      fontSize: isCompact ? 10 : 11,
                    },
                  ]}
                >
                  {isHi ? 'आदित्यम् अनुकम्पा' : 'AADITYAM ANUKAMPA'}
                </Text>
              </View>

              <Text
                style={[
                  styles.bodyText,
                  {
                    fontSize: isCompact ? 11.5 : 12.5,
                    lineHeight: isCompact ? 16 : 18,
                  },
                ]}
              >
                {isHi
                  ? 'यह स्वास्थ्य सेवा पहल पूज्य मुनिश्री के पावन आशीर्वाद व प्रेरणा से तथा श्री अभिषेक जैन के विज़न द्वारा समाज एवं संपूर्ण जनमानस के स्वास्थ्य, सेवा एवं करुणा (अनुकम्पा) हेतु समर्पित है।'
                  : 'Inspired by the divine blessings of Pujya Muni 108 Shri Aditya Sagar Ji Maharaj & shaped by the vision of Abhishek Jain — dedicated to compassionate, dignified and accessible healthcare for all.'}
              </Text>
            </View>

            {/* 3 Sacred Pillars */}
            <View style={[styles.pillarsContainer, { gap: isCompact ? 6 : 8 }]}>
              <View
                style={[
                  styles.pillarItem,
                  {
                    paddingVertical: isCompact ? 6 : 8,
                    borderRadius: isCompact ? 12 : 14,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pillarIconCircle,
                    {
                      backgroundColor: '#FEF3C7',
                      width: isCompact ? 26 : 30,
                      height: isCompact ? 26 : 30,
                      borderRadius: isCompact ? 13 : 15,
                      marginBottom: isCompact ? 3 : 4,
                    },
                  ]}
                >
                  <HeartHandshake size={isCompact ? 13 : 15} color="#D97706" />
                </View>
                <Text style={[styles.pillarLabel, { fontSize: isCompact ? 10.5 : 11.5 }]}>
                  {isHi ? 'अनुकम्पा' : 'Compassion'}
                </Text>
                <Text style={[styles.pillarSub, { fontSize: isCompact ? 9 : 9.5 }]}>
                  {isHi ? 'करुणा भाव' : 'Selfless Care'}
                </Text>
              </View>

              <View
                style={[
                  styles.pillarItem,
                  {
                    paddingVertical: isCompact ? 6 : 8,
                    borderRadius: isCompact ? 12 : 14,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pillarIconCircle,
                    {
                      backgroundColor: '#EFF6FF',
                      width: isCompact ? 26 : 30,
                      height: isCompact ? 26 : 30,
                      borderRadius: isCompact ? 13 : 15,
                      marginBottom: isCompact ? 3 : 4,
                    },
                  ]}
                >
                  <Stethoscope size={isCompact ? 13 : 15} color="#2563EB" />
                </View>
                <Text style={[styles.pillarLabel, { fontSize: isCompact ? 10.5 : 11.5 }]}>
                  {isHi ? 'निःस्वार्थ सेवा' : 'Service'}
                </Text>
                <Text style={[styles.pillarSub, { fontSize: isCompact ? 9 : 9.5 }]}>
                  {isHi ? 'सुलभ चिकित्सा' : 'Dedicated'}
                </Text>
              </View>

              <View
                style={[
                  styles.pillarItem,
                  {
                    paddingVertical: isCompact ? 6 : 8,
                    borderRadius: isCompact ? 12 : 14,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pillarIconCircle,
                    {
                      backgroundColor: '#ECFDF5',
                      width: isCompact ? 26 : 30,
                      height: isCompact ? 26 : 30,
                      borderRadius: isCompact ? 13 : 15,
                      marginBottom: isCompact ? 3 : 4,
                    },
                  ]}
                >
                  <ShieldCheck size={isCompact ? 13 : 15} color="#059669" />
                </View>
                <Text style={[styles.pillarLabel, { fontSize: isCompact ? 10.5 : 11.5 }]}>
                  {isHi ? 'मर्यादा' : 'Dignity'}
                </Text>
                <Text style={[styles.pillarSub, { fontSize: isCompact ? 9 : 9.5 }]}>
                  {isHi ? 'विश्वसनीयता' : 'Fair Care'}
                </Text>
              </View>
            </View>

            {/* Blessing Quote */}
            <View
              style={[
                styles.quoteBox,
                {
                  paddingVertical: isCompact ? 6 : 8,
                  paddingHorizontal: 10,
                  borderRadius: isCompact ? 10 : 12,
                },
              ]}
            >
              <Text
                style={[
                  styles.quoteText,
                  {
                    fontSize: isCompact ? 10.5 : 11.5,
                  },
                ]}
              >
                {isHi
                  ? '“सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः”'
                  : '“Healthcare with Compassion, Dignity & Fearless Healing”'}
              </Text>
            </View>
          </ScrollView>

          {/* Action Button (No sparkles, ultra-clean premium CTA) */}
          <View
            style={[
              styles.footerContainer,
              {
                paddingHorizontal: isCompact ? 12 : 16,
                paddingTop: isCompact ? 6 : 8,
                paddingBottom: isCompact ? 10 : 14,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.88}
              style={[
                styles.ctaButton,
                {
                  borderRadius: isCompact ? 13 : 15,
                },
              ]}
            >
              <LinearGradient
                colors={['#1E3A8A', '#1D4ED8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.ctaGradient,
                  {
                    paddingVertical: isCompact ? 11 : 13,
                    paddingHorizontal: 16,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ctaText,
                    {
                      fontSize: isCompact ? 13 : 14,
                    },
                  ]}
                >
                  {isHi ? 'मंगल आशीर्वाद ग्रहण करें' : 'Accept Sacred Blessings & Continue'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 26, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(245, 158, 11, 0.38)',
    display: 'flex',
    flexDirection: 'column',
  },
  headerGradient: {
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  ambientGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  closeBtn: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mantraBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.38)',
    borderRadius: 999,
  },
  mantraText: {
    color: '#FDE68A',
    fontWeight: '800',
  },
  outerHaloFrame: {
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.42)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  imgFrame: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    overflow: 'hidden',
    backgroundColor: '#071028',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  muniTitle: {
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
    paddingHorizontal: 6,
  },
  muniSub: {
    fontWeight: '600',
    color: '#FBBF24',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bodyContent: {
    flexGrow: 0,
  },
  initiativeCard: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#F3E8D2',
    alignItems: 'center',
  },
  anukampaBadge: {
    backgroundColor: '#1E3A8A',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 999,
  },
  anukampaBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  bodyText: {
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
  },
  pillarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillarItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 2,
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillarIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarLabel: {
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  pillarSub: {
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  quoteBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  quoteText: {
    color: '#1E293B',
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerContainer: {
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  ctaButton: {
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
