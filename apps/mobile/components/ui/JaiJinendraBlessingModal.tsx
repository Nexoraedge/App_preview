// apps/mobile/components/ui/JaiJinendraBlessingModal.tsx
// Opening sacred blessing modal featuring Pujya Muni 108 Shri Aditya Sagar Ji Maharaj
// Fully responsive across compact screens (<360px), standard phones, tablets, and web.

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
import { X, Sparkles, HeartHandshake, ShieldCheck, Stethoscope } from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';

const muniBlessingImg = require('../../assets/muni_aditya_blessing_aura.jpg');

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
  const modalWidth = isTabletOrWeb ? 440 : Math.min(width - 32, 420);
  const imgSize = isSmallDevice ? 130 : 154;

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
            colors={['#0F172A', '#1E293B', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            {/* Ambient Gold Halo Glow */}
            <View
              pointerEvents="none"
              style={[
                styles.ambientGlow,
                { left: modalWidth / 2 - 75, top: -20 },
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
              <X size={18} color="#E2E8F0" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Sacred Mantra Header */}
            <View style={styles.mantraRow}>
              <Sparkles size={14} color="#FBBF24" />
              <Text style={styles.mantraText}>
                {isHi ? '।। ॐ अर्हम् • जय जिनेन्द्र ।।' : 'Om Arham • Jai Jinendra'}
              </Text>
              <Sparkles size={14} color="#FBBF24" />
            </View>

            {/* Divine Image Container with Golden Radial Frame */}
            <View style={[styles.imgFrame, { width: imgSize, height: imgSize, borderRadius: imgSize / 2 }]}>
              <Image
                source={muniBlessingImg}
                style={{ width: '100%', height: '100%', borderRadius: imgSize / 2 }}
                resizeMode="cover"
              />
            </View>

            {/* Title & Honorific */}
            <Text style={[styles.muniTitle, { fontSize: isSmallDevice ? 16 : 18 }]}>
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
            style={{ maxHeight: height * 0.45 }}
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
                  : 'Inspired by the divine blessings of Pujya Muni 108 Shri Aditya Sagar Ji Maharaj & shaped by the vision of Abhishek Jain — dedicated to compassionate, dignified and affordable healthcare for all.'}
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
                  {isHi ? 'करुणा भाव' : 'Care'}
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

          {/* Action Button */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={styles.ctaButton}
            >
              <LinearGradient
                colors={['#1E40AF', '#1D4ED8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={[styles.ctaText, { fontSize: isSmallDevice ? 13.5 : 14.5 }]}>
                  {isHi ? 'मंगल आशीर्वाद ग्रहण करें' : 'Accept Blessings & Continue'}
                </Text>
                <Sparkles size={16} color="#FDE68A" />
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
    backgroundColor: 'rgba(11, 27, 77, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
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
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mantraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  mantraText: {
    color: '#FDE68A',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  imgFrame: {
    borderWidth: 3,
    borderColor: '#F59E0B',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  muniTitle: {
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: -0.3,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  muniSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FBBF24',
    textAlign: 'center',
    marginTop: 3,
    letterSpacing: 0.4,
  },
  bodyContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
  },
  initiativeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    alignItems: 'center',
  },
  anukampaBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
  },
  anukampaBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  bodyText: {
    fontWeight: '500',
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 20,
  },
  pillarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  pillarItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerContainer: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaGradient: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
