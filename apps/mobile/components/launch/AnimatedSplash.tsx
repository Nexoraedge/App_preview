// components/launch/AnimatedSplash.tsx
// Opening screen with stylish typography, free-floating 3D logo, and failsafe unblocking for Android/iOS.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { LogoMark } from '../brand/LogoMark';
import { BRAND } from '../../src/config/brand';
import { pickCopy } from '../../src/i18n/launchCopy';

type Props = {
  ready: boolean;
  onFinish: () => void;
  language?: string;
  minMs?: number;
};

function LoadDot({ index }: { index: number }) {
  const o = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.3, duration: 420, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), index * 180);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [o, index]);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#38BDF8', opacity: o }} />;
}

export function AnimatedSplash({ ready, onFinish, language, minMs = 1800 }: Props) {
  const copy = pickCopy(language);

  const logoO = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const textO = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(14)).current;
  const exitO = useRef(new Animated.Value(1)).current;

  const [minDone, setMinDone] = useState(false);
  const leaving = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    // Immediately unlock and dismiss the native OS splash screen on Android/iOS
    SplashScreen.hideAsync().catch(() => {});

    Animated.parallel([
      Animated.timing(logoO, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 75, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(350),
        Animated.parallel([
          Animated.timing(textO, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(textY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    const t = setTimeout(() => setMinDone(true), minMs);

    // Failsafe timer: NEVER stay stuck for more than 2.4s under any circumstances
    const safety = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      if (!leaving.current) {
        leaving.current = true;
        finishRef.current();
      }
    }, 2400);

    return () => {
      clearTimeout(t);
      clearTimeout(safety);
    };
  }, [logoO, scale, textO, textY, minMs]);

  useEffect(() => {
    if (!ready || !minDone || leaving.current) return;
    leaving.current = true;
    Animated.timing(exitO, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
      SplashScreen.hideAsync().catch(() => {});
      finishRef.current();
    });
  }, [ready, minDone, exitO]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: exitO }]}
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      {/* Deep Royal Medical Gradient matching the logo */}
      <LinearGradient
        colors={['#0A1931', '#172554', '#1E40AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle ambient light glows */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          right: -50,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -80,
          left: -60,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: 'rgba(52, 211, 153, 0.07)',
        }}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Clean, free-floating 3D Logo without any box or harsh shadow */}
        <Animated.View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            opacity: logoO,
            transform: [{ scale }],
          }}
        >
          <LogoMark size={118} />
        </Animated.View>

        {/* Stylish Two-Tone Brand Title & Tagline */}
        <Animated.View
          style={{
            alignItems: 'center',
            marginTop: 22,
            opacity: textO,
            transform: [{ translateY: textY }],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 7 }}>
            <Text
              style={{
                fontSize: 31,
                fontWeight: '900',
                color: '#FFFFFF',
                letterSpacing: -0.4,
              }}
            >
              {language === 'hi' ? 'आदित्यम्' : 'Adityam'}
            </Text>
            <Text
              style={{
                fontSize: 31,
                fontWeight: '900',
                color: '#38BDF8',
                letterSpacing: -0.4,
              }}
            >
              {language === 'hi' ? 'निरामया' : 'Niramayaa'}
            </Text>
          </View>

          {/* Frosted Tagline Pill */}
          <View
            style={{
              marginTop: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              paddingHorizontal: 16,
              paddingVertical: 5.5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.22)',
            }}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '700',
                color: '#E0F2FE',
                letterSpacing: 0.6,
                textAlign: 'center',
              }}
            >
              {copy.tagline.toUpperCase()}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Pulsing Dots */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 58,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <LoadDot index={0} />
        <LoadDot index={1} />
        <LoadDot index={2} />
      </View>
    </Animated.View>
  );
}
