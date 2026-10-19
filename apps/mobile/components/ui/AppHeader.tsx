import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { MapPin, User, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onPressProfile?: () => void;
  onPressLocation?: () => void;
  rightAction?: React.ReactNode;
  subtitleRightAction?: React.ReactNode;
  children?: React.ReactNode; // e.g. Search bar or filters
  style?: StyleProp<ViewStyle>;
}

const CITIES = ['Saket, South Delhi NCR', 'Koramangala, Bengaluru', 'Malviya Nagar, Jaipur'];

export function AppHeader({
  title,
  subtitle = 'Saket, South Delhi NCR',
  onPressProfile,
  onPressLocation,
  rightAction,
  subtitleRightAction,
  children,
  style,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [cityIndex, setCityIndex] = useState(0);

  // Responsive font sizing: scales for fold outer screen (narrow 320-350px), standard (375-430px), duos & tablets (600px+)
  const titleFontSize = width < 360 ? 21 : width < 410 ? 24 : 26;
  const titleLineHeight = titleFontSize + 5;

  const handleLocationPress = () => {
    if (onPressLocation) {
      onPressLocation();
    } else {
      setCityIndex((prev) => (prev + 1) % CITIES.length);
    }
  };

  const displayLocation = subtitle !== 'South Delhi NCR · within 10 km' && subtitle
    ? subtitle
    : CITIES[cityIndex];

  return (
    <View
      style={[
        {
          backgroundColor: '#F8FAFC',
          paddingTop: Math.max(insets.top, 16) + 6,
          paddingHorizontal: width < 360 ? 12 : 16,
          paddingBottom: 10,
        },
        style,
      ]}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 600,
          alignSelf: 'center',
        }}
      >
        {/* Top Bar: Title (Left) + Profile Avatar & Right Action (Right) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Title - NEVER cut off with ellipsis! Wraps cleanly if needed */}
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text
              style={{
                fontSize: titleFontSize,
                lineHeight: titleLineHeight,
                fontWeight: '800',
                color: '#0B1220',
                letterSpacing: -0.4,
              }}
            >
              {title}
            </Text>
          </View>

          {/* Right Section: Action + Consistent Profile Avatar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {rightAction}

            {onPressProfile && (
              <TouchableOpacity
                onPress={onPressProfile}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open Profile and Settings"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#0B1B3F',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                  position: 'relative',
                }}
              >
                {/* 100% Consistent sleek User silhouette icon on all screens */}
                <User size={19} color="#2563EB" strokeWidth={2.4} />

                {/* Active online emerald status indicator */}
                <View
                  style={{
                    position: 'absolute',
                    top: 1,
                    right: 1,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#10B981',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Location Dropdown Capsule Pill Row (matching Homepage style) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <TouchableOpacity
            onPress={handleLocationPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Current location: ${displayLocation}. Tap to change city.`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#DBEAFE',
              paddingHorizontal: 9,
              paddingVertical: 3.5,
              borderRadius: 999,
              alignSelf: 'flex-start',
            }}
          >
            <MapPin size={11} color="#2563EB" strokeWidth={2.4} />
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: '#1E40AF',
              }}
            >
              {displayLocation}
            </Text>
            <ChevronDown size={11} color="#2563EB" strokeWidth={2.4} />
          </TouchableOpacity>

          {subtitleRightAction && (
            <View style={{ flexShrink: 0, marginLeft: 8 }}>
              {subtitleRightAction}
            </View>
          )}
        </View>

        {/* Children (Unified Search Bar & Segment Controls) */}
        {children && <View style={{ marginTop: 12 }}>{children}</View>}
      </View>
    </View>
  );
}
