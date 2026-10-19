import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, ViewStyle, StyleProp } from 'react-native';

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  index?: number;
}

export function PressableCard({ children, onPress, style, index = 0 }: PressableCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: Math.min(index * 50, 300),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: Math.min(index * 50, 300),
        bounciness: 6,
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
        onPressIn={() => {
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            bounciness: 4,
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

export default PressableCard;
