// components/launch/LangToggle.tsx
// Small EN | हि switch for the top of the walkthrough and login screens.
// Renders nothing if your LanguageContext does not expose a setter (so it never breaks the screen).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLanguage } from '../../src/context/LanguageContext';

export function LangToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const ctx: any = useLanguage();
  const language: string = ctx?.language ?? 'en';
  const setLanguage: ((l: string) => void) | undefined =
    typeof ctx?.setLanguage === 'function' ? ctx.setLanguage : undefined;
  if (!setLanguage) return null;

  const onLight = tone === 'light'; // light = used on a dark/gradient background
  const track = onLight ? 'rgba(255,255,255,0.18)' : '#E9EEF6';
  const activeBg = onLight ? '#FFFFFF' : '#FFFFFF';
  const activeFg = '#1D4ED8';
  const idleFg = onLight ? 'rgba(255,255,255,0.85)' : '#5B6B82';

  const opts = [
    { id: 'en', label: 'EN' },
    { id: 'hi', label: 'हि' },
  ];

  return (
    <View style={{ flexDirection: 'row', backgroundColor: track, borderRadius: 999, padding: 3 }}>
      {opts.map((o) => {
        const active = language === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              setLanguage(o.id);
            }}
            hitSlop={6}
            accessibilityLabel={o.id === 'en' ? 'English' : 'हिंदी'}
            style={{
              minWidth: 40,
              height: 34,
              paddingHorizontal: 12,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? activeBg : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: active ? activeFg : idleFg }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
