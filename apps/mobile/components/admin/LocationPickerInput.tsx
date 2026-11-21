import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { CheckCircle2, ExternalLink, Link2, LocateFixed, MapPin, Search } from 'lucide-react-native';

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

interface LocationPickerInputProps {
  address: string;
  city: string;
  pincode: string;
  lat: string;
  lng: string;
  onChangeCoords: (lat: string, lng: string) => void;
  onFillAddressMeta?: (meta: { city?: string; state?: string; pincode?: string; address?: string }) => void;
}

/**
 * Extract latitude & longitude from standard Google Maps URLs:
 * - .../@26.9124,75.7873,17z
 * - ...?q=26.9124,75.7873
 * - ...?ll=26.9124,75.7873
 * - ...!3d26.9124!4d75.7873
 */
function parseGoogleMapsCoords(url: string): { lat: string; lng: string } | null {
  const raw = url.trim();
  if (!raw) return null;

  const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };

  const dMatch = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) return { lat: dMatch[1], lng: dMatch[2] };

  const qMatch = raw.match(/[?&](?:q|ll|center)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };

  const plainPair = raw.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (plainPair) return { lat: plainPair[1], lng: plainPair[2] };

  return null;
}

export function LocationPickerInput({
  address,
  city,
  pincode,
  lat,
  lng,
  onChangeCoords,
  onFillAddressMeta,
}: LocationPickerInputProps) {
  const [mapsLink, setMapsLink] = useState('');
  const [busy, setBusy] = useState<'gps' | 'geocode' | null>(null);
  const [showManual, setShowManual] = useState(false);

  const hasCoords = Boolean(lat.trim() && lng.trim() && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)));

  const handleMapsLinkChange = (txt: string) => {
    setMapsLink(txt);
    const parsed = parseGoogleMapsCoords(txt);
    if (parsed) {
      onChangeCoords(parsed.lat, parsed.lng);
    }
  };

  const handleFindFromAddress = async () => {
    const cleanAddr = address.trim();
    const cleanCity = city.trim();
    const cleanPin = pincode.trim();
    if (!cleanAddr && !cleanCity && !cleanPin) {
      Alert.alert('Address Needed', 'Please enter the street address, city, or pincode first.');
      return;
    }

    // Build progressive fallback queries because Nominatim often fails on house/gali numbers
    const addrParts = cleanAddr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const candidates: string[] = [];
    if (cleanAddr) {
      candidates.push([cleanAddr, cleanCity, cleanPin, 'India'].filter(Boolean).join(', '));
    }
    if (addrParts.length > 2) {
      candidates.push([addrParts.slice(1).join(', '), cleanCity, cleanPin, 'India'].filter(Boolean).join(', '));
      candidates.push([addrParts.slice(2).join(', '), cleanCity, cleanPin, 'India'].filter(Boolean).join(', '));
    }
    if (cleanCity && cleanPin) {
      candidates.push(`${cleanCity}, ${cleanPin}, India`);
    }
    if (cleanCity) {
      candidates.push(`${cleanCity}, India`);
    }

    setBusy('geocode');
    try {
      let hit: {
        lat: string;
        lon: string;
        address?: { city?: string; town?: string; state?: string; postcode?: string };
      } | null = null;
      let matchedIndex = 0;

      for (let i = 0; i < candidates.length; i++) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(candidates[i])}`,
          { headers: { Accept: 'application/json' } }
        );
        const data = (await res.json()) as Array<{
          lat: string;
          lon: string;
          address?: { city?: string; town?: string; state?: string; postcode?: string };
        }>;
        if (data?.length) {
          hit = data[0];
          matchedIndex = i;
          break;
        }
      }

      if (!hit) {
        Alert.alert(
          'Location Not Found',
          'Could not pinpoint that address automatically. Please paste a Google Maps link or use Current GPS.'
        );
        return;
      }
      onChangeCoords(Number(hit.lat).toFixed(6), Number(hit.lon).toFixed(6));
      if (onFillAddressMeta && hit.address) {
        onFillAddressMeta({
          city: hit.address.city || hit.address.town,
          state: hit.address.state,
          pincode: hit.address.postcode,
        });
      }
      if (matchedIndex > 0) {
        Alert.alert(
          'Approximate Area Pinned',
          'Exact house/gali number was not found in OpenStreetMap, so we pinned the nearest locality/city. Please click "Verify on Maps" or paste a Google Maps link for exact entrance accuracy.'
        );
      }
    } catch {
      Alert.alert('Lookup Failed', 'Could not look up address right now. Please paste a Google Maps link or use GPS.');
    } finally {
      setBusy(null);
    }
  };

  const handleDetectGps = async () => {
    setBusy('gps');
    try {
      let latitude = 0;
      let longitude = 0;

      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          Alert.alert('GPS Unavailable', 'Browser geolocation is not available.');
          return;
        }
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } else {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow location access to detect your GPS coordinates.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      onChangeCoords(latitude.toFixed(6), longitude.toFixed(6));

      if (onFillAddressMeta) {
        try {
          const rev = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: 'application/json' } }
          );
          const revJson = (await rev.json()) as {
            display_name?: string;
            address?: { city?: string; town?: string; state?: string; postcode?: string };
          };
          if (revJson?.address) {
            onFillAddressMeta({
              city: revJson.address.city || revJson.address.town,
              state: revJson.address.state,
              pincode: revJson.address.postcode,
              address: revJson.display_name,
            });
          }
        } catch {
          // Reverse geocode optional
        }
      }
    } catch {
      Alert.alert('GPS Error', 'Could not detect current GPS location. Try pasting a Google Maps link.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View
      style={{
        backgroundColor: THEME.bg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: THEME.border,
        padding: 13,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPin size={15} color={THEME.green} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
            Pin Exact Map Location (No manual coordinates needed)
          </Text>
        </View>
      </View>

      {/* 1. Google Maps Link */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Link2 size={13} color={THEME.muted} />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
            Paste Google Maps URL (auto-detects pin)
          </Text>
        </View>
        <TextInput
          value={mapsLink}
          onChangeText={handleMapsLinkChange}
          placeholder="https://www.google.com/maps/place/.../@26.9124,75.7873..."
          placeholderTextColor={THEME.muted}
          style={{
            backgroundColor: THEME.surface,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 9,
            paddingHorizontal: 11,
            paddingVertical: 9,
            fontSize: 12.5,
            color: THEME.ink,
          }}
        />
      </View>

      {/* 2. Quick Action Buttons */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <TouchableOpacity
          onPress={() => void handleFindFromAddress()}
          disabled={busy !== null}
          style={{
            flex: 1,
            minWidth: 165,
            backgroundColor: THEME.surface,
            borderWidth: 1,
            borderColor: THEME.greenBorder,
            borderRadius: 9,
            paddingHorizontal: 12,
            paddingVertical: 9,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {busy === 'geocode' ? (
            <ActivityIndicator size="small" color={THEME.green} />
          ) : (
            <Search size={14} color={THEME.green} />
          )}
          <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
            Find from Written Address
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleDetectGps()}
          disabled={busy !== null}
          style={{
            flex: 1,
            minWidth: 155,
            backgroundColor: THEME.greenSoft,
            borderWidth: 1,
            borderColor: THEME.greenBorder,
            borderRadius: 9,
            paddingHorizontal: 12,
            paddingVertical: 9,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {busy === 'gps' ? (
            <ActivityIndicator size="small" color={THEME.green} />
          ) : (
            <LocateFixed size={14} color={THEME.green} />
          )}
          <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
            Use Current GPS
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Status + Verify on Map */}
      {hasCoords ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            backgroundColor: THEME.greenSoft,
            borderRadius: 9,
            paddingHorizontal: 11,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: THEME.greenBorder,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} color={THEME.green} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
              Location Pinned ({Number(lat).toFixed(4)}, {Number(lng).toFixed(4)})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => void Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.green }}>
              Verify on Maps
            </Text>
            <ExternalLink size={12} color={THEME.green} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={{ fontSize: 11.5, color: THEME.muted }}>
          No map pin yet — paste a Google Maps link or click &quot;Find from Written Address&quot; / &quot;Use Current GPS&quot;.
        </Text>
      )}

      {/* Optional Manual Override */}
      <TouchableOpacity onPress={() => setShowManual((v) => !v)} style={{ alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
          {showManual ? 'Hide manual coordinates ▴' : 'Enter coordinates manually (optional) ▾'}
        </Text>
      </TouchableOpacity>

      {showManual && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>Latitude</Text>
            <TextInput
              value={lat}
              onChangeText={(v) => onChangeCoords(v, lng)}
              placeholder="e.g. 26.9124"
              keyboardType="numeric"
              style={{
                backgroundColor: THEME.surface,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 12.5,
                color: THEME.ink,
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>Longitude</Text>
            <TextInput
              value={lng}
              onChangeText={(v) => onChangeCoords(lat, v)}
              placeholder="e.g. 75.7873"
              keyboardType="numeric"
              style={{
                backgroundColor: THEME.surface,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 12.5,
                color: THEME.ink,
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
