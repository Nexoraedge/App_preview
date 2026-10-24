// apps/mobile/components/home/HeroCarousel.tsx
// 158px Auto-Scrolling Hero Banner Carousel with 1:1 3D PNG Illustrations and Pagination Dots

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonBox } from '../ui/SkeletonBox';

const docHeroImg = require('../../assets/doc.png');
const labHeroImg = require('../../assets/lab.png');
const hospHeroImg = require('../../assets/hosp.png');

interface HeroCarouselProps {
  isHi: boolean;
  isLoading: boolean;
}

export function HeroCarousel({ isHi, isLoading }: HeroCarouselProps) {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const bannerWidth = width - 32;
  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const heroBanners = useMemo(
    () => [
      {
        id: 'b-opd',
        route: '/opd' as const,
        badge: isHi ? 'पार्टनर अस्पताल' : 'Partner Hospitals',
        title: isHi ? 'विशेषज्ञ डॉक्टर परामर्श' : 'Consult Top Specialists',
        sub: isHi ? 'समय पर इन-क्लिनिक अपॉइंटमेंट' : 'Priority in-clinic consultations',
        cta: isHi ? 'अपॉइंटमेंट लें ›' : 'Book Consult ›',
        colors: ['#1E3A8A', '#2563EB'] as const,
        image: docHeroImg,
      },
      {
        id: 'b-labs',
        route: '/labs' as const,
        badge: isHi ? 'NABL प्रमाणित लैब्स' : '100% NABL Labs',
        title: isHi ? 'सटीक व डिजिटल टेस्ट्स' : 'Accurate Diagnostic Tests',
        sub: isHi ? 'घर से मुफ़्त सैंपल व त्वरित रिपोर्ट' : 'Home sample pickup & fast reports',
        cta: isHi ? 'टेस्ट्स देखें ›' : 'Explore Tests ›',
        colors: ['#065F46', '#059669'] as const,
        image: labHeroImg,
      },
      {
        id: 'b-ipd',
        route: '/ipd' as const,
        badge: isHi ? 'अस्पताल देखभाल' : 'Hospital Care',
        title: isHi ? 'नियोजित अस्पताल भर्ती' : 'Planned Hospital Admissions',
        sub: isHi ? 'अनुभवी डॉक्टरों व केंद्रों का नेटवर्क' : 'Dedicated support across partner network',
        cta: isHi ? 'अस्पताल खोजें ›' : 'Find Hospitals ›',
        colors: ['#312E81', '#4F46E5'] as const,
        image: hospHeroImg,
      },
    ],
    [isHi]
  );

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
        }}
      >
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleBannerScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={{ width: bannerWidth, height: 158 }}
        >
          {heroBanners.map((banner) => (
            <TouchableOpacity
              key={banner.id}
              activeOpacity={0.92}
              onPress={() => router.push(banner.route)}
              style={{ width: bannerWidth, height: 158 }}
            >
              <LinearGradient
                colors={banner.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: '100%',
                  height: '100%',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Soft Ambient Radial Shine */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: -10,
                    bottom: -15,
                    width: 150,
                    height: 150,
                    borderRadius: 75,
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  }}
                />

                {/* 1:1 Transparent 3D Illustration */}
                <Image
                  source={banner.image}
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: 0,
                    width: 132,
                    height: 132,
                    zIndex: 1,
                  }}
                  resizeMode="contain"
                />

                {/* Left Content Column */}
                <View
                  style={{
                    flex: 1,
                    paddingRight: 104,
                    justifyContent: 'space-between',
                    zIndex: 2,
                  }}
                >
                  {/* Badge Pill */}
                  <View style={{ alignSelf: 'flex-start' }}>
                    <View
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.24)',
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
                  <View style={{ marginVertical: 4 }}>
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
                    <Text
                      numberOfLines={2}
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
                  </View>

                  {/* CTA Pill */}
                  <View style={{ alignSelf: 'flex-start' }}>
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 999,
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
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 8 }}>
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
