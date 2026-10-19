import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

interface AppSearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onPress?: () => void;
  onSubmit?: () => void;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  rightAction?: React.ReactNode;
  autoFocus?: boolean;
}

export function AppSearchBar({
  value = '',
  onChangeText,
  placeholder = 'Search doctor, test, medicine or hospital...',
  onClear,
  onPress,
  onSubmit,
  editable = true,
  style,
  rightAction,
  autoFocus = false,
}: AppSearchBarProps) {
  const isPressableOnly = !!onPress;

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          paddingHorizontal: 16,
          height: 50,
          gap: 10,
          shadowColor: '#0B1B3F',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        },
        style,
      ]}
    >
      <Search size={18} color="#2563EB" strokeWidth={2.4} />

      {isPressableOnly ? (
        <Text
          style={{
            flex: 1,
            fontSize: 14.5,
            color: '#94A3B8',
            fontWeight: '500',
            paddingVertical: 0,
          }}
          numberOfLines={1}
        >
          {placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          editable={editable}
          autoFocus={autoFocus}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          style={{
            flex: 1,
            fontSize: 14.5,
            color: '#0F172A',
            fontWeight: '500',
            paddingVertical: 0,
          }}
        />
      )}

      {value.length > 0 && onClear ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} color="#64748B" strokeWidth={2.5} />
        </Pressable>
      ) : (
        rightAction || null
      )}
    </View>
  );

  if (isPressableOnly) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
