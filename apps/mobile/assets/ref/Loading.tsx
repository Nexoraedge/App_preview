// components/ui/Loading.tsx
// Loading and error states used across the app:
//   <LoadingScreen language={language} />        full-screen, branded spinner with friendly rotating messages
//   <BrandLoader />                              just the spinner (buttons, small areas)
//   <Skeleton /> / <SkeletonCard />              grey placeholder shapes while a list loads
//   <LoadFailed onRetry={...} language={...} />  "could not load" with a retry button
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { HeartPulse, WifiOff } from 'lucide-react-native';
import { C, R } from '../../src/theme';
import { PrimaryButton } from '../../components/ui/kit';
import { pickCopy } from '../../src/i18n/launchCopy';

export function BrandLoader({ size = 64 }: { size?: number }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [rot]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: C.brandSoft }} />
      <Animated.View
        style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 4,
          borderColor: 'transparent', borderTopColor: C.brand,
          transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }}
      />
      <HeartPulse size={size * 0.38} color={C.brand} />
    </View>
  );
}

export function LoadingScreen({ language, messages }: { language?: string; messages?: string[] }) {
  const list = messages ?? pickCopy(language).loading;
  const [i, setI] = useState(0);
  const op = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => {
      Animated.timing(op, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setI((n) => (n + 1) % list.length);
        Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 2400);
    return () => clearInterval(id);
  }, [list.length, op]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <BrandLoader size={72} />
      <Animated.Text
        style={{ opacity: op, marginTop: 22, fontSize: 15, lineHeight: 24, color: C.sub, textAlign: 'center' }}
      >
        {list[i % list.length]}
      </Animated.Text>
    </View>
  );
}

export function Skeleton({
  width = '100%', height = 14, radius = 8, style,
}: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const o = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.55, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: radius, backgroundColor: '#E2E8F0', opacity: o }, style]}
    />
  );
}

// Shaped like a hospital / doctor card, for list screens.
export function SkeletonCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: R.xl, borderWidth: 1, borderColor: C.line, padding: 12 }}>
      <Skeleton height={150} radius={18} />
      <View style={{ padding: 6, gap: 10, marginTop: 8 }}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={13} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Skeleton width={70} height={26} radius={13} />
          <Skeleton width={70} height={26} radius={13} />
        </View>
        <Skeleton height={48} radius={16} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function LoadFailed({
  onRetry, language, title, body, retryLabel,
}: { onRetry: () => void; language?: string; title?: string; body?: string; retryLabel?: string }) {
  const f = pickCopy(language).failed;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: C.warnSoft, alignItems: 'center', justifyContent: 'center' }}>
        <WifiOff size={32} color={C.warn} />
      </View>
      <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 18, textAlign: 'center', lineHeight: 28 }}>{title ?? f.title}</Text>
      <Text style={{ fontSize: 14.5, color: C.sub, marginTop: 6, textAlign: 'center', lineHeight: 22, maxWidth: 320 }}>{body ?? f.body}</Text>
      <View style={{ marginTop: 20, width: '100%', maxWidth: 280 }}>
        <PrimaryButton label={retryLabel ?? f.retry} onPress={onRetry} />
      </View>
    </View>
  );
}
