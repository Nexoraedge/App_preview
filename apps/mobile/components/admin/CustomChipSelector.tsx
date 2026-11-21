import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Plus } from 'lucide-react-native';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
};

interface CustomChipSelectorProps {
  title: string;
  subtitle?: string;
  presets: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function CustomChipSelector({
  title,
  subtitle,
  presets,
  selected,
  onChange,
  placeholder = 'Add custom item...',
}: CustomChipSelectorProps) {
  const [customText, setCustomText] = useState('');

  // Merge presets + any custom items already in `selected` so custom chips stay visible
  const allOptions = Array.from(new Set([...presets, ...selected]));

  const toggleItem = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((x) => x !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const handleAddCustom = () => {
    const clean = customText.trim();
    if (!clean) return;
    if (!selected.includes(clean)) {
      onChange([...selected, clean]);
    }
    setCustomText('');
  };

  return (
    <View style={{ gap: 8 }}>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {allOptions.map((item) => {
          const active = selected.includes(item);
          return (
            <TouchableOpacity
              key={item}
              onPress={() => toggleItem(item)}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: active ? THEME.greenSoft : THEME.bg,
                borderWidth: 1,
                borderColor: active ? THEME.green : THEME.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: active ? '700' : '600',
                  color: active ? THEME.green : THEME.muted,
                }}
              >
                {active ? `✓ ${item}` : item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
        <TextInput
          value={customText}
          onChangeText={setCustomText}
          onSubmitEditing={handleAddCustom}
          placeholder={placeholder}
          placeholderTextColor={THEME.muted}
          style={{
            flex: 1,
            backgroundColor: THEME.bg,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 9,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 12.5,
            color: THEME.ink,
          }}
        />
        <TouchableOpacity
          onPress={handleAddCustom}
          style={{
            paddingHorizontal: 13,
            borderRadius: 9,
            backgroundColor: THEME.greenSoft,
            borderWidth: 1,
            borderColor: THEME.greenBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Plus size={14} color={THEME.green} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
