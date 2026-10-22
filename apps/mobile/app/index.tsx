// app/index.tsx
// The start-up gate. Shows the animated splash while checking onboarding and auth state:
//   first time          -> /welcome (walkthrough)
//   seen, signed out    -> /login
//   seen, signed in     -> /(tabs) (home)
import React, { useEffect, useState } from 'react';
import { View, Platform, Image as RNImage } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedSplash } from '../components/launch/AnimatedSplash';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { ONBOARDING_KEY, ROUTES, SPLASH_BG } from '../src/config/brand';

const muniBlessingImg = require('../assets/muni_aditya_blessing_aura.jpg');

// Preload sacred image immediately during app startup gate
const preloadMuniAsset = () => {
  try {
    const resolved = RNImage.resolveAssetSource(muniBlessingImg);
    if (resolved?.uri) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const img = new (window as any).Image();
        img.src = resolved.uri;
        if (typeof document !== 'undefined') {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = resolved.uri;
          document.head.appendChild(link);
        }
      } else {
        RNImage.prefetch(resolved.uri).catch(() => {});
      }
    }
  } catch {}
};

preloadMuniAsset();

const getInitialSeen = (): boolean | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const v = window.localStorage.getItem(ONBOARDING_KEY);
      if (v === '1') return true;
    } catch {}
  }
  return null;
};

export default function Gate() {
  const router = useRouter();
  const auth = useAuth();
  const { language } = useLanguage() as any;

  const [seen, setSeen] = useState<boolean | null>(getInitialSeen);

  useEffect(() => {
    // Immediately unlock native splash screen so it never gets stuck on Android/iOS
    SplashScreen.hideAsync().catch(() => {});

    let alive = true;
    // Failsafe timeout after 400ms: if AsyncStorage hasn't responded, continue anyway
    const fallback = setTimeout(() => {
      if (alive && seen === null) {
        setSeen(false);
      }
    }, 400);

    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => {
        if (alive) setSeen(v === '1');
      })
      .catch(() => {
        if (alive) setSeen(false);
      });

    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, []);

  const signedIn: boolean = Boolean(auth?.isLoggedIn ?? auth?.user);
  const ready = seen !== null;

  const go = () => {
    SplashScreen.hideAsync().catch(() => {});
    if (signedIn) router.replace(ROUTES.home as any);
    else if (!seen) router.replace(ROUTES.welcome as any);
    else router.replace(ROUTES.login as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
      <AnimatedSplash ready={ready} onFinish={go} language={language} />
    </View>
  );
}
