import React, { useEffect, useRef } from 'react';
import { Animated, View, useWindowDimensions } from 'react-native';

const SKELETON_COLORS = {
  surface: '#FFFFFF',
  border: '#E6E1D5',
  shimmer: '#EAE5D9',
  shimmerSoft: '#F3EFE6',
};

function ShimmerBlock({
  width,
  height,
  borderRadius = 8,
  opacity,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: SKELETON_COLORS.shimmer,
        opacity,
      }}
    />
  );
}

export function usePulseOpacity() {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

export function AdminKpiSkeletonRow({ count = 4 }: { count?: number }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const opacity = usePulseOpacity();

  return (
    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={{
            flex: 1,
            backgroundColor: SKELETON_COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: SKELETON_COLORS.border,
            gap: 10,
          }}
        >
          <ShimmerBlock width="52%" height={11} borderRadius={6} opacity={opacity} />
          <ShimmerBlock width="68%" height={26} borderRadius={8} opacity={opacity} />
          <ShimmerBlock width="80%" height={12} borderRadius={6} opacity={opacity} />
        </View>
      ))}
    </View>
  );
}

export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  const opacity = usePulseOpacity();

  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <View
          key={idx}
          style={{
            backgroundColor: SKELETON_COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: SKELETON_COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ShimmerBlock width={96} height={14} borderRadius={6} opacity={opacity} />
              <ShimmerBlock width={64} height={14} borderRadius={99} opacity={opacity} />
            </View>
            <ShimmerBlock width="58%" height={13} borderRadius={6} opacity={opacity} />
            <ShimmerBlock width="42%" height={11} borderRadius={6} opacity={opacity} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <ShimmerBlock width={72} height={18} borderRadius={6} opacity={opacity} />
            <ShimmerBlock width={110} height={28} borderRadius={8} opacity={opacity} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function AdminPageSkeleton() {
  const opacity = usePulseOpacity();
  return (
    <View style={{ gap: 16 }}>
      <AdminKpiSkeletonRow count={4} />
      <View
        style={{
          backgroundColor: SKELETON_COLORS.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: SKELETON_COLORS.border,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <ShimmerBlock width={130} height={36} borderRadius={10} opacity={opacity} />
        <ShimmerBlock width={130} height={36} borderRadius={10} opacity={opacity} />
        <ShimmerBlock width={130} height={36} borderRadius={10} opacity={opacity} />
      </View>
      <AdminListSkeleton rows={5} />
    </View>
  );
}
