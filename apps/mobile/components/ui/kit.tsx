import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { C, R, SHADOW } from '../../src/theme';

// Silent touch interaction feedback (haptics disabled across app)
export const tap = () => {
  // Intentionally no vibration to preserve premium feel
};

export function Chip({
  label,
  tone = 'plain',
  icon,
}: {
  label: string;
  tone?: 'plain' | 'good' | 'brand' | 'warn';
  icon?: React.ReactNode;
}) {
  const map = {
    plain: { bg: '#F1F5F9', fg: C.sub },
    good: { bg: C.goodSoft, fg: C.good },
    brand: { bg: C.brandSoft, fg: C.brand },
    warn: { bg: C.warnSoft, fg: C.warn },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: map.bg,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: R.pill,
      }}
    >
      {icon}
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: map.fg }}>{label}</Text>
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; icon?: React.ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#E9EEF6',
        borderRadius: R.pill,
        padding: 4,
      }}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            disabled={o.disabled}
            onPress={() => {
              tap();
              onChange(o.id);
            }}
            style={{
              flex: 1,
              height: 42,
              borderRadius: R.pill,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: o.disabled ? 0.4 : 1,
              backgroundColor: active ? '#FFFFFF' : 'transparent',
              ...(active ? SHADOW : {}),
            }}
          >
            {o.icon}
            <Text
              style={{
                fontSize: 14,
                fontWeight: active ? '700' : '500',
                color: active ? C.brand : C.sub,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'brand',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'brand' | 'good' | 'ghost' | 'danger';
}) {
  const bg = disabled
    ? '#CBD5E1'
    : { brand: C.brand, good: C.good, ghost: '#F1F5F9', danger: C.dangerSoft }[tone];
  const fg = disabled
    ? '#FFFFFF'
    : { brand: '#FFFFFF', good: '#FFFFFF', ghost: C.ink, danger: C.danger }[tone];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        height: 52,
        borderRadius: R.lg,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        shadowColor: tone === 'brand' ? '#1E40AF' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: disabled ? 0 : 0.12,
        shadowRadius: 4,
        elevation: disabled ? 0 : 2,
      }}
    >
      <Text style={{ color: fg, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function SheetFrame({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
        {/* Full-screen backdrop touch area to dismiss */}
        <Pressable
          onPress={onClose}
          style={{ flex: 1 }}
          accessibilityLabel="Dismiss sheet"
        />

        {/* Anchored bottom surface that seamlessly extends to bottom screen edge */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: Math.min(windowHeight * 0.9, 780),
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.18,
            shadowRadius: 20,
            elevation: 25,
            paddingBottom: Math.max(insets.bottom, 14),
          }}
        >
          {/* Top Drag Indicator Handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View
              style={{
                width: 42,
                height: 4.5,
                borderRadius: 2.5,
                backgroundColor: '#CBD5E1',
              }}
            />
          </View>

          {/* Optional Sheet Header Bar with Title and Close Button */}
          {title ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 4,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <Text
                style={{
                  fontSize: 18.5,
                  fontWeight: '800',
                  color: C.ink,
                  letterSpacing: -0.3,
                }}
              >
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityLabel="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F1F5F9',
                }}
              >
                <X size={17} color="#64748B" strokeWidth={2.5} />
              </Pressable>
            </View>
          ) : null}

          {/* Sheet Body */}
          {children}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
