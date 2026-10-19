import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  Home,
  ArrowLeft,
  Stethoscope,
  FlaskConical,
  Building2,
  Pill,
  Radio,
  Sparkles,
} from 'lucide-react-native';
import { useLanguage } from '../src/context/LanguageContext';
import { LangToggle } from '../components/launch/LangToggle';
import { ROUTES } from '../src/config/brand';

const TV_CSS = `
.retro_tv_wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 420px;
  height: 290px;
  position: relative;
  margin: 0 auto;
  font-size: 13.5px;
}

.tv_main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.text_404 {
  position: absolute;
  display: flex;
  flex-direction: row;
  column-gap: 3.2em;
  z-index: 0;
  top: 16%;
  align-items: center;
  justify-content: center;
  opacity: 0.14;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 900;
  color: #FFFFFF;
  user-select: none;
  pointer-events: none;
}
.text_4041, .text_4042, .text_4043 {
  font-size: 6.2em;
  line-height: 1;
}

.antenna {
  width: 4.8em;
  height: 4.8em;
  border-radius: 50%;
  border: 2px solid #0F172A;
  background-color: #EA580C;
  margin-bottom: -5.6em;
  z-index: 1;
  position: relative;
}
.antenna_shadow {
  position: absolute;
  background-color: transparent;
  width: 44px;
  height: 50px;
  margin-left: 1.5em;
  border-radius: 45%;
  transform: rotate(140deg);
  border: 4px solid transparent;
  box-shadow: inset 0px 14px #C2410C, inset 0px 14px 1px 1px #C2410C;
}
.antenna::after {
  content: "";
  position: absolute;
  top: 0.5em;
  left: 0.7em;
  transform: rotate(-25deg);
  width: 0.9em;
  height: 0.45em;
  border-radius: 50%;
  background-color: #FDBA74;
}
.antenna::before {
  content: "";
  position: absolute;
  top: 1.7em;
  left: 1.2em;
  transform: rotate(-20deg);
  width: 1.3em;
  height: 0.7em;
  border-radius: 50%;
  background-color: #FDBA74;
}
.a1 {
  position: absolute;
  top: -3.6em;
  left: -4.2em;
  width: 10.5em;
  height: 4.8em;
  border-radius: 50px;
  background-image: linear-gradient(#1E293B, #334155, #1E293B);
  transform: rotate(-29deg);
  clip-path: polygon(50% 0%, 49% 100%, 52% 100%);
  z-index: -1;
}
.a1d {
  position: absolute;
  top: -4.2em;
  left: -4.5em;
  transform: rotate(45deg);
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  border: 2px solid #0F172A;
  background-color: #E2E8F0;
  z-index: 2;
}
.a2 {
  position: absolute;
  top: -4em;
  left: -0.8em;
  width: 10.5em;
  height: 3.8em;
  border-radius: 50px;
  background-image: linear-gradient(#1E293B, #334155, #1E293B);
  clip-path: polygon(47% 0, 47% 0, 34% 34%, 54% 25%, 32% 100%, 29% 96%, 49% 32%, 30% 38%);
  transform: rotate(-8deg);
  z-index: -1;
}
.a2d {
  position: absolute;
  top: -4.6em;
  left: 5.3em;
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  border: 2px solid #0F172A;
  background-color: #E2E8F0;
  z-index: 2;
}

.tv {
  width: 17.5em;
  height: 9.6em;
  margin-top: 3em;
  border-radius: 16px;
  background-color: #D97706;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border: 2.5px solid #0F172A;
  box-shadow: inset 0.2em 0.2em #FBBF24, 0 16px 36px rgba(0, 0, 0, 0.45);
  position: relative;
  padding: 0 0.5em;
}

.curve_svg {
  position: absolute;
  top: 8px;
  left: 10px;
  height: 14px;
  width: 14px;
  z-index: 10;
  pointer-events: none;
}

.display_div {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  box-shadow: 2.5px 2.5px 0px #B45309;
}
.screen_out {
  border-radius: 10px;
}
.screen_out1 {
  width: 11.2em;
  height: 8.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}
.screen {
  width: 11.2em;
  height: 8.2em;
  border: 2px solid #0F172A;
  background:
    repeating-radial-gradient(#070D1E 0 0.0001%, #1E293B 0 0.0002%) 50% 0/2500px 2500px,
    repeating-conic-gradient(#070D1E 0 0.0001%, #1E293B 0 0.0002%) 60% 60%/2500px 2500px;
  background-blend-mode: difference;
  animation: tvStatic 0.22s infinite alternate;
  border-radius: 10px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

@keyframes tvStatic {
  100% {
    background-position: 50% 0, 60% 50%;
  }
}

.notfound_text {
  background-color: rgba(15, 23, 42, 0.94);
  padding: 0.4em 0.75em;
  font-size: 0.72em;
  color: #38BDF8;
  letter-spacing: 0.06em;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  z-index: 10;
  font-weight: 800;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.55);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
}

.lines {
  display: flex;
  column-gap: 0.15em;
  align-self: center;
  margin: 0 0.45em;
}
.line1, .line3 {
  width: 2px;
  height: 1.8em;
  background-color: #0F172A;
  border-radius: 4px;
}
.line2 {
  width: 2px;
  height: 2.6em;
  background-color: #0F172A;
  border-radius: 4px;
}

.buttons_div {
  width: 4.4em;
  height: 8.2em;
  background-color: #F59E0B;
  border: 2px solid #0F172A;
  padding: 0.5em 0.35em;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  box-shadow: 2.5px 2.5px 0px #B45309;
}

.b1, .b2 {
  width: 1.7em;
  height: 1.7em;
  border-radius: 50%;
  background-color: #78350F;
  border: 2px solid #0F172A;
  box-shadow: inset 2px 2px 1px #B45309, -1px 0px #451A03;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.b1::before {
  content: "";
  position: absolute;
  width: 2px;
  height: 60%;
  background-color: #F8FAFC;
  transform: rotate(35deg);
  border-radius: 2px;
}
.b2::before {
  content: "";
  position: absolute;
  width: 2px;
  height: 60%;
  background-color: #F8FAFC;
  transform: rotate(-40deg);
  border-radius: 2px;
}

.speakers {
  display: flex;
  flex-direction: column;
  row-gap: 0.35em;
  width: 100%;
  padding: 0 0.3em;
}
.speakers .g1 {
  display: flex;
  column-gap: 0.3em;
  justify-content: center;
}
.speakers .g1 .g11, .g12, .g13 {
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  background-color: #78350F;
  border: 1.5px solid #0F172A;
  box-shadow: inset 1px 1px 1px #B45309;
}
.speakers .g {
  width: 100%;
  height: 2px;
  background-color: #0F172A;
  border-radius: 2px;
}

.bottom {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 9.5em;
  position: relative;
}
.base1, .base2 {
  height: 1em;
  width: 2.2em;
  border: 2px solid #0F172A;
  background-color: #334155;
  margin-top: -0.15em;
  border-radius: 0 0 4px 4px;
}
.base3 {
  position: absolute;
  height: 3px;
  width: 18em;
  background-color: rgba(15, 23, 42, 0.4);
  margin-top: 1.1em;
  border-radius: 3px;
}
`;

