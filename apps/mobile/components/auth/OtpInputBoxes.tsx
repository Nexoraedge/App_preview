// apps/mobile/components/auth/OtpInputBoxes.tsx
// Modern 6-box individual OTP digit input cells with auto-advance and paste support

import React, { useRef, useEffect } from 'react';
import { View, TextInput, Pressable, Platform, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { C, R } from '../../src/theme';

interface OtpInputBoxesProps {
  value: string; // 6-digit string
  onChange: (value: string) => void;
  error?: boolean;
  onComplete?: (code: string) => void;
}

export function OtpInputBoxes({
  value,
  onChange,
  error,
  onComplete,
}: OtpInputBoxesProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleChangeText = (text: string, index: number) => {
    // If user pasted multi-digit text
    const cleanNumbers = text.replace(/\D/g, '');
    if (cleanNumbers.length > 1) {
      const newCode = cleanNumbers.slice(0, 6);
      onChange(newCode);
      const nextFocusIndex = Math.min(newCode.length, 5);
      inputRefs.current[nextFocusIndex]?.focus();
      if (newCode.length === 6 && onComplete) {
        onComplete(newCode);
      }
      return;
    }

    // Single digit input
    const char = cleanNumbers.slice(-1);
    const newArr = [...digits];
    newArr[index] = char;
    const newCode = newArr.join('');
    onChange(newCode);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.length === 6 && onComplete) {
      onComplete(newCode);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newArr = [...digits];
        newArr[index - 1] = '';
        onChange(newArr.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginVertical: 12,
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => {
        const val = digits[index] || '';
        const isFilled = !!val;
        const isCurrent = digits.findIndex((d) => !d) === index || (index === 5 && digits.length === 6);

        return (
          <Pressable
            key={index}
            onPress={() => inputRefs.current[index]?.focus()}
            style={{ flex: 1 }}
          >
            <View
              style={{
                height: 58,
                borderRadius: R.md,
                backgroundColor: isFilled ? '#EFF6FF' : '#FFFFFF',
                borderWidth: isCurrent ? 2 : 1.5,
                borderColor: error
                  ? C.danger
                  : isCurrent
                  ? C.brand
                  : isFilled
                  ? '#93C5FD'
                  : C.line,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: isCurrent ? C.brand : 'transparent',
                shadowOpacity: 0.15,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                value={val}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={6} // Allow paste up to 6
                selectTextOnFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                style={[
                  {
                    fontSize: 24,
                    fontWeight: '800',
                    color: C.ink,
                    textAlign: 'center',
                    width: '100%',
                    height: '100%',
                  },
                  Platform.OS === 'web' && ({ outline: 'none', outlineStyle: 'none' } as any),
                ]}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
