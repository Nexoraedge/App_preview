import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { FamilyProvider } from '../src/context/FamilyContext';

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
                  name="settings"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
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
            </FamilyProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