function RetroTvView({ isHi }: { isHi: boolean }) {
  const onScreenText = isHi ? '404 · सिग्नल नहीं है :(' : '404 · NO SIGNAL :(';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 8 }}>
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{ __html: TV_CSS }} />
      )}

      {/* Uiverse Retro TV DOM structure */}
      <div className="retro_tv_wrapper">
        <div className="text_404">
          <div className="text_4041">4</div>
          <div className="text_4042">0</div>
          <div className="text_4043">4</div>
        </div>

        <div className="tv_main">
          <div className="antenna">
            <div className="antenna_shadow" />
            <div className="a1" />
            <div className="a1d" />
            <div className="a2" />
            <div className="a2d" />
          </div>

          <div className="tv">
            <svg
              className="curve_svg"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 189.929 189.929"
            >
              <path
                d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13 C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z"
                fill="rgba(255,255,255,0.35)"
              />
            </svg>

            <div className="display_div">
              <div className="screen_out">
                <div className="screen_out1">
                  <div className="screen">
                    <span className="notfound_text">{onScreenText}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lines">
              <div className="line1" />
              <div className="line2" />
              <div className="line3" />
            </div>

            <div className="buttons_div">
              <div className="b1" />
              <div className="b2" />
              <div className="speakers">
                <div className="g1">
                  <div className="g11" />
                  <div className="g12" />
                  <div className="g13" />
                </div>
                <div className="g" />
                <div className="g" />
              </div>
            </div>
          </div>

          <div className="bottom">
            <div className="base1" />
            <div className="base2" />
            <div className="base3" />
          </div>
        </div>
      </div>
    </View>
  );
}

