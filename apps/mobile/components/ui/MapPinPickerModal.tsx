// apps/mobile/components/ui/MapPinPickerModal.tsx
// Swiggy / Zepto / Uber Style Interactive Map Pin Location Picker
// Features: Real-time map pan & drag, center floating location pin with bounce,
// GPS "Locate Me" button, live coordinates reverse geocoding, and 1-tap address setting.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  Crosshair,
  MapPin,
  Search,
  Check,
  Building,
  Navigation,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useLocation, POPULAR_HUBS } from '../../src/context/LocationContext';
import { useLanguage } from '../../src/context/LanguageContext';

interface MapPinPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmLocation: (location: {
    name: string;
    city: string;
    landmark: string;
    pincode: string;
    latitude: number;
    longitude: number;
  }) => void;
}

// Key Landmarks across major hubs
const MAP_LANDMARKS = [
  // --- JAIPUR, RAJASTHAN ---
  { name: 'Surajpole Gate & Mohanbari', area: 'Surajpole, Mohanbari, Jaipur', lat: 26.9205, lng: 75.8450, pin: '302003' },
  { name: 'Hawa Mahal & Badi Chaupar', area: 'Pink City, Jaipur', lat: 26.9239, lng: 75.8267, pin: '302002' },
  { name: 'Ramganj Bazar & Ghat Gate', area: 'Ramganj, Jaipur', lat: 26.9242, lng: 75.8315, pin: '302002' },
  { name: 'M.I. Road & Panch Batti', area: 'Jaipur City Centre', lat: 26.9180, lng: 75.8130, pin: '302001' },
  { name: 'Chandpole & Chhoti Chaupar', area: 'Chandpole, Jaipur', lat: 26.9248, lng: 75.8140, pin: '302001' },
  { name: 'Albert Hall & Ram Niwas Bagh', area: 'Adarsh Nagar, Jaipur', lat: 26.9116, lng: 75.8195, pin: '302004' },
  { name: 'Gauri Temple & Sector 4', area: 'Malviya Nagar, Jaipur', lat: 26.8532, lng: 75.8175, pin: '302017' },
  { name: 'World Trade Park (WTP) & GT Mall', area: 'JLN Marg, Malviya Nagar, Jaipur', lat: 26.8540, lng: 75.8050, pin: '302017' },
  { name: 'SMS Hospital & Medical College', area: 'JLN Marg, Jaipur', lat: 26.9015, lng: 75.8160, pin: '302004' },
  { name: 'Vaishali Nagar & Amrapali Circle', area: 'West Jaipur', lat: 26.9044, lng: 75.7438, pin: '302021' },
  { name: 'Mansarovar & VT Road', area: 'Mansarovar, Jaipur', lat: 26.8580, lng: 75.7645, pin: '302020' },
  { name: 'C-Scheme & Statue Circle', area: 'C-Scheme, Jaipur', lat: 26.9077, lng: 75.8050, pin: '302001' },
  { name: 'Raja Park & LBS College', area: 'Raja Park, Jaipur', lat: 26.8967, lng: 75.8275, pin: '302004' },
  { name: 'Jagatpura & Bombay Hospital', area: 'Jagatpura, Jaipur', lat: 26.8188, lng: 75.8528, pin: '302017' },
  { name: 'Durgapura & Tonk Road', area: 'Durgapura, Jaipur', lat: 26.8525, lng: 75.7925, pin: '302018' },
  { name: 'Shyam Nagar & Janpath', area: 'Shyam Nagar, Jaipur', lat: 26.8940, lng: 75.7610, pin: '302019' },
  { name: 'Vidhyadhar Nagar Sector 2', area: 'Vidhyadhar Nagar, Jaipur', lat: 26.9645, lng: 75.7820, pin: '302039' },
  { name: 'Sitapura Industrial Area & RIICO', area: 'Sitapura, Jaipur', lat: 26.7788, lng: 75.8364, pin: '302022' },

  // --- DELHI NCR ---
  { name: 'Saket Metro Station', area: 'Saket, South Delhi', lat: 28.5244, lng: 77.2167, pin: '110017' },
  { name: 'Select CITYWALK Mall', area: 'Saket District Centre, New Delhi', lat: 28.5284, lng: 77.2195, pin: '110017' },
  { name: 'Max Super Speciality Hospital', area: '1, 2 Press Enclave Marg, Saket', lat: 28.5273, lng: 77.2123, pin: '110017' },
  { name: 'Connaught Place & Rajiv Chowk', area: 'Central Delhi', lat: 28.6328, lng: 77.2197, pin: '110001' },
  { name: 'AIIMS & Safdarjung Hospital', area: 'Ansari Nagar, New Delhi', lat: 28.5672, lng: 77.2100, pin: '110029' },
  { name: 'Hauz Khas Village & Market', area: 'Hauz Khas, South Delhi', lat: 28.5494, lng: 77.2001, pin: '110016' },

  // --- GURUGRAM & NOIDA ---
  { name: 'DLF CyberHub & Building 10', area: 'Cyber City, DLF Phase 2, Gurugram', lat: 28.4907, lng: 77.0949, pin: '122002' },
  { name: 'Fortis Memorial Research Institute', area: 'Sector 44, Gurugram', lat: 28.4595, lng: 77.0725, pin: '122002' },
  { name: 'Medanta - The Medicity', area: 'Sector 38, Gurugram', lat: 28.4398, lng: 77.0425, pin: '122001' },
  { name: 'Atta Market & Metro', area: 'Sector 18, Noida', lat: 28.5708, lng: 77.3260, pin: '201301' },
  { name: 'Sector 62 & Electronic City', area: 'Noida', lat: 28.6280, lng: 77.3650, pin: '201309' },

  // --- BENGALURU & MUMBAI ---
  { name: 'Sony World Signal', area: '80 Feet Rd, Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245, pin: '560034' },
  { name: 'Indiranagar 100 Feet Road', area: 'Indiranagar, Bengaluru', lat: 12.9719, lng: 77.6412, pin: '560038' },
  { name: 'HSR Layout Sector 1', area: 'HSR Layout, Bengaluru', lat: 12.9121, lng: 77.6446, pin: '560102' },
  { name: 'Lokhandwala Complex', area: 'Andheri West, Mumbai', lat: 19.1363, lng: 72.8277, pin: '400053' },
  { name: 'Bandra Bandstand & Linking Rd', area: 'Bandra West, Mumbai', lat: 19.0596, lng: 72.8295, pin: '400050' },
];

// High-speed regional zone & landmark resolver with zero coordinate leakage
function resolveRegionalArea(lat: number, lng: number): { title: string; full: string; pin: string; city: string } {
  let closestDist = Infinity;
  let closest = MAP_LANDMARKS[0];
  for (const lm of MAP_LANDMARKS) {
    const dist = Math.hypot(lm.lat - lat, lm.lng - lng);
    if (dist < closestDist) {
      closestDist = dist;
      closest = lm;
    }
  }

  // If very close to landmark (< 1.5 km)
  if (closestDist < 0.015) {
    const cityName = closest.area.includes('Jaipur') ? 'Jaipur' : closest.area.includes('Delhi') ? 'South Delhi NCR' : closest.area.includes('Gurugram') ? 'Gurugram' : closest.area.includes('Noida') ? 'Noida' : closest.area.includes('Bengaluru') ? 'Bengaluru' : 'Mumbai';
    return {
      title: closest.name,
      full: `${closest.area} - ${closest.pin}`,
      pin: closest.pin,
      city: cityName,
    };
  }

  // If within surrounding district (< 4.5 km)
  if (closestDist < 0.045) {
    const cityName = closest.area.includes('Jaipur') ? 'Jaipur' : closest.area.includes('Delhi') ? 'South Delhi NCR' : closest.area.includes('Gurugram') ? 'Gurugram' : closest.area.includes('Noida') ? 'Noida' : closest.area.includes('Bengaluru') ? 'Bengaluru' : 'Mumbai';
    return {
      title: `Near ${closest.name}`,
      full: `${closest.area} - ${closest.pin}`,
      pin: closest.pin,
      city: cityName,
    };
  }

  // Regional bounding boxes
  if (lat >= 26.6 && lat <= 27.2 && lng >= 75.4 && lng <= 76.2) {
    return {
      title: 'Jaipur Central Area',
      full: 'Near Jaipur City Centre, Rajasthan - 302001',
      pin: '302001',
      city: 'Jaipur',
    };
  }
  if (lat >= 28.3 && lat <= 28.9 && lng >= 76.8 && lng <= 77.6) {
    return {
      title: 'South Delhi & NCR Area',
      full: 'Delhi NCR Region - 110017',
      pin: '110017',
      city: 'South Delhi NCR',
    };
  }
  if (lat >= 12.7 && lat <= 13.2 && lng >= 77.3 && lng <= 77.9) {
    return {
      title: 'Bengaluru Metro Area',
      full: 'Koramangala & Greater Bengaluru, Karnataka - 560034',
      pin: '560034',
      city: 'Bengaluru',
    };
  }
  if (lat >= 18.8 && lat <= 19.4 && lng >= 72.6 && lng <= 73.1) {
    return {
      title: 'Mumbai Western Suburbs',
      full: 'Andheri & Suburban Mumbai, Maharashtra - 400053',
      pin: '400053',
      city: 'Mumbai',
    };
  }

  return {
    title: 'Marked Doorstep Location',
    full: 'Healthcare Service & Delivery Point - 302001',
    pin: '302001',
    city: 'Jaipur',
  };
}

export function MapPinPickerModal({
  visible,
  onClose,
  onConfirmLocation,
}: MapPinPickerModalProps) {
  const { coords: initialCoords, currentLocationName } = useLocation();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const defaultLat = initialCoords?.latitude || 26.8532;
  const defaultLng = initialCoords?.longitude || 75.8175;

  const [latitude, setLatitude] = useState(defaultLat);
  const [longitude, setLongitude] = useState(defaultLng);

  // Initial resolved title
  const initialResolved = resolveRegionalArea(defaultLat, defaultLng);
  const [areaTitle, setAreaTitle] = useState(
    currentLocationName && !currentLocationName.includes('Marked Location (')
      ? currentLocationName
      : initialResolved.title
  );
  const [fullAddress, setFullAddress] = useState(initialResolved.full);
  const [pincode, setPincode] = useState(initialResolved.pin);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isPinBouncing, setIsPinBouncing] = useState(false);

  const mapIframeRef = useRef<any>(null);
  const pinBounceAnim = useRef(new Animated.Value(0)).current;
  const nominatimTimer = useRef<any>(null);

  const triggerPinBounce = useCallback(() => {
    setIsPinBouncing(true);
    Animated.sequence([
      Animated.timing(pinBounceAnim, {
        toValue: -14,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(pinBounceAnim, {
        toValue: 0,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => setIsPinBouncing(false));
  }, [pinBounceAnim]);

  // Reverse geocode when coordinates change: Instant local resolver + Async Web enrichment
  const updateAddressForCoords = useCallback(
    (lat: number, lng: number) => {
      triggerPinBounce();
      setLatitude(lat);
      setLongitude(lng);

      // 1. Instant Zero-Latency Landmark & Zone Resolver
      const resolved = resolveRegionalArea(lat, lng);
      setAreaTitle(resolved.title);
      setFullAddress(resolved.full);
      setPincode(resolved.pin);

      // 2. Native Expo reverse geocode (on mobile devices)
      if (Platform.OS !== 'web') {
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
          .then(([result]) => {
            if (result) {
              const street = result.street || result.name || resolved.title;
              const dist = result.district || result.city || resolved.city;
              setAreaTitle(`${street}, ${dist}`);
              const detailed = `${result.formattedAddress || `${street}, ${dist}, ${result.region || ''} - ${result.postalCode || resolved.pin}`}`;
              setFullAddress(detailed);
              if (result.postalCode) setPincode(result.postalCode);
            }
          })
          .catch(() => {});
        return;
      }

      // 3. Web Nominatim Async Enrichment with 400ms debounce
      if (typeof fetch !== 'undefined') {
        clearTimeout(nominatimTimer.current);
        nominatimTimer.current = setTimeout(async () => {
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.address) {
                const addr = data.address;
                const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood;
                const city = addr.city || addr.town || addr.state_district || resolved.city;
                const state = addr.state || 'Rajasthan';
                const post = addr.postcode || resolved.pin;

                const cleanTitle = road ? `${road}, ${city}` : `${city}, ${state}`;
                const cleanFull = data.display_name
                  ? data.display_name.split(',').slice(0, 4).join(',') + ` - ${post}`
                  : `${cleanTitle} - ${post}`;

                setAreaTitle(cleanTitle);
                setFullAddress(cleanFull);
                setPincode(post);
              }
            }
          } catch {
            // Silently retain instant resolved area name
          }
        }, 400);
      }
    },
    [triggerPinBounce]
  );

  // Smoothly pan Leaflet map in iframe via postMessage
  const flyMapTo = useCallback(
    (lat: number, lng: number) => {
      updateAddressForCoords(lat, lng);
      if (Platform.OS === 'web' && mapIframeRef.current?.contentWindow) {
        try {
          mapIframeRef.current.contentWindow.postMessage(
            { type: 'SET_CENTER', lat, lng },
            '*'
          );
        } catch {}
      }
    },
    [updateAddressForCoords]
  );

  // Stable HTML document for Web Leaflet map (created once with initial coordinates)
  const mapHtmlDoc = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0F172A; }
          .leaflet-control-attribution { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${defaultLat}, ${defaultLng}], 16);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          var moveTimer = null;
          function emitMoved() {
            var center = map.getCenter();
            window.parent.postMessage({
              type: 'ADITYAM_MAP_MOVED',
              lat: center.lat,
              lng: center.lng
            }, '*');
          }

          // Smooth 60fps dragging: emit only on moveend and throttled move
          map.on('moveend', emitMoved);
          map.on('move', function() {
            clearTimeout(moveTimer);
            moveTimer = setTimeout(emitMoved, 300);
          });

          // Pan smoothly when parent sends SET_CENTER
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'SET_CENTER' && typeof e.data.lat === 'number' && typeof e.data.lng === 'number') {
              map.setView([e.data.lat, e.data.lng], map.getZoom() || 16, { animate: true });
            }
          });
        </script>
      </body>
      </html>
    `;
  }, [defaultLat, defaultLng]);

  // Listen to web Leaflet iframe postMessage if running on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebMsg = (e: MessageEvent) => {
        if (e.data?.type === 'ADITYAM_MAP_MOVED') {
          const { lat, lng } = e.data;
          if (typeof lat === 'number' && typeof lng === 'number') {
            updateAddressForCoords(lat, lng);
          }
        }
      };
      window.addEventListener('message', handleWebMsg);
      return () => window.removeEventListener('message', handleWebMsg);
    }
  }, [updateAddressForCoords]);

  // GPS Locate Me Handler
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 6000,
          });
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        flyMapTo(lat, lng);
        setIsLocating(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        flyMapTo(loc.coords.latitude, loc.coords.longitude);
        setIsLocating(false);
        return;
      }
    } catch (err) {
      console.warn('[MapPinPickerModal] GPS locate fallback:', err);
    }

    // Default to Jaipur / Saket
    flyMapTo(defaultLat, defaultLng);
    setIsLocating(false);
  };

  // Pan Responder for interactive manual drag on mobile
  const panOffset = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        triggerPinBounce();
      },
      onPanResponderMove: (_, gestureState) => {
        panOffset.current = { x: gestureState.dx, y: gestureState.dy };
      },
      onPanResponderRelease: (_, gestureState) => {
        const deltaLat = -gestureState.dy * 0.00018;
        const deltaLng = gestureState.dx * 0.00018;
        const newLat = Number((latitude + deltaLat).toFixed(5));
        const newLng = Number((longitude + deltaLng).toFixed(5));
        flyMapTo(newLat, newLng);
      },
    })
  ).current;

  // Search filter
  const searchResults = MAP_LANDMARKS.filter(
    (lm) =>
      searchQuery.trim().length > 1 &&
      (lm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lm.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lm.pin.includes(searchQuery))
  );

  const handleConfirm = () => {
    const finalCity = areaTitle.includes('Jaipur')
      ? 'Jaipur'
      : areaTitle.includes('Bengaluru')
      ? 'Bengaluru'
      : areaTitle.includes('Mumbai')
      ? 'Mumbai'
      : areaTitle.includes('Noida')
      ? 'Noida'
      : areaTitle.includes('Gurugram')
      ? 'Gurugram'
      : 'South Delhi NCR';

    onConfirmLocation({
      name: areaTitle,
      city: finalCity,
      landmark: fullAddress,
      pincode: pincode || '302001',
      latitude,
      longitude,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0B132B' }}>
        {/* TOP SEARCH & CONTROLS APP BAR */}
        <View
          style={{
            paddingTop: Platform.OS === 'ios' ? 52 : 24,
            paddingHorizontal: 16,
            paddingBottom: 14,
            backgroundColor: '#0F172A',
            borderBottomWidth: 1,
            borderBottomColor: '#1E293B',
            zIndex: 40,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Live Search Input */}
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#1E293B',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 42,
                borderWidth: 1,
                borderColor: '#334155',
              }}
            >
              <Search size={16} color="#94A3B8" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={isHi ? 'इलाका, अस्पताल या लैंडमार्क खोजें...' : 'Search area, hospital or landmark...'}
                placeholderTextColor="#64748B"
                style={{
                  flex: 1,
                  paddingHorizontal: 8,
                  fontSize: 13.5,
                  color: '#FFFFFF',
                }}
              />
            </View>

            {/* GPS Locate Me Button */}
            <TouchableOpacity
              onPress={handleLocateMe}
              disabled={isLocating}
              activeOpacity={0.8}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: '#2563EB',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Crosshair size={20} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>

          {/* Search Dropdown overlay if active */}
          {searchResults.length > 0 && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: '#1E293B',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#334155',
                overflow: 'hidden',
              }}
            >
              {searchResults.slice(0, 4).map((result) => (
                <TouchableOpacity
                  key={result.name}
                  onPress={() => {
                    setSearchQuery('');
                    flyMapTo(result.lat, result.lng);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#334155',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <MapPin size={16} color="#38BDF8" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' }}>{result.name}</Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{result.area}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Hub Filter Pills */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            {POPULAR_HUBS.slice(0, 4).map((hub) => (
              <TouchableOpacity
                key={hub.id}
                onPress={() => flyMapTo(hub.latitude, hub.longitude)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4.5,
                  borderRadius: 8,
                  backgroundColor: Math.abs(hub.latitude - latitude) < 0.05 ? '#1D4ED8' : '#1E293B',
                  borderWidth: 1,
                  borderColor: Math.abs(hub.latitude - latitude) < 0.05 ? '#60A5FA' : '#334155',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{hub.city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ============================================================ */}
        {/* INTERACTIVE MAP CANVAS WITH CENTER FLOATING PIN */}
        {/* ============================================================ */}
        <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }} {...panResponder.panHandlers}>
          {Platform.OS === 'web' ? (
            /* High-Performance Stable Leaflet View on Web with Cached Tiles & Zero Reloads */
            <iframe
              ref={mapIframeRef}
              srcDoc={mapHtmlDoc}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          ) : (
            /* Native Touch Gesture Simulated Vector Map with Grid & Streets */
            <View style={{ flex: 1, backgroundColor: '#0F172A', position: 'relative' }}>
              {/* Simulated Map Streets & Grid Matrix */}
              <View
                style={{
                  position: 'absolute',
                  top: -100,
                  left: -100,
                  right: -100,
                  bottom: -100,
                  opacity: 0.18,
                  borderWidth: 1,
                  borderColor: '#38BDF8',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                }}
              >
                {Array.from({ length: 48 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: '25%',
                      height: 120,
                      borderWidth: 0.8,
                      borderColor: '#475569',
                      borderStyle: 'dashed',
                    }}
                  />
                ))}
              </View>

              {/* Major Simulated Arterial Roads */}
              <View
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: 0,
                  right: 0,
                  height: 14,
                  backgroundColor: '#334155',
                  transform: [{ rotate: '-18deg' }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '52%',
                  width: 14,
                  backgroundColor: '#334155',
                  transform: [{ rotate: '12deg' }],
                }}
              />

              {/* Surrounding Landmark Markers */}
              {MAP_LANDMARKS.slice(0, 3).map((lm, idx) => (
                <View
                  key={lm.name}
                  style={{
                    position: 'absolute',
                    top: 100 + idx * 90,
                    left: 40 + idx * 80,
                    backgroundColor: 'rgba(30, 41, 59, 0.92)',
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#38BDF8',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Building size={12} color="#38BDF8" />
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#E2E8F0' }}>{lm.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ============================================================ */}
          {/* CENTER FLOATING PIN (SWIGGY / ZOMATO SIGNATURE STYLE) */}
          {/* ============================================================ */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginLeft: -70,
              marginTop: -72,
              width: 140,
              alignItems: 'center',
              zIndex: 30,
            }}
          >
            {/* Delivery Here Capsule Tooltip */}
            <View
              style={{
                backgroundColor: '#0F172A',
                borderWidth: 1.5,
                borderColor: '#38BDF8',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4.5,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 }}>
                {isHi ? 'यहां डिलीवरी होगी' : 'Order Delivered Here'}
              </Text>
            </View>

            {/* Bouncing Teardrop Pin */}
            <Animated.View style={{ transform: [{ translateY: pinBounceAnim }] }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#EF4444',
                  borderWidth: 3.5,
                  borderColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#EF4444',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.45,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              >
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </View>
            </Animated.View>

            {/* Pin Target Base Shadow Dot */}
            <View
              style={{
                width: 12,
                height: 5,
                borderRadius: 6,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                marginTop: 2,
              }}
            />
          </View>

          {/* Floating Pan Instructions */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 14,
              alignSelf: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}
          >
            <Text style={{ fontSize: 11, color: '#CBD5E1', fontWeight: '600' }}>
              {isHi ? '📍 नक्शे को घुमाकर पिन को सटीक स्थान पर लाएं' : '📍 Pan or drag map to place pin accurately'}
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* BOTTOM CARD: CONFIRM SELECTED ADDRESS (SWIGGY STYLE) */}
        {/* ============================================================ */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: Platform.OS === 'ios' ? 36 : 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.18,
            shadowRadius: 18,
            elevation: 12,
            zIndex: 40,
          }}
        >
          {/* Coordinates & Accurate GPS Tag */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#16A34A' }} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isHi ? 'सटीक पिन स्थान' : 'ACCURATE PIN DROP'}
              </Text>
            </View>
            <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '600' }}>
              {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
            </Text>
          </View>

          {/* Active Area Title & Full Address */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }} numberOfLines={1}>
              {areaTitle}
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', fontWeight: '500', marginTop: 3, lineHeight: 17 }} numberOfLines={2}>
              {fullAddress}
            </Text>
          </View>

          {/* Action CTA Button */}
          <TouchableOpacity
            onPress={handleConfirm}
            activeOpacity={0.88}
            style={{
              height: 50,
              borderRadius: 16,
              backgroundColor: '#2563EB',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Check size={18} color="#FFFFFF" strokeWidth={2.8} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
              {isHi ? 'स्थान की पुष्टि करें और आगे बढ़ें' : 'Confirm Location & Proceed'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

