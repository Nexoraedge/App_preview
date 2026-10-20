import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Stethoscope, FlaskConical, Pill, Bed } from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';

// Single Tab Button with Uiverse glass styling and spring micro-motion
function UiverseTabItem({
  name,
  label,
  isFocused,
  onPress,
  onLongPress,
}: {
  name: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const iconColor = isFocused ? '#1E40AF' : 'rgba(255, 255, 255, 0.82)';

  const renderIcon = () => {
    switch (name) {
      case 'index':
        // Heroicons 24/solid Home from Uiverse snippet
        return (
          <Svg viewBox="0 0 24 24" width={18} height={18} fill={iconColor}>
            <Path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
            <Path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
          </Svg>
        );
      case 'opd':
        return <Stethoscope size={18} color={iconColor} strokeWidth={isFocused ? 2.5 : 1.9} />;
      case 'labs':
        return <FlaskConical size={18} color={iconColor} strokeWidth={isFocused ? 2.5 : 1.9} />;
      case 'pharmacy':
        return <Pill size={18} color={iconColor} strokeWidth={isFocused ? 2.5 : 1.9} />;
      case 'ipd':
        return <Bed size={18} color={iconColor} strokeWidth={isFocused ? 2.5 : 1.9} />;
      default:
        return null;
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        onPress();
      }}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      style={{
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 5,
          paddingHorizontal: 2,
          borderRadius: 999,
          backgroundColor: 'transparent',
        }}
      >
        {renderIcon()}
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10.5,
            fontWeight: isFocused ? '700' : '600',
            color: isFocused ? '#1E40AF' : 'rgba(255, 255, 255, 0.82)',
            marginTop: 2,
            lineHeight: 12,
            letterSpacing: 0.1,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const ALLOWED_TABS = ['index', 'opd', 'labs', 'pharmacy', 'ipd'];

// Uiverse-inspired Floating Glass Capsule Bottom Navigation Bar with Smooth Sliding Pill Indicator
function UiverseBottomNav({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const getTabLabel = (name: string, defaultTitle?: string) => {
    switch (name) {
      case 'index':
        return t.tabHome || 'Home';
      case 'opd':
        return t.tabOpd || 'OPD';
      case 'labs':
        return t.tabLabs || 'Labs';
      case 'pharmacy':
        return t.tabPharmacy || 'Pharmacy';
      case 'ipd':
        return t.tabIpd || 'IPD';
      default:
        return defaultTitle || name;
    }
  };

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 10);

  // Filter strictly to the 5 primary tabs
  const visibleRoutes = state.routes.filter((route: any) =>
    ALLOWED_TABS.includes(route.name)
  );

  const currentRouteName = state.routes[state.index]?.name;

  // Never render bottom navigation bar on Profile page or non-tab routes
  if (currentRouteName === 'profile' || !ALLOWED_TABS.includes(currentRouteName)) {
    return null;
  }

  const activeIdx = Math.max(
    0,
    visibleRoutes.findIndex((r: any) => r.name === currentRouteName)
  );

  const navAnim = useRef(new Animated.Value(activeIdx)).current;
  const [navWidth, setNavWidth] = useState(
    Math.min(Dimensions.get('window').width * 0.94, 480)
  );

  useEffect(() => {
    Animated.spring(navAnim, {
      toValue: activeIdx,
      useNativeDriver: true,
      bounciness: 5,
      speed: 15,
    }).start();
  }, [activeIdx]);

  const numTabs = visibleRoutes.length || 5;
  const slotWidth = navWidth > 0 ? (navWidth - 12) / numTabs : 0;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: bottomInset,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setNavWidth(w);
        }}
        style={{
          width: '94%',
          maxWidth: 480,
          backgroundColor: 'rgba(30, 64, 175, 0.95)', // Adityam Royal Blue with glass translucency
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.22)',
          borderTopColor: 'rgba(255, 255, 255, 0.42)', // Glass rim specular highlight
          borderBottomColor: 'rgba(255, 255, 255, 0.15)',
          paddingVertical: 5,
          paddingHorizontal: 6,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 12,
        }}
      >
        {/* Smooth Sliding Active Pill Indicator */}
        {slotWidth > 0 && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 5,
              bottom: 5,
              left: 6,
              width: slotWidth,
              backgroundColor: '#FFFFFF',
              borderRadius: 999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.14,
              shadowRadius: 4,
              elevation: 3,
              zIndex: 0,
              transform: [
                {
                  translateX: navAnim.interpolate({
                    inputRange: [0, 1, 2, 3, 4],
                    outputRange: [
                      0,
                      slotWidth,
                      slotWidth * 2,
                      slotWidth * 3,
                      slotWidth * 4,
                    ],
                  }),
                },
              ],
            }}
          />
        )}

        {visibleRoutes.map((route: any) => {
          const { options } = descriptors[route.key] || {};
          const isFocused = currentRouteName === route.name;
          const label = getTabLabel(route.name, options?.title);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <UiverseTabItem
              key={route.key}
              name={route.name}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      tabBar={(props) => <UiverseBottomNav {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
        }}
      />
      <Tabs.Screen
        name="opd"
        options={{
          title: t.tabOpd,
        }}
      />
      <Tabs.Screen
        name="labs"
        options={{
          title: t.tabLabs,
        }}
      />
      <Tabs.Screen
        name="pharmacy"
        options={{
          title: t.tabPharmacy,
        }}
      />
      <Tabs.Screen
        name="ipd"
        options={{
          title: t.tabIpd,
        }}
      />

      {/* Hidden tabs - accessible via app links and profile button, but hidden from bottom nav */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Profile',
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
