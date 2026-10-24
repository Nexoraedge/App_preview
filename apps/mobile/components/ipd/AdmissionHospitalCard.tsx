// apps/mobile/components/ipd/AdmissionHospitalCard.tsx
// Partner hospital card with photo, rating badge, distance, and booking CTA

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Star, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HospitalAdmissionInfo } from '../../src/data/ipdData';
import { PressableCard } from '../PressableCard';

interface AdmissionHospitalCardProps {
  hospital: HospitalAdmissionInfo;
  isHi: boolean;
  index: number;
  onBookAdmission: (hosp: HospitalAdmissionInfo) => void;
}

export function AdmissionHospitalCard({
  hospital: hosp,
  isHi,
  index,
  onBookAdmission,
}: AdmissionHospitalCardProps) {
  const displayName = isHi && hosp.nameHi ? hosp.nameHi : hosp.name;
  const displayLoc = isHi && hosp.locationHi ? hosp.locationHi : hosp.location;
  const displayTag = isHi && hosp.tagHi ? hosp.tagHi : hosp.tag;

  return (
    <PressableCard
      index={index}
      style={{ width: 280 }}
      onPress={() => onBookAdmission(hosp)}
    >
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Photo with Rating and Distance */}
        <View
          style={{
            height: 130,
            position: 'relative',
            backgroundColor: '#EFF6FF',
          }}
        >
          <Image
            source={{ uri: hosp.image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.1)', 'rgba(15, 23, 42, 0.65)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Rating Badge */}
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Star size={11} color="#D97706" fill="#D97706" />
            <Text
              style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}
            >
              {hosp.rating}
            </Text>
            <Text style={{ fontSize: 11, color: '#64748B' }}>
              ({hosp.total_reviews})
            </Text>
          </View>

          {/* Distance Badge */}
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <MapPin size={11} color="#93C5FD" />
            <Text
              style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}
            >
              {hosp.distance_km} {isHi ? 'किमी दूर' : 'km away'}
            </Text>
          </View>
        </View>

        {/* Content: Name, location, tag, and button */}
        <View style={{ padding: 14 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: '#0F172A',
              lineHeight: 18,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '400',
              color: '#64748B',
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {displayLoc}
          </Text>

          {/* Tag */}
          <View
            style={{
              marginTop: 10,
              alignSelf: 'flex-start',
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text
              style={{ fontSize: 11, fontWeight: '600', color: '#2563EB' }}
            >
              {displayTag}
            </Text>
          </View>

          {/* Quick Action Button */}
          <TouchableOpacity
            onPress={() => onBookAdmission(hosp)}
            activeOpacity={0.85}
            style={{
              marginTop: 12,
              backgroundColor: '#2563EB',
              paddingVertical: 9,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text
              style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}
            >
              {isHi ? 'भर्ती बुक करें →' : 'Book Admission →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </PressableCard>
  );
}
