// apps/mobile/components/home/HeroCarousel.tsx
// Exact 1:1 Modular Hero Banners with User-Specified Graphics & Brand Gradients:
// 1. Royal Blue: Consult Top Specialists (Doctor with Stethoscope)
// 2. Emerald Green: NABL Certified Labs & Diagnostics (Microscope + Report)
// 3. Royal Purple-Violet: Planned Hospital Care & Surgery (Hospital Building)

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
  ImageStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonBox } from '../ui/SkeletonBox';

// User-specified banner assets
const doctorImage = require('../../assets/banner_doctor.png');
const labImage = require('../../assets/banner_lab.png');
const hospitalImage = require('../../assets/banner_hospital.png');

interface BannerItem {
  id: string;
  route: '/opd' | '/labs' | '/ipd' | '/pharmacy';
  badge: string;
  title: string;
  sub: string;
  cta: string;
  colors: readonly [string, string];
  image: ImageSourcePropType;
  imageStyle?: ImageStyle;
}

interface HeroCarouselProps {
  isHi: boolean;
  isLoading: boolean;
}

export function HeroCarousel({ isHi, isLoading }: HeroCarouselProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width, 640);
  const bannerWidth = containerWidth - 32;
  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const heroBanners: BannerItem[] = useMemo(
    () => [
      // 1. ROYAL BLUE: Consult Top Specialists (Doctor)
      {
        id: 'b-opd',
        route: '/opd',
        badge: isHi ? 'शीर्ष क्लिनिक' : 'Top Clinics',
        title: isHi
          ? 'विशेषज्ञ डॉक्टर परामर्श'
          : 'Consult Top Specialists',
        sub: isHi
          ? 'समय पर इन-क्लिनिक अपॉइंटमेंट'
          : 'Priority in-clinic consultations',
        cta: isHi ? 'अपॉइंटमेंट लें ›' : 'Book Consult ›',
        colors: ['#0F2B5C', '#1E4DB7'] as const,
        image: doctorImage,
        imageStyle: {
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 140,
          height: 154,
        },
      },
      // 2. EMERALD GREEN: Labs & Diagnostics (Microscope + NABL Report)
      {
        id: 'b-labs',
        route: '/labs',
        badge: isHi ? 'NABL प्रमाणित' : 'NABL Certified',
        title: isHi
          ? 'NABL प्रमाणित लैब टेस्ट्स'
          : 'Lab Tests at NABL-Certified Centres',
        sub: isHi
          ? 'घर से मुफ़्त सैंपल संग्रह उपलब्ध'
          : 'Home sample pickup available',
        cta: isHi ? 'बुक करें ›' : 'Book Now ›',
        colors: ['#064E3B', '#059669'] as const,
        image: labImage,
        imageStyle: {
          position: 'absolute',
          right: 4,
          bottom: 6,
          width: 140,
          height: 138,
        },
      },
      // 3. ROYAL PURPLE-VIOLET: Hospital Care & Surgery (Hospital Building)
      {
        id: 'b-ipd',
        route: '/ipd',
        badge: isHi ? 'शीर्ष अस्पताल' : 'Top Hospitals',
        title: isHi
          ? 'नियोजित अस्पताल भर्ती व सर्जरी'
          : 'Planned Hospital Care & Surgery',
        sub: isHi
          ? 'समर्पित सहायता व कैशलेस एडमिशन'
          : 'Cashless admission & priority care',
        cta: isHi ? 'अस्पताल देखें ›' : 'Explore Care ›',
        colors: ['#4C1D95', '#7C3AED'] as const,
        image: hospitalImage,
        imageStyle: {
          position: 'absolute',
          right: 4,
          bottom: 6,
          width: 138,
          height: 138,
        },
      },
    ],
    [isHi]
  );

  // Keep scroll aligned on window resize
  useEffect(() => {
    bannerScrollRef.current?.scrollTo({
      x: activeBannerIndex * bannerWidth,
      animated: false,
    });
  }, [bannerWidth]);

  // Auto-scroll every 5.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % heroBanners.length;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * bannerWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [bannerWidth, heroBanners.length]);

  const handleBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / bannerWidth);
    if (slideIndex >= 0 && slideIndex < heroBanners.length && slideIndex !== activeBannerIndex) {
      setActiveBannerIndex(slideIndex);
    }
  };

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <SkeletonBox width={bannerWidth} height={158} borderRadius={24} />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
      <View
        style={{
          width: bannerWidth,
          height: 158,
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#1E293B',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 4,
          backgroundColor: '#0F2B5C',
        }}
      >
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          snapToInterval={bannerWidth}
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleBannerScroll}
          scrollEventThrottle={16}
          style={{ width: bannerWidth, height: 158 }}
          contentContainerStyle={{ width: bannerWidth * heroBanners.length }}
        >
          {heroBanners.map((banner) => (
            <TouchableOpacity
              key={banner.id}
              activeOpacity={0.92}
              onPress={() => router.push(banner.route)}
              style={{
                width: bannerWidth,
                height: 158,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={banner.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: '100%',
                  height: '100%',
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  position: 'relative',
                  overflow: 'hidden',
                  justifyContent: 'space-between',
                }}
              >
                {/* Circular Halo Backdrop behind Graphic */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: 6,
                    bottom: -15,
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  }}
                />

                {/* Banner Illustration */}
                <Image
                  source={banner.image}
                  style={[
                    {
                      position: 'absolute',
                      right: 2,
                      bottom: 0,
                      width: 135,
                      height: 145,
                      zIndex: 1,
                    },
                    banner.imageStyle,
                  ]}
                  resizeMode="contain"
                />

                {/* Left Content Column */}
                <View
                  style={{
                    flex: 1,
                    paddingRight: 122,
                    justifyContent: 'space-between',
                    zIndex: 2,
                  }}
                >
                  {/* Badge Pill */}
                  <View style={{ alignSelf: 'flex-start' }}>
                    <View
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.22)',
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                        {banner.badge}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Subtitle */}
                  <View style={{ marginVertical: 2 }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '900',
                        lineHeight: 20,
                        letterSpacing: -0.2,
                      }}
                    >
                      {banner.title}
                    </Text>
                    {!!banner.sub && (
                      <Text
                        numberOfLines={1}
                        style={{
                          color: 'rgba(255, 255, 255, 0.88)',
                          fontSize: 11,
                          fontWeight: '500',
                          marginTop: 2,
                          lineHeight: 14,
                        }}
                      >
                        {banner.sub}
                      </Text>
                    )}
                  </View>

                  {/* CTA Pill */}
                  <View style={{ alignSelf: 'flex-start' }}>
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 12,
                        paddingVertical: 4.5,
                        borderRadius: 999,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.15,
                        shadowRadius: 3,
                        elevation: 2,
                      }}
                    >
                      <Text style={{ color: banner.colors[0], fontSize: 11, fontWeight: '900' }}>
                        {banner.cta}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Pagination Dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
        }}
      >
        {heroBanners.map((_, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => {
              bannerScrollRef.current?.scrollTo({ x: idx * bannerWidth, animated: true });
              setActiveBannerIndex(idx);
            }}
            activeOpacity={0.7}
            style={{
              width: activeBannerIndex === idx ? 18 : 6,
              height: 5,
              borderRadius: 3,
              backgroundColor: activeBannerIndex === idx ? '#2563EB' : '#DBEAFE',
            }}
          />
        ))}
      </View>
    </View>
  );
}
