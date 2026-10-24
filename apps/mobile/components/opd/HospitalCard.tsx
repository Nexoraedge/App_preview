// apps/mobile/components/opd/HospitalCard.tsx
// Partner Hospital Card with Photo Header, Rating Badge, Distance, Wave Seam, and Action Button

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, MapPin, Tag, Building2, UserCheck, ChevronRight } from 'lucide-react-native';
import type { DimensionValue } from 'react-native';
import type { Hospital } from '@adityam/types';
import {
  translateHospitalName,
  translateAddress,
  translateSpecialty,
} from '../../src/utils/hindiDictionary';
import { opdCopy } from '../../src/i18n/opdCopy';

interface HospitalCardProps {
  hospital: Hospital;
  isHi: boolean;
  onPress: (hospital: Hospital) => void;
  width?: DimensionValue;
}

export function HospitalCard({ hospital, isHi, onPress, width }: HospitalCardProps) {
  const c = isHi ? opdCopy.hi : opdCopy.en;
  const branches = hospital.branches || [];
  const totalDoctors = branches.reduce((sum, b) => sum + (b.doctors?.length || 0), 0);

  return (
    <View
      style={{
        width: width ?? '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        overflow: 'hidden',
      }}
    >
      {/* Compact Photo Header */}
      <View style={{ height: 138, backgroundColor: '#EFF6FF', position: 'relative' }}>
        {hospital.image_url ? (
          <Image
            source={{ uri: hospital.image_url }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              ...StyleSheet.absoluteFill,
              backgroundColor: '#EFF6FF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={32} color="#2563EB" strokeWidth={1.5} />
          </View>
        )}

        {/* Photo contrast gradient */}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.20)', 'transparent', 'rgba(15, 23, 42, 0.38)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Rating Badge */}
        {hospital.rating != null && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 9,
              paddingVertical: 5,
              gap: 4,
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 4,
            }}
          >
            <Star size={13} color="#F59E0B" fill="#F59E0B" />
            <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '800' }}>
              {hospital.rating}
            </Text>
            {hospital.total_reviews != null && (
              <Text style={{ color: '#64748B', fontSize: 10 }}>
                ({hospital.total_reviews})
              </Text>
            )}
          </View>
        )}

        {/* Partner Privilege label */}
        {hospital.featured && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: '#FDE68A',
              borderRadius: 14,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: '#92400E', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>
              {c.partnerPrivilege}
            </Text>
          </View>
        )}

        {/* Distance Pill */}
        <View
          style={{
            position: 'absolute',
            bottom: 14,
            left: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: 16,
            backgroundColor: 'rgba(15, 23, 42, 0.82)',
          }}
        >
          <MapPin size={11} color="#93C5FD" />
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
            {hospital.distance_km != null ? `${hospital.distance_km} km` : 'Nearby'}
          </Text>
        </View>

        {/* Wave transition */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -2,
            left: -1,
            right: -1,
            height: 32,
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 360 42" preserveAspectRatio="none">
            <Path
              d="M-2 14 C48 39 95 34 150 20 C205 5 242 35 292 27 C324 23 342 5 362 9 L362 44 L-2 44 Z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>

        {/* Solid white seam overlap */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: '#FFFFFF',
            zIndex: 1,
          }}
        />

        {/* Discount Pill */}
        {hospital.discount_percentage > 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: 6,
              right: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 16,
              zIndex: 3,
            }}
          >
            <Tag size={11} color="#2563EB" />
            <Text style={{ color: '#1D4ED8', fontSize: 10, fontWeight: '800' }}>
              {isHi
                ? `${hospital.discount_percentage}% छूट (ओपीडी)`
                : `${hospital.discount_percentage}% OFF OPD`}
            </Text>
          </View>
        )}
      </View>

      {/* Card Body */}
      <View
        style={{
          paddingHorizontal: 15,
          paddingTop: 6,
          paddingBottom: 15,
          backgroundColor: '#FFFFFF',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: '#0F172A',
            fontSize: 16,
            lineHeight: 22,
            fontWeight: '800',
            letterSpacing: -0.3,
          }}
        >
          {translateHospitalName(hospital.name, isHi)}
        </Text>

        <Text
          numberOfLines={1}
          style={{
            color: '#64748B',
            fontSize: 11,
            lineHeight: 16,
            marginTop: 2,
          }}
        >
          {translateAddress(hospital.address, isHi)}
        </Text>

        {/* Specialties Chips Row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 }}>
          {(hospital.specialties || []).slice(0, 2).map((spec, i) => (
            <View
              key={`${spec}-${i}`}
              style={{
                backgroundColor: '#F1F5F9',
                borderColor: '#E2E8F0',
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3.5,
              }}
            >
              <Text style={{ color: '#334155', fontSize: 11, fontWeight: '700' }}>
                {translateSpecialty(spec, isHi)}
              </Text>
            </View>
          ))}
          {(hospital.specialties || []).length > 2 && (
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderColor: '#E2E8F0',
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 3.5,
              }}
            >
              <Text style={{ color: '#64748B', fontSize: 10.5, fontWeight: '700' }}>
                +{(hospital.specialties || []).length - 2}
              </Text>
            </View>
          )}
        </View>

        {/* Hospital Details Row: Branches & Verified Doctor Count */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Building2 size={13} color="#2563EB" />
            <Text style={{ color: '#1E293B', fontSize: 11.5, fontWeight: '700' }}>
              {branches.length}{' '}
              {isHi
                ? branches.length === 1 ? 'शाखा' : 'शाखाएं'
                : branches.length === 1 ? 'Branch' : 'Branches'}
            </Text>
          </View>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <UserCheck size={13} color="#16A34A" />
            <Text style={{ color: '#1E293B', fontSize: 11.5, fontWeight: '700' }}>
              {totalDoctors}+ {isHi ? 'सत्यापित डॉक्टर' : 'Verified Doctors'}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={() => onPress(hospital)}
          activeOpacity={0.85}
          style={{
            height: 40,
            borderRadius: 12,
            backgroundColor: '#2563EB',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            marginTop: 12,
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
            {c.viewDoctorsCta}
          </Text>
          <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
