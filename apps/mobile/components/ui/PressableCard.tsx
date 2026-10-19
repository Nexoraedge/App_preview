// components/ui/PressableCard.tsx
// Wraps any card: staggered fade-in on mount, spring scale on press, light haptic tap.
// Uses React Native built-in Animated for universal stability without Reanimated crashes.
import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, StyleProp, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  pressableStyle?: StyleProp<ViewStyle>;
  index?: number;
  label?: string;
};

export function PressableCard({ children, onPress, style, pressableStyle, index = 0, label }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: Math.min(index, 8) * 35,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: Math.min(index, 8) * 35,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View
      style={[
        {
          opacity,
          transform: [{ scale }, { translateY }],
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[{ width: '100%' }, pressableStyle]}
        onPressIn={() => {
          Animated.spring(scale, {
            toValue: 0.97,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }}
        onPress={() => {
          onPress?.();
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
