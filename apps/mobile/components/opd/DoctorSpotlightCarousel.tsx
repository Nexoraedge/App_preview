// apps/mobile/components/opd/DoctorSpotlightCarousel.tsx
// Royal blue top specialists carousel extracted for modularity

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Heart, Check, Phone } from 'lucide-react-native';
import type { Doctor } from '@adityam/types';
import {
  translateDoctorName,
  translateSpecialty,
  translateQualification,
} from '../../src/utils/hindiDictionary';
import { getDoctorAvatar } from '../../src/utils/doctorAvatars';

export interface FlattenedDoctor extends Doctor {
  hospitalId: string;
  hospitalName: string;
  hospitalDiscount: number;
  hospitalFeatured: boolean;
  branchId?: string;
  branchName?: string;
  distanceKm: number;
}

interface DoctorSpotlightCarouselProps {
  topDoctors: FlattenedDoctor[];
  language: 'en' | 'hi';
  favorites: Record<string, boolean>;
  toggleFavorite: (id: string) => void;
  onBookDoctor: (doc: FlattenedDoctor, slot?: string, hospitalName?: string) => void;
  cardWidth: number;
}

export function DoctorSpotlightCarousel({
  topDoctors,
  language,
  favorites,
  toggleFavorite,
  onBookDoctor,
  cardWidth,
}: DoctorSpotlightCarouselProps) {
  if (!topDoctors || topDoctors.length === 0) return null;

  const isHi = language === 'hi';

  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '900',
            color: '#182F3B',
            letterSpacing: -0.3,
          }}
        >
          {isHi ? 'शीर्ष डॉक्टर' : 'Top Doctors'}
        </Text>
        {topDoctors.length > 1 && (
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
            {isHi ? 'खोजने के लिए स्वाइप करें' : 'Swipe to explore'}
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {topDoctors.map((doc, idx) => {
          const isFav = !!favorites[doc.id];
          const avatar = getDoctorAvatar(doc);

          return (
            <View
              key={`top-${doc.id}`}
              style={{
                width: cardWidth,
                marginRight: idx === topDoctors.length - 1 ? 0 : 12,
              }}
            >
              <LinearGradient
                colors={['#1E40AF', '#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 26,
                  padding: 14,
                  position: 'relative',
                  overflow: 'hidden',
                  shadowColor: '#1E40AF',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                  {/* Doctor Portrait with verified check badge (3:4 ratio) */}
                  <View style={{ width: 90, position: 'relative' }}>
                    <View
                      style={{
                        width: 90,
                        height: 118,
                        borderRadius: 16,
                        overflow: 'hidden',
                        backgroundColor: '#DBEAFE',
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
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 5,
                        right: 5,
                        backgroundColor: '#2563EB',
                        borderRadius: 10,
                        padding: 2.5,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                      }}
                    >
                      <Check size={8} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </View>

                  {/* Doctor Info, Frosted Credentials Box */}
                  <View
                    style={{
                      flex: 1,
                      paddingLeft: 12,
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      {/* Name & Favorite Button */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 4 }}>
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 15,
                              fontWeight: '900',
                              letterSpacing: -0.3,
                              lineHeight: 19,
                            }}
                            numberOfLines={2}
                          >
                            {translateDoctorName(doc.name, isHi)}
                          </Text>
                          <Text
                            style={{
                              color: '#DBEAFE',
                              fontSize: 12,
                              fontWeight: '600',
                              marginTop: 2,
                            }}
                          >
                            {translateSpecialty(doc.specialty, isHi)}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => toggleFavorite(doc.id)}
                          activeOpacity={0.7}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: -2,
                          }}
                        >
                          <Heart
                            size={13}
                            color={isFav ? '#EF4444' : '#FFFFFF'}
                            fill={isFav ? '#EF4444' : 'transparent'}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Star Rating */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <Star size={11} color="#FBBF24" fill="#FBBF24" />
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {doc.rating} ({doc.total_reviews}{' '}
                          {isHi ? 'समीक्षाएं' : 'reviews'})
                        </Text>
                      </View>

                      {/* Frosted Details Box (Credentials & Experience) */}
                      <View
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.16)',
                          borderRadius: 12,
                          paddingHorizontal: 9,
                          paddingVertical: 5.5,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.22)',
                          marginTop: 6,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            color: '#FFFFFF',
                            fontSize: 10.5,
                            fontWeight: '700',
                          }}
                        >
                          {translateQualification(doc.qualification, isHi)}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: '#DBEAFE',
                            fontSize: 10,
                            fontWeight: '700',
                            marginTop: 1.5,
                          }}
                        >
                          {doc.experience_years}{' '}
                          {isHi ? 'वर्ष अनुभव' : 'yrs experience'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action Row: Helpline Button + Book Appointment Pill */}
                <View
                  style={{
                    marginTop: 10,
                    paddingTop: 9,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255, 255, 255, 0.18)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL('tel:+9118008902424').catch(() => {})
                    }
                    activeOpacity={0.85}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.12,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    <Phone size={16} color="#2563EB" strokeWidth={2.5} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      onBookDoctor(doc, undefined, doc.hospitalName)
                    }
                    activeOpacity={0.88}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 5,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: '#1E40AF',
                        fontSize: 12.5,
                        fontWeight: '900',
                      }}
                    >
                      {isHi ? 'अपॉइंटमेंट लें' : 'Book Appointment'} · ₹
                      {doc.discounted_fee}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
