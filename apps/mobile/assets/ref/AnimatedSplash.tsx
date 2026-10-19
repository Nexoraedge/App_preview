// components/launch/AnimatedSplash.tsx
// The opening screen: deep-blue gradient, logo springs in with soft pulse rings, brand name fades up,
// three pulsing dots at the bottom. It stays for at least `minMs`, and leaves only when `ready` is true.
// Uses React Native's built-in Animated, so it has no extra animation-library requirement.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { LogoMark } from '../../components/brand/LogoMark';
import { BRAND } from '../../src/config/brand';
import { pickCopy } from '../../src/i18n/launchCopy';

type Props = {
  ready: boolean; // true when the app has finished loading what it needs (session, onboarding flag)
  onFinish: () => void; // called after the fade-out; navigate here
  language?: string;
  minMs?: number;
};

function PulseRing({ delay }: { delay: number }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [p, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: '#FFFFFF',
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
      }}
    />
  );
}

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
    return () => { clearTimeout(t); loop.stop(); };
  }, [o, index]);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF', opacity: o }} />;
}

export function AnimatedSplash({ ready, onFinish, language, minMs = 1800 }: Props) {
  const copy = pickCopy(language);

  const logoO = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const textO = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(14)).current;
  const exitO = useRef(new Animated.Value(1)).current;

  const [minDone, setMinDone] = useState(false);
  const leaving = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish; // always call the latest callback

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoO, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(textO, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(textY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start();
    const t = setTimeout(() => setMinDone(true), minMs);
    return () => clearTimeout(t);
  }, [logoO, scale, textO, textY, minMs]);

  useEffect(() => {
    if (!ready || !minDone || leaving.current) return;
    leaving.current = true;
    Animated.timing(exitO, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => finishRef.current());
  }, [ready, minDone, exitO]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: exitO }]}
      // Hide the native splash only once this animated one is on screen, so there is no flash between them.
      onLayout={() => { SplashScreen.hideAsync().catch(() => {}); }}
    >
      <LinearGradient
        colors={['#0B1B4D', '#172554', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.06)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: -90, left: -70, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)' }} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 128, height: 128, alignItems: 'center', justifyContent: 'center' }}>
          <PulseRing delay={0} />
          <PulseRing delay={1100} />
          <Animated.View
            style={{
              width: 104, height: 104, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
              opacity: logoO, transform: [{ scale }],
            }}
          >
            <LogoMark size={52} />
          </Animated.View>
        </View>

        <Animated.View style={{ alignItems: 'center', marginTop: 28, opacity: textO, transform: [{ translateY: textY }] }}>
          <Text style={{ fontSize: 30, lineHeight: 40, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, textAlign: 'center' }}>
            {BRAND.name}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 24, color: 'rgba(255,255,255,0.82)', marginTop: 6, textAlign: 'center' }}>
            {copy.tagline}
          </Text>
        </Animated.View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 64, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <LoadDot index={0} />
        <LoadDot index={1} />
        <LoadDot index={2} />
      </View>
    </Animated.View>
  );
}
