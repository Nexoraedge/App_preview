import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

export interface DropdownOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SelectDropdownProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

const COLORS = {
  creamBg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  ink: '#14362B',
  muted: '#6B7D74',
  greenPrimary: '#1B5E43',
  greenSoft: '#EBF4EE',
};

export function SelectDropdown({
  label,
  placeholder = 'Select an option...',
  value,
  options,
  onChange,
  disabled = false,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((opt) => opt.value === value);

  return (
    <View style={{ gap: 5 }}>
      {Boolean(label) && (
        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>{label}</Text>
      )}

      <TouchableOpacity
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: disabled ? '#F2EFE7' : COLORS.creamBg,
          borderRadius: 10,
          paddingHorizontal: 13,
          paddingVertical: 11,
          borderWidth: 1,
          borderColor: open ? COLORS.greenPrimary : COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          opacity: disabled ? 0.65 : 1,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontWeight: selected ? '700' : '500',
              color: selected ? COLORS.ink : COLORS.muted,
            }}
          >
            {selected ? selected.label : placeholder}
          </Text>
          {Boolean(selected?.subtitle) && (
            <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>
              {selected?.subtitle}
            </Text>
          )}
        </View>
        <ChevronDown size={16} color={COLORS.muted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.32)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 460,
              maxHeight: '72%',
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.14,
              shadowRadius: 18,
              elevation: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
                backgroundColor: COLORS.creamBg,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.ink }}>
                {label || 'Select Option'}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.muted }}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ padding: 8, gap: 4 }}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 9,
                      backgroundColor: isSelected ? COLORS.greenSoft : 'transparent',
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.greenPrimary : 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? COLORS.greenPrimary : COLORS.ink,
                        }}
                      >
                        {opt.label}
                      </Text>
                      {Boolean(opt.subtitle) && (
                        <Text style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>
                          {opt.subtitle}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Check size={16} color={COLORS.greenPrimary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
