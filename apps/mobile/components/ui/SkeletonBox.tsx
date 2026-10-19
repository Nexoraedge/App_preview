import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

export function SkeletonBox({
  width: w,
  height: h,
  borderRadius = 16,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          width: w as any,
          height: h,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity: shimmer,
        },
        style,
      ]}
    />
  );
}

export function HospitalCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SkeletonBox width={160} height={18} borderRadius={6} />
        <SkeletonBox width={50} height={20} borderRadius={10} />
      </View>
      <SkeletonBox width="85%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonBox width="60%" height={12} borderRadius={4} style={{ marginBottom: 14 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <SkeletonBox width={80} height={22} borderRadius={8} />
        <SkeletonBox width={90} height={22} borderRadius={8} />
      </View>
      <SkeletonBox width="100%" height={38} borderRadius={12} />
    </View>
  );
}

export function DoctorCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <SkeletonBox width={88} height={120} borderRadius={16} />
        <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'space-between' }}>
          <View>
            <SkeletonBox width={140} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <SkeletonBox width={100} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
            <SkeletonBox width={70} height={16} borderRadius={8} style={{ marginBottom: 10 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <SkeletonBox width={65} height={22} borderRadius={6} />
            <SkeletonBox width={65} height={22} borderRadius={6} />
          </View>
        </View>
      </View>
      <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox width={110} height={16} borderRadius={6} />
        <SkeletonBox width={80} height={34} borderRadius={10} />
      </View>
    </View>
  );
}

export function LabCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SkeletonBox width={140} height={16} borderRadius={6} />
        <SkeletonBox width={60} height={20} borderRadius={8} />
      </View>
      <SkeletonBox width="80%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
      <SkeletonBox width="50%" height={12} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
        <SkeletonBox width={80} height={18} borderRadius={6} />
        <SkeletonBox width={90} height={32} borderRadius={10} />
      </View>
    </View>
  );
}

export function IpdCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SkeletonBox width={150} height={18} borderRadius={6} />
        <SkeletonBox width={70} height={22} borderRadius={10} />
      </View>
      <SkeletonBox width="90%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonBox width="65%" height={12} borderRadius={4} style={{ marginBottom: 14 }} />
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        <SkeletonBox width={80} height={20} borderRadius={6} />
        <SkeletonBox width={80} height={20} borderRadius={6} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
        <SkeletonBox width={100} height={18} borderRadius={6} />
        <SkeletonBox width={110} height={36} borderRadius={12} />
      </View>
    </View>
  );
}