export default function NotFoundScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { language } = useLanguage() as any;
  const isHi = language === 'hi';

  const quickLinks = [
    {
      title: isHi ? 'ओपीडी डॉक्टर' : 'Doctor Consult',
      sub: isHi ? 'क्लीनिक अपॉइंटमेंट' : 'Verified Doctors',
      icon: Stethoscope,
      route: '/(tabs)/opd',
      tint: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.15)',
    },
    {
      title: isHi ? 'लैब व स्कैन' : 'Lab Tests & Scans',
      sub: isHi ? 'होम सैंपल पिकअप' : 'NABL Labs',
      icon: FlaskConical,
      route: '/(tabs)/labs',
      tint: '#10B981',
      bg: 'rgba(16, 185, 129, 0.15)',
    },
    {
      title: isHi ? 'अस्पताल भर्ती' : 'Hospital Care',
      sub: isHi ? 'प्लांड सर्जरी व कैशलेस' : 'IPD Admissions',
      icon: Building2,
      route: '/(tabs)/ipd',
      tint: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.15)',
    },
    {
      title: isHi ? 'दवाइयां' : 'Medicines',
      sub: isHi ? 'पार्टनर फार्मेसी' : 'Genuine Delivery',
      icon: Pill,
      route: '/(tabs)/pharmacy',
      tint: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.15)',
    },
  ];

  const handleGoHome = () => {
    router.replace(ROUTES.home as any);
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.home as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#070D1F' }}>
      {/* Background radial gradient glow */}
      <LinearGradient
        colors={['#0B1B4D', '#0F172A', '#060A17']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <Pressable
            onPress={handleGoHome}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            hitSlop={8}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: 'rgba(37, 99, 235, 0.25)',
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.4)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={16} color="#60A5FA" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 }}>
                Adityam <Text style={{ color: '#60A5FA' }}>Niramayaa</Text>
              </Text>
            </View>
          </Pressable>

          <LangToggle tone="light" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 40,
            alignItems: 'center',
          }}
        >
          <View style={{ width: '100%', maxWidth: 520, alignItems: 'center' }}>
            {/* Retro TV 404 Illustration */}
            <RetroTvView isHi={isHi} />

            {/* Error badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.35)',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
                marginTop: 6,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: '#EF4444',
                }}
              />
              <Text
                style={{
                  color: '#FCA5A5',
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {isHi ? '404 · गलत रास्ता या पेज अनुपलब्ध' : 'ERROR 404 · PAGE NOT FOUND'}
              </Text>
            </View>

            {/* Headline */}
            <Text
              style={{
                fontSize: 26,
                fontWeight: '800',
                color: '#FFFFFF',
                textAlign: 'center',
                lineHeight: 34,
                letterSpacing: -0.3,
              }}
            >
              {isHi ? 'रास्ता भटक गए?' : 'Wrong Channel · Page Not Found'}
            </Text>

            {/* Subtitle */}
            <Text
              style={{
                fontSize: 14.5,
                color: '#94A3B8',
                textAlign: 'center',
                lineHeight: 22,
                marginTop: 8,
                maxWidth: 420,
              }}
            >
              {isHi
                ? 'लगता है आप किसी ऐसे चैनल पर आ गए हैं जो मौजूद नहीं है। यह पेज हटा दिया गया है या उसका पता बदल गया है।'
                : "Looks like you tuned into a frequency that doesn't exist. The page may have been moved, renamed, or never aired."}
            </Text>

            {/* Action buttons */}
            <View
              style={{
                width: '100%',
                flexDirection: 'column',
                gap: 12,
                marginTop: 24,
                maxWidth: 440,
              }}
            >
              {/* Primary redirect button */}
              <Pressable
                onPress={handleGoHome}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  backgroundColor: '#2563EB',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 14,
                  elevation: 6,
                })}
              >
                <Home size={19} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 }}>
                  {isHi ? 'होम पेज पर लौटें' : 'Take Me Home'}
                </Text>
              </Pressable>

              {/* Secondary go back button */}
              <Pressable
                onPress={handleGoBack}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.16)',
                  paddingVertical: 13,
                  paddingHorizontal: 20,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <ArrowLeft size={18} color="#CBD5E1" strokeWidth={2.2} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#E2E8F0' }}>
                  {isHi ? 'पिछले पेज पर जाएं' : 'Go Back Previous Page'}
                </Text>
              </Pressable>
            </View>

            {/* Quick explore section */}
            <View style={{ width: '100%', marginTop: 32, maxWidth: 460 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Sparkles size={15} color="#60A5FA" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  {isHi ? 'त्वरित स्वास्थ्य सेवाएं' : 'Quick Access Channels'}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 10,
                  justifyContent: 'space-between',
                }}
              >
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Pressable
                      key={item.title}
                      onPress={() => router.replace(item.route as any)}
                      style={({ pressed }) => ({
                        width: '48%',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.10)',
                        borderRadius: 14,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: item.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} color={item.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: '700',
                            color: '#FFFFFF',
                            lineHeight: 18,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#94A3B8',
                            marginTop: 1,
                          }}
                          numberOfLines={1}
                        >
                          {item.sub}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
