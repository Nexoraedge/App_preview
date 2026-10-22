// apps/mobile/components/ui/JaiJinendraBlessingModal.tsx
// Opening sacred blessing modal featuring Pujya Muni 108 Shri Aditya Sagar Ji Maharaj
// Fully responsive across compact screens (<360px), standard phones, tablets, and web.
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

  const isSmallDevice = width < 370;
  const isTabletOrWeb = width >= 600;

  // Responsive sizing
  const modalWidth = isTabletOrWeb ? 430 : Math.min(width - 32, 400);
  const imgSize = isSmallDevice ? 122 : 142;

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

        {/* Modal Card */}
        <View style={[styles.cardContainer, { width: modalWidth }]}>
          {/* Top Sacred Golden Header Banner */}
          <LinearGradient
            colors={['#040816', '#0B1B44', '#061028']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Ambient Gold Halo Glow */}
            <View
              pointerEvents="none"
              style={[
                styles.ambientGlow,
                { left: modalWidth / 2 - 90, top: -30 },
              ]}
            />

            {/* Top Close Button */}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={17} color="#F1F5F9" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Sacred Mantra Capsule Badge (Clean, dignified, zero sparkles) */}
            <View style={styles.mantraBadge}>
              <Text style={styles.mantraText}>
                {isHi ? '।। ॐ अर्हम् • जय जिनेन्द्र ।।' : 'OM ARHAM • JAI JINENDRA'}
              </Text>
            </View>

            {/* Divine Image Container with Concentric Golden Radiance Frames */}
            <View
              style={[
                styles.outerHaloFrame,
                {
                  borderRadius: (imgSize + 14) / 2,
                  padding: 3.5,
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
            <Text style={[styles.muniTitle, { fontSize: isSmallDevice ? 15.5 : 17.5 }]}>
              {isHi
                ? 'परम पूज्य मुनि 108 श्री आदित्य सागर जी महाराज'
                : 'Pujya Muni 108 Shri Aditya Sagar Ji Maharaj'}
            </Text>
            <Text style={styles.muniSub}>
              {isHi ? 'पावन प्रेरणा एवं मंगल आशीर्वाद' : 'Divine Inspiration & Sacred Blessings'}
            </Text>
          </LinearGradient>

          {/* Body Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}
            style={{ maxHeight: height * 0.46 }}
          >
            {/* Origin & Initiative Card */}
            <View style={styles.initiativeCard}>
              <View style={styles.anukampaBadge}>
                <Text style={styles.anukampaBadgeText}>
                  {isHi ? 'आदित्यम् अनुकम्पा' : 'AADITYAM ANUKAMPA'}
                </Text>
              </View>

              <Text style={[styles.bodyText, { fontSize: isSmallDevice ? 12.5 : 13.5 }]}>
                {isHi
                  ? 'यह स्वास्थ्य सेवा पहल पूज्य मुनिश्री के पावन आशीर्वाद व प्रेरणा से तथा श्री अभिषेक जैन के विज़न द्वारा समाज एवं संपूर्ण जनमानस के स्वास्थ्य, सेवा एवं करुणा (अनुकम्पा) हेतु समर्पित है।'
                  : 'Inspired by the divine blessings of Pujya Muni 108 Shri Aditya Sagar Ji Maharaj & shaped by the vision of Abhishek Jain — dedicated to compassionate, dignified and accessible healthcare for all.'}
              </Text>
            </View>

            {/* 3 Sacred Pillars */}
            <View style={styles.pillarsContainer}>
              <View style={styles.pillarItem}>
                <View style={[styles.pillarIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <HeartHandshake size={16} color="#D97706" />
                </View>
                <Text style={styles.pillarLabel}>
                  {isHi ? 'अनुकम्पा' : 'Compassion'}
                </Text>
                <Text style={styles.pillarSub}>
                  {isHi ? 'करुणा भाव' : 'Selfless Care'}
                </Text>
              </View>

              <View style={styles.pillarItem}>
                <View style={[styles.pillarIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Stethoscope size={16} color="#2563EB" />
                </View>
                <Text style={styles.pillarLabel}>
                  {isHi ? 'निःस्वार्थ सेवा' : 'Service'}
                </Text>
                <Text style={styles.pillarSub}>
                  {isHi ? 'सुलभ चिकित्सा' : 'Dedicated'}
                </Text>
              </View>

              <View style={styles.pillarItem}>
                <View style={[styles.pillarIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <ShieldCheck size={16} color="#059669" />
                </View>
                <Text style={styles.pillarLabel}>
                  {isHi ? 'मर्यादा' : 'Dignity'}
                </Text>
                <Text style={styles.pillarSub}>
                  {isHi ? 'विश्वसनीयता' : 'Fair Care'}
                </Text>
              </View>
            </View>

            {/* Blessing Quote */}
            <View style={styles.quoteBox}>
              <Text style={styles.quoteText}>
                {isHi
                  ? '“सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः”'
                  : '“Healthcare with Compassion, Dignity & Fearless Healing”'}
              </Text>
            </View>
          </ScrollView>

          {/* Action Button (No sparkles, ultra-clean premium CTA) */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.88}
              style={styles.ctaButton}
            >
              <LinearGradient
                colors={['#1E3A8A', '#1D4ED8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={[styles.ctaText, { fontSize: isSmallDevice ? 13.5 : 14.5 }]}>
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
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(245, 158, 11, 0.38)',
  },
  headerGradient: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  mantraText: {
    color: '#FDE68A',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.1,
  },
  outerHaloFrame: {
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.42)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  imgFrame: {
    borderWidth: 2.2,
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
    marginTop: 12,
    letterSpacing: -0.2,
    lineHeight: 22,
    paddingHorizontal: 6,
  },
  muniSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FBBF24',
    textAlign: 'center',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
  },
  initiativeCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E8D2',
    padding: 12,
    alignItems: 'center',
  },
  anukampaBadge: {
    backgroundColor: '#1E3A8A',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  anukampaBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.9,
  },
  bodyText: {
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 19.5,
  },
  pillarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  pillarItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  pillarLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  pillarSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  quoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
