import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';

const THEME = {
  surface: '#FFFFFF',
  border: '#E6E1D5',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  bg: '#FAF8F2',
};

export interface FormStepItem {
  id: number;
  title: string;
  subtitle: string;
}

interface FormStepBarProps {
  steps: FormStepItem[];
  currentStep: number;
  onSelectStep: (step: number) => void;
}

export function FormStepBar({ steps, currentStep, onSelectStep }: FormStepBarProps) {
  return (
    <View
      style={{
        backgroundColor: THEME.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: THEME.border,
        padding: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {steps.map((step) => {
        const isCurrent = currentStep === step.id;
        const isDone = currentStep > step.id;
        return (
          <TouchableOpacity
            key={step.id}
            onPress={() => onSelectStep(step.id)}
            style={{
              flex: 1,
              minWidth: 150,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 10,
              borderRadius: 10,
              backgroundColor: isCurrent
                ? THEME.greenSoft
                : isDone
                  ? '#F4FAF7'
                  : THEME.bg,
              borderWidth: 1,
              borderColor: isCurrent
                ? THEME.green
                : isDone
                  ? THEME.greenBorder
                  : THEME.border,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 99,
                backgroundColor: isCurrent || isDone ? THEME.green : THEME.surface,
                borderWidth: 1,
                borderColor: isCurrent || isDone ? THEME.green : THEME.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDone ? (
                <Check size={14} color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isCurrent ? '#FFFFFF' : THEME.muted,
                  }}
                >
                  {step.id}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12.5,
                  fontWeight: '800',
                  color: isCurrent ? THEME.green : THEME.ink,
                }}
              >
                {step.title}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 10.5, color: THEME.muted }}>
                {step.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
