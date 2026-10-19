// src/config/brand.ts
// One place for the brand name, the splash colour and the route names used by the start-up flow.

export const BRAND = {
  name: 'Adityam Niramayaa',
};

export const ONBOARDING_KEY = 'onboarding_seen_v1';

// Must match the native splash background in app.json so the hand-off to the animated splash has no flash.
export const SPLASH_BG = '#172554';

// Login mode. While DLT / the SMS provider is not ready, keep demo = true: any valid number works and the OTP is demoOtp.
// Set demo = false to use Supabase phone OTP (signInWithOtp / verifyOtp).
export const AUTH = { demo: true, demoOtp: '123456' };

// Legal URLs
export const LEGAL = {
  terms: 'https://adityam.in/terms',
  privacy: 'https://adityam.in/privacy',
};

// Route names used by start-up flow
export const ROUTES = {
  welcome: '/welcome',
  login: '/login',
  home: '/(tabs)',
} as const;
