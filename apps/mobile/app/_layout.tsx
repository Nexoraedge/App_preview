import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/context/LanguageContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <RNStatusBar
              barStyle="dark-content"
              backgroundColor="transparent"
              translucent={true}
            />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#F7FBFA',
                },
              }}
            >
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
            </Stack>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
