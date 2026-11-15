import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar as RNStatusBar, Platform, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { FamilyProvider } from '../src/context/FamilyContext';
import { LocationProvider } from '../src/context/LocationContext';
import { LocationPickerModal } from '../components/ui/LocationPickerModal';

// Lock font scaling globally so device accessibility font sizes never break or distort UI layout
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.allowFontScaling = false;
(Text as any).defaultProps.maxFontSizeMultiplier = 1.0;

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.allowFontScaling = false;
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.0;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

const injectFocusOutlineReset = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const styleId = 'disable-input-outline-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Remove browser focus outline (blue/black/orange box) on all inputs */
        input, textarea, select, [contenteditable="true"] {
          outline: none !important;
          outline-style: none !important;
          outline-width: 0 !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        input:focus, textarea:focus, select:focus,
        input:focus-visible, textarea:focus-visible, select:focus-visible,
        *:focus, *:focus-visible {
          outline: none !important;
          outline-style: none !important;
          outline-width: 0 !important;
          box-shadow: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
};

injectFocusOutlineReset();

export default function RootLayout() {
  useEffect(() => {
    injectFocusOutlineReset();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <FamilyProvider>
              <LocationProvider>
                <RNStatusBar
                barStyle="light-content"
                backgroundColor="#172554"
                translucent={false}
              />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: '#172554',
                  },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="welcome" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="login"
                  options={{
                    title: 'Sign In | Adityam Niramayaa',
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="search"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="branch-doctors"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="family"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="appointments"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="notifications"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="settings"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="admin"
                  options={{
                    title: 'Admin Console | Adityam Niramayaa',
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="partner"
                  options={{
                    title: 'Partner Portal | Adityam Niramayaa',
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="+not-found"
                  options={{
                    title: 'Oops! Page Not Found',
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="404"
                  options={{
                    title: '404 · Page Not Found',
                    headerShown: false,
                  }}
                />
              </Stack>
              {/* Global Swiggy-Style Location & Address Modal */}
              <LocationPickerModal />
            </LocationProvider>
          </FamilyProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
