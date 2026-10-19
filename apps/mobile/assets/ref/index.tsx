// app/index.tsx
// The start-up gate. Shows the animated splash while we check two things, then sends the user to the right place:
//   first time          -> /welcome (walkthrough)
//   seen, signed out    -> /login
//   seen, signed in     -> home tabs
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedSplash } from '../../components/launch/AnimatedSplash';
import { useAuth } from '../../src/context/AuthContext'; // TODO: your real auth hook path
import { useLanguage } from '../../src/context/LanguageContext';
import { ONBOARDING_KEY, ROUTES, SPLASH_BG } from '../../src/config/brand';

// Keep the native splash up until the animated one is drawn. Runs once when this file loads.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Gate() {
  const router = useRouter();
  const auth: any = useAuth();
  const { language } = useLanguage() as any;

  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => { if (alive) setSeen(v === '1'); })
      .catch(() => { if (alive) setSeen(false); });
    return () => { alive = false; };
  }, []);

  const authLoading: boolean = Boolean(auth?.isLoading ?? auth?.loading ?? false);
  const signedIn: boolean = Boolean(auth?.session ?? auth?.user);
  const ready = seen !== null && !authLoading;

  const go = () => {
    if (!seen) router.replace(ROUTES.welcome as any);
    else if (!signedIn) router.replace(ROUTES.login as any);
    else router.replace(ROUTES.home as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
      <AnimatedSplash ready={ready} onFinish={go} language={language} />
    </View>
  );
}
