// app/welcome.tsx
// Three-slide "how to use the app" walkthrough. Shown once. Finishing it saves a flag and goes to login.
import React, { useRef, useState } from 'react';
import { View, Text, Animated, FlatList, Pressable, useWindowDimensions, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stethoscope, FlaskConical, Pill, Building2, MapPin, UserPlus, CheckCircle2 } from 'lucide-react-native';
import { C, R } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import { pickCopy } from '../src/i18n/launchCopy';
import { ONBOARDING_KEY, ROUTES } from '../src/config/brand';
import { PrimaryButton } from '../components/ui/kit';
import { LangToggle } from '../components/launch/LangToggle';

const card = {
  backgroundColor: '#fff',
  borderRadius: R.xl,
  padding: 16,
  shadowColor: '#0B1B4D',
  shadowOpacity: 0.18,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
} as const;

function ServicesArt({ c }: { c: ReturnType<typeof pickCopy> }) {
  const items = [
    { Icon: Stethoscope, label: c.services.doctors, bg: C.brandSoft, fg: C.brand },
    { Icon: FlaskConical, label: c.services.labs, bg: C.goodSoft, fg: C.good },
    { Icon: Pill, label: c.services.pharmacy, bg: C.warnSoft, fg: C.warn },
    { Icon: Building2, label: c.services.hospital, bg: C.dangerSoft, fg: C.danger },
  ];
  return (
    <View style={card}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {items.map(({ Icon, label, bg, fg }) => (
          <View key={label} style={{ width: '47%', flexGrow: 1, backgroundColor: bg, borderRadius: R.lg, paddingVertical: 18, alignItems: 'center', gap: 8 }}>
            <Icon size={28} color={fg} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: C.brandSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill }}>
        <MapPin size={14} color={C.brand} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.brand }}>{c.nearYou}</Text>
      </View>
    </View>
  );
}

function BookingArt({ c }: { c: ReturnType<typeof pickCopy> }) {
  return (
    <View style={card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Stethoscope size={26} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, lineHeight: 24 }}>{c.mock.doctor}</Text>
          <Text style={{ fontSize: 13.5, color: C.sub, lineHeight: 20 }}>{c.mock.speciality}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {c.mock.slots.map((s, i) => (
          <View key={s} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: R.pill, backgroundColor: i === 1 ? C.brand : C.brandSoft }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: i === 1 ? '#fff' : C.brand }}>{s}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16, backgroundColor: C.good, borderRadius: R.md, minHeight: 50, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center', lineHeight: 22 }}>{c.mock.payCta}</Text>
      </View>
    </View>
  );
}

function FamilyArt({ c }: { c: ReturnType<typeof pickCopy> }) {
  const rows = [
    { name: c.family.you, sub: c.family.self, init: c.family.you.charAt(0), tint: C.brand },
    { name: c.family.names.mother, sub: c.family.mother, init: c.family.names.mother.charAt(0), tint: C.good },
    { name: c.family.names.son, sub: c.family.son, init: c.family.names.son.charAt(0), tint: C.warn },
  ];
  return (
    <View style={card}>
      {rows.map((r) => (
        <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{r.init}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: C.ink, lineHeight: 22 }}>{r.name}</Text>
            <Text style={{ fontSize: 13, color: C.sub, lineHeight: 19 }}>{r.sub}</Text>
          </View>
          <CheckCircle2 size={20} color={C.good} />
        </View>
      ))}
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.brand }}>
        <UserPlus size={18} color={C.brand} />
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.brand }}>{c.family.add}</Text>
      </View>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { language } = useLanguage() as any;
  const c = pickCopy(language);
  const compact = height < 700;

  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<number>>(null);
  const [index, setIndex] = useState(0);
  const last = index === 2;

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const v = viewableItems[0];
    if (v && typeof v.index === 'number') setIndex(v.index);
  }).current;

  const finish = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    router.replace(ROUTES.login as any);
  };

  const next = () => {
    if (last) return finish();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const arts = [ServicesArt, BookingArt, FamilyArt];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={['#0B1B4D', '#172554', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * (compact ? 0.5 : 0.56) }} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, minHeight: 48 }}>
          <LangToggle tone="light" />
          {!last ? (
            <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" style={{ paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' }}>{c.skip}</Text>
            </Pressable>
          ) : <View style={{ height: 44 }} />}
        </View>

        <Animated.FlatList
          ref={listRef as any}
          data={[0, 1, 2]}
          keyExtractor={(i) => String(i)}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item: i }) => {
            const Art = arts[i];
            const range = [(i - 1) * width, i * width, (i + 1) * width];
            const tx = scrollX.interpolate({ inputRange: range, outputRange: [width * 0.25, 0, -width * 0.25], extrapolate: 'clamp' });
            const op = scrollX.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' });
            return (
              <View style={{ width, paddingHorizontal: 24 }}>
                <Animated.View style={{ flex: 1, justifyContent: 'center', opacity: op, transform: [{ translateX: tx }, { scale: compact ? 0.92 : 1 }] }}>
                  <View style={{ maxWidth: 420, width: '100%', alignSelf: 'center' }}>
                    <Art c={c} />
                  </View>
                </Animated.View>
              </View>
            );
          }}
        />

        <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
          <View style={{ minHeight: compact ? 120 : 140, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
            <Text style={{ fontSize: compact ? 22 : 25, fontWeight: '800', color: C.ink, lineHeight: compact ? 32 : 36, textAlign: 'center' }}>{c.slides[index].title}</Text>
            <Text style={{ fontSize: 15, color: C.sub, lineHeight: 24, textAlign: 'center', marginTop: 8 }}>{c.slides[index].body}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginVertical: 14 }}>
            {[0, 1, 2].map((i) => {
              const range = [(i - 1) * width, i * width, (i + 1) * width];
              const scaleX = scrollX.interpolate({ inputRange: range, outputRange: [1, 2.75, 1], extrapolate: 'clamp' });
              const o = scrollX.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
              return (
                <View key={i} style={{ width: 24, height: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Animated.View
                    style={{
                      height: 8,
                      width: 8,
                      borderRadius: 4,
                      backgroundColor: C.brand,
                      opacity: o,
                      transform: [{ scaleX }],
                    }}
                  />
                </View>
              );
            })}
          </View>

          <View style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}>
            <PrimaryButton label={last ? c.start : c.next} onPress={next} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
