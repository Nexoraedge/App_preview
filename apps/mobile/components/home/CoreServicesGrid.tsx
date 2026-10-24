// apps/mobile/components/home/CoreServicesGrid.tsx
// 4 Primary Healthcare Service Cards with Differentiated Soft Tints, Badges, and Tactile Micro-Press Feedback

import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SkeletonBox } from '../ui/SkeletonBox';
import { CORE_SERVICES, CoreServiceItem } from '../../src/data/homeData';

interface CoreServicesGridProps {
  isHi: boolean;
  isLoading: boolean;
}

function ServiceCard({
  service,
  isHi,
  index,
  onPress,
}: {
  service: CoreServiceItem;
  isHi: boolean;
  index: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, translateY]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const IconComp = service.Icon;

  return (
    <Animated.View
      style={{
        width: '48.5%',
        opacity: fadeAnim,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={{
          backgroundColor: service.bg,
          borderRadius: 20,
          padding: 12,
          borderWidth: 1.2,
          borderColor: service.border,
          minHeight: 120,
          justifyContent: 'space-between',
          overflow: 'hidden',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Top row: Icon container + Distinct Soft Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: service.iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconComp size={20} color={service.iconColor} />
          </View>
          <View
            style={{
              backgroundColor: service.badgeBg,
              paddingHorizontal: 7,
              paddingVertical: 2.5,
              borderRadius: 999,
              maxWidth: '58%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: service.badgeFg,
                letterSpacing: 0.2,
              }}
            >
              {isHi ? service.badgeHi : service.badgeEn}
            </Text>
          </View>
        </View>

        {/* Bottom row: Titles */}
        <View style={{ marginTop: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15.5,
              fontWeight: '800',
              color: '#0F172A',
              letterSpacing: -0.2,
            }}
          >
            {isHi ? service.titleHi : service.titleEn}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 11.5,
              fontWeight: '600',
              color: '#475569',
              marginTop: 2,
              lineHeight: 15,
            }}
          >
            {isHi ? service.subHi : service.subEn}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function CoreServicesGrid({ isHi, isLoading }: CoreServicesGridProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
          <SkeletonBox width="48.5%" height={126} borderRadius={22} />
          <SkeletonBox width="48.5%" height={126} borderRadius={22} />
          <SkeletonBox width="48.5%" height={126} borderRadius={22} />
          <SkeletonBox width="48.5%" height={126} borderRadius={22} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
        {CORE_SERVICES.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            isHi={isHi}
            index={index}
            onPress={() => router.push(service.route)}
          />
        ))}
      </View>
    </View>
  );
}
