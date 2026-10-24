// apps/mobile/components/opd/DoctorListItem.tsx
// Modular Doctor List Item for OPD directory

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Heart, Star, ChevronRight } from 'lucide-react-native';
import type { FlattenedDoctor } from './DoctorSpotlightCarousel';
import {
  translateDoctorName,
  translateHospitalName,
  translateBranchName,
  translateSpecialty,
  translateQualification,
} from '../../src/utils/hindiDictionary';
import { getDoctorAvatar } from '../../src/utils/doctorAvatars';

interface DoctorListItemProps {
  doc: FlattenedDoctor;
  isFav: boolean;
  language: 'en' | 'hi';
  toggleFavorite: (doctorId: string) => void;
  onBookDoctor: (doc: FlattenedDoctor, slot?: string, hospitalName?: string) => void;
  width?: number | string;
  marginBottom?: number;
}

export function DoctorListItem({
  doc,
  isFav,
  language,
  toggleFavorite,
  onBookDoctor,
  width = '100%',
  marginBottom = 16,
}: DoctorListItemProps) {
  const isHi = language === 'hi';
  const avatar = getDoctorAvatar(doc);

  return (
    <View
      style={{
        width: width as any,
        marginBottom,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        overflow: 'hidden',
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {/* Doctor Profile Info Row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View
          style={{
            width: 84,
            height: 108,
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: '#EFF6FF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          <Image
            source={avatar}
            style={{
              width: '100%',
              height: '100%',
            }}
            resizeMode="cover"
          />
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: '#0F172A',
                flex: 1,
                lineHeight: 20,
                marginRight: 4,
              }}
            >
              {translateDoctorName(doc.name, isHi)}
            </Text>

            <TouchableOpacity
              onPress={() => toggleFavorite(doc.id)}
              activeOpacity={0.7}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#F8FAFC',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -2,
                marginRight: -2,
              }}
            >
              <Heart
                size={14}
                color={isFav ? '#EF4444' : '#94A3B8'}
                fill={isFav ? '#EF4444' : 'transparent'}
              />
            </TouchableOpacity>
          </View>

          {/* Hospital & Branch with distance (2 lines, never truncated) */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#64748B',
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            {translateHospitalName(doc.hospitalName, isHi)}
            {doc.branchName
              ? ` • ${translateBranchName(doc.branchName, isHi)}`
              : ''}{' '}
            ({doc.distanceKm} {isHi ? 'किमी' : 'km'})
          </Text>

          {/* Specialty & Experience Line */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#2563EB',
              marginTop: 2,
            }}
          >
            {translateSpecialty(doc.specialty, isHi)} • {doc.experience_years}{' '}
            {isHi ? 'वर्ष अनुभव' : 'yrs exp'}
          </Text>

          {/* Qualification Line */}
          <Text
            style={{
              fontSize: 11,
              color: '#64748B',
              fontWeight: '500',
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            {translateQualification(doc.qualification, isHi)}
          </Text>

          {/* Star Rating Line */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
            }}
          >
            <Star size={11} color="#D97706" fill="#D97706" />
            <Text
              style={{ fontSize: 12, fontWeight: '900', color: '#1E293B' }}
            >
              {doc.rating}
            </Text>
            <Text
              style={{ fontSize: 10, color: '#64748B', fontWeight: '500' }}
            >
              ({doc.total_reviews} {isHi ? 'समीक्षा' : 'reviews'})
            </Text>
          </View>
        </View>
      </View>

      {/* Fee & Booking CTA */}
      <View
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
            <Text style={{ textDecorationLine: 'line-through' }}>
              ₹{doc.consultation_fee}
            </Text>
            {' · '}
            <Text style={{ color: '#16A34A', fontWeight: '900', fontSize: 14 }}>
              {isHi
                ? `ऐप में ₹${doc.discounted_fee}`
                : `Pay in app ₹${doc.discounted_fee}`}
            </Text>
          </Text>
          {doc.hospitalDiscount > 0 ? (
            <Text
              style={{
                fontSize: 10.5,
                color: '#2563EB',
                fontWeight: '700',
                marginTop: 2,
              }}
            >
              {isHi
                ? `${doc.hospitalDiscount}% छूट • इन-ऐप दर`
                : `Save ${doc.hospitalDiscount}% with in-app pay`}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => onBookDoctor(doc, undefined, doc.hospitalName)}
          activeOpacity={0.88}
          style={{
            backgroundColor: '#2563EB',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
            {isHi ? 'बुक करें' : 'Book'}
          </Text>
          <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
