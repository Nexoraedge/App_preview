// apps/mobile/src/context/LocationContext.tsx
// Swiggy/Zepto-style Location & Multi-Address Management Context
// Supports GPS location detection, multiple saved addresses (Home, Work, Other),
// and 1-tap popular healthcare hubs with AsyncStorage persistence.

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { UserAddress, AddressType } from '@adityam/types';
import { useAuth } from './AuthContext';
import {
  fetchUserAddressesFromDb,
  saveUserAddressToDb,
  deleteUserAddressFromDb,
} from '../lib/supabase';

const SAVED_ADDRESSES_STORAGE_KEY = '@adityam_saved_addresses_v2';
const ACTIVE_LOCATION_STORAGE_KEY = '@adityam_active_location_v2';

export interface PopularHub {
  id: string;
  name: string;
  nameHi: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  tag: string;
}

export const POPULAR_HUBS: PopularHub[] = [
  {
    id: 'hub-jaipur-surajpole',
    name: 'Surajpole Gate, Jaipur',
    nameHi: 'सूरजपोल गेट, जयपुर',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9208,
    longitude: 75.8445,
    tag: 'Central Hub',
  },
  {
    id: 'hub-jaipur-cscheme',
    name: 'C-Scheme, Jaipur',
    nameHi: 'सी-स्कीम, जयपुर',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9077,
    longitude: 75.8050,
    tag: 'Business District',
  },
  {
    id: 'hub-jaipur-rambagh',
    name: 'Rambagh Circle, Jaipur',
    nameHi: 'रामबाग सर्किल, जयपुर',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.8986,
    longitude: 75.8078,
    tag: 'SDMH & Hospitals',
  },
  {
    id: 'hub-jaipur-jln',
    name: 'JLN Marg & SMS Hospital',
    nameHi: 'जेएलएन मार्ग व एसएमएस अस्पताल',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9038,
    longitude: 75.8172,
    tag: 'Medical Hub',
  },
  {
    id: 'hub-jaipur-malviya',
    name: 'Malviya Nagar, Jaipur',
    nameHi: 'मालवीय नगर, जयपुर',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.8532,
    longitude: 75.8175,
    tag: 'South Jaipur',
  },
  {
    id: 'hub-jaipur-vaishali',
    name: 'Vaishali Nagar, Jaipur',
    nameHi: 'वैशाली नगर, जयपुर',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9044,
    longitude: 75.7438,
    tag: 'West Jaipur',
  },
];

const DEMO_REVIEWER_ADDRESSES: UserAddress[] = [
  {
    id: 'addr-home-1',
    user_id: '00000000-0000-0000-0000-000000000001',
    type: 'Home',
    label: 'Home',
    house_flat: 'Mohanbari, Surajpole',
    landmark_street: 'Surajpole Gate, Mohanbari',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302003',
    latitude: 26.9205,
    longitude: 75.8450,
    is_default: true,
    contact_person: 'Hardik Jain',
    contact_phone: '+91 82713 10911',
    created_at: new Date().toISOString(),
  },
  {
    id: 'addr-work-1',
    user_id: '00000000-0000-0000-0000-000000000001',
    type: 'Work',
    label: 'Work / Office',
    house_flat: 'Level 5, Building 10, DLF Cyber City',
    landmark_street: 'DLF Phase 2, Sector 24',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122002',
    latitude: 28.4907,
    longitude: 77.0949,
    is_default: false,
    contact_person: 'Abhishek Jain',
    contact_phone: '+91 99999 99999',
    created_at: new Date().toISOString(),
  },
  {
    id: 'addr-parents-1',
    user_id: '00000000-0000-0000-0000-000000000001',
    type: 'Other',
    label: "Parents' House",
    house_flat: 'B-14, Sector 4, Central Avenue',
    landmark_street: 'Near Gauri Temple, Malviya Nagar',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302017',
    latitude: 26.8532,
    longitude: 75.8175,
    is_default: false,
    contact_person: 'Sunita Malhotra',
    contact_phone: '+91 98112 44550',
    created_at: new Date().toISOString(),
  },
];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface LocationContextType {
  currentLocationName: string;
  activeAddress: UserAddress | null;
  savedAddresses: UserAddress[];
  coords: { latitude: number; longitude: number } | null;
  isDetecting: boolean;
  isPickerModalOpen: boolean;
  openLocationPicker: () => void;
  closeLocationPicker: () => void;
  selectAddress: (addressId: string) => void;
  addAddress: (address: Omit<UserAddress, 'id'>) => string;
  updateAddress: (id: string, patch: Partial<UserAddress>) => void;
  deleteAddress: (id: string) => void;
  selectHub: (hub: PopularHub) => void;
  detectCurrentLocation: () => Promise<boolean>;
  setCustomPinLocation: (loc: {
    name: string;
    city: string;
    landmark?: string;
    pincode?: string;
    latitude: number;
    longitude: number;
  }) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isDemoUser = user?.id === '00000000-0000-0000-0000-000000000001';

  // Helper: check if address is from hardcoded demo accounts
  const isMockAddress = useCallback((a: any) => {
    if (!a) return false;
    return (
      a.id === 'addr-home-1' ||
      a.id === 'addr-work-1' ||
      a.id === 'addr-parents-1' ||
      a.contact_person === 'Abhishek Jain' ||
      a.contact_person === 'Sunita Malhotra' ||
      a.user_id === '00000000-0000-0000-0000-000000000001'
    );
  }, []);

  // Helper: normalize coordinates according to city/pincode
  const normalizeAddressCoords = useCallback((a: UserAddress): UserAddress => {
    const isJp =
      (a.city + ' ' + (a.landmark_street || '') + ' ' + (a.house_flat || '') + ' ' + (a.pincode || ''))
        .toLowerCase()
        .includes('jaipur') || (a.pincode && String(a.pincode).startsWith('302'));
    if (isJp && (!a.latitude || a.latitude > 28 || !a.longitude || a.longitude < 75)) {
      return { ...a, latitude: 26.9205, longitude: 75.8450 };
    }
    return a;
  }, []);

  // Determine initial city / hub from profile if set
  const initialCity = user?.city && user.city !== 'Delhi NCR' && user.city !== 'Saket, South Delhi NCR' ? user.city : 'Jaipur';
  const initialHub = POPULAR_HUBS.find((h) => h.city.toLowerCase() === initialCity.toLowerCase()) || POPULAR_HUBS[3] /* Jaipur */;

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>(() =>
    isDemoUser ? DEMO_REVIEWER_ADDRESSES : []
  );
  const [activeAddress, setActiveAddress] = useState<UserAddress | null>(() =>
    isDemoUser ? DEMO_REVIEWER_ADDRESSES[0] : null
  );
  const [currentLocationName, setCurrentLocationName] = useState<string>(
    isDemoUser ? 'Surajpole Gate, Jaipur' : user?.city ? user.city : 'Select Location'
  );
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    isDemoUser
      ? { latitude: 26.9205, longitude: 75.845 }
      : user?.city
      ? { latitude: initialHub.latitude, longitude: initialHub.longitude }
      : null
  );
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState<boolean>(false);

  // Restore saved addresses & active location from AsyncStorage and live Supabase table
  useEffect(() => {
    // 1. Restore local cache
    AsyncStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              // Sanitize: real logged-in users must NEVER see demo addresses
              const cleanAddresses = (isDemoUser ? parsed : parsed.filter((a) => !isMockAddress(a))).map(normalizeAddressCoords);
              if (cleanAddresses.length > 0) {
                setSavedAddresses(cleanAddresses);
                const def = cleanAddresses.find((a: UserAddress) => a.is_default) || cleanAddresses[0];
                setActiveAddress(def);
                if (def) {
                  setCurrentLocationName(`${def.landmark_street ? def.landmark_street + ', ' : ''}${def.city}`);
                  if (def.latitude && def.longitude) {
                    setCoords({ latitude: def.latitude, longitude: def.longitude });
                  }
                }
              } else if (!isDemoUser) {
                setSavedAddresses([]);
                setActiveAddress(null);
                AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify([])).catch(() => {});
              }
            }
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Live query from Supabase user_addresses table
    fetchUserAddressesFromDb(user?.id, user?.phone)
      .then((dbData) => {
        if (Array.isArray(dbData) && dbData.length > 0) {
          const rawMapped: UserAddress[] = dbData.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            type: d.type as AddressType,
            label: d.label,
            house_flat: d.house_flat,
            landmark_street: d.landmark_street,
            city: d.city,
            state: d.state,
            pincode: d.pincode,
            latitude: d.latitude,
            longitude: d.longitude,
            is_default: d.is_default,
            contact_person: d.contact_person,
            contact_phone: d.contact_phone,
            created_at: d.created_at,
          }));
          const mapped = (isDemoUser ? rawMapped : rawMapped.filter((a) => !isMockAddress(a))).map(normalizeAddressCoords);
          if (mapped.length > 0) {
            setSavedAddresses(mapped);
            AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(mapped)).catch(() => {});
            const def = mapped.find((a) => a.is_default) || mapped[0];
            if (def) {
              setActiveAddress(def);
              const name = `${def.type === 'Other' && def.label ? def.label : def.type}: ${def.landmark_street || def.house_flat}, ${def.city}`;
              setCurrentLocationName(name);
              if (def.latitude && def.longitude) {
                setCoords({ latitude: def.latitude, longitude: def.longitude });
              }
            }
          } else if (!isDemoUser) {
            setSavedAddresses([]);
            setActiveAddress(null);
            AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify([])).catch(() => {});
          }
        } else if (!isDemoUser) {
          // Empty DB results for real account -> keep clean empty state
          setSavedAddresses([]);
          setActiveAddress(null);
          AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify([])).catch(() => {});
        }
      })
      .catch(() => {});

    // 3. Active location restoration with coordinate-leak sanitizer
    AsyncStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const loc = JSON.parse(raw);
            if (loc?.name) {
              // Sanitize raw coordinates leak like 'Marked Location (26.9211, 75.8461)'
              if (loc.name.includes('Marked Location (') || /^\s*Marked\s+Location/i.test(loc.name)) {
                const cleanName = initialHub.name;
                setCurrentLocationName(cleanName);
                if (loc?.coords) setCoords(loc.coords);
                AsyncStorage.setItem(
                  ACTIVE_LOCATION_STORAGE_KEY,
                  JSON.stringify({ name: cleanName, coords: loc?.coords || { latitude: initialHub.latitude, longitude: initialHub.longitude } })
                ).catch(() => {});
              } else {
                setCurrentLocationName(loc.name);
                if (loc?.coords) setCoords(loc.coords);
              }
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [user?.id, user?.phone, isDemoUser, isMockAddress, initialHub]);

  const openLocationPicker = useCallback(() => setIsPickerModalOpen(true), []);
  const closeLocationPicker = useCallback(() => setIsPickerModalOpen(false), []);

  const selectAddress = useCallback((addressId: string) => {
    const target = savedAddresses.find((a) => a.id === addressId);
    if (target) {
      setActiveAddress(target);
      const name = `${target.type === 'Other' && target.label ? target.label : target.type}: ${target.landmark_street || target.house_flat}, ${target.city}`;
      setCurrentLocationName(name);
      if (target.latitude && target.longitude) {
        setCoords({ latitude: target.latitude, longitude: target.longitude });
      }
      AsyncStorage.setItem(
        ACTIVE_LOCATION_STORAGE_KEY,
        JSON.stringify({
          name,
          coords: target.latitude && target.longitude ? { latitude: target.latitude, longitude: target.longitude } : null,
          addressId: target.id,
        })
      ).catch(() => {});
      setIsPickerModalOpen(false);
    }
  }, [savedAddresses]);

  const selectHub = useCallback((hub: PopularHub) => {
    setActiveAddress(null);
    setCurrentLocationName(hub.name);
    setCoords({ latitude: hub.latitude, longitude: hub.longitude });
    AsyncStorage.setItem(
      ACTIVE_LOCATION_STORAGE_KEY,
      JSON.stringify({
        name: hub.name,
        coords: { latitude: hub.latitude, longitude: hub.longitude },
        hubId: hub.id,
      })
    ).catch(() => {});
    setIsPickerModalOpen(false);
  }, []);

  const setCustomPinLocation = useCallback((loc: {
    name: string;
    city: string;
    landmark?: string;
    pincode?: string;
    latitude: number;
    longitude: number;
  }) => {
    setActiveAddress(null);
    let displayName = loc.name;
    // Guard against raw coordinate leak
    if (!displayName || displayName.includes('Marked Location (') || /^\s*Marked\s+Location/i.test(displayName)) {
      if (loc.landmark && !loc.landmark.includes('Near Pin Drop') && !loc.landmark.includes('Marked Location')) {
        displayName = `${loc.landmark}, ${loc.city}`;
      } else {
        const detectedCity = loc.city && loc.city !== 'Delhi NCR' ? loc.city : 'Jaipur';
        displayName = `${detectedCity}, Rajasthan`;
      }
    }
    setCurrentLocationName(displayName);
    setCoords({ latitude: loc.latitude, longitude: loc.longitude });
    AsyncStorage.setItem(
      ACTIVE_LOCATION_STORAGE_KEY,
      JSON.stringify({
        name: displayName,
        coords: { latitude: loc.latitude, longitude: loc.longitude },
        pincode: loc.pincode,
      })
    ).catch(() => {});
    setIsPickerModalOpen(false);
  }, []);

  const addAddress = useCallback((addr: Omit<UserAddress, 'id'>) => {
    const id = generateUUID();
    const isUuid = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    const effectiveUserId = isUuid ? user.id : '00000000-0000-0000-0000-000000000001';

    const isJaipurAddr =
      (addr.city + ' ' + (addr.landmark_street || '') + ' ' + (addr.house_flat || '') + ' ' + (addr.pincode || ''))
        .toLowerCase()
        .includes('jaipur') || (addr.pincode && String(addr.pincode).startsWith('302'));
    const finalLat =
      addr.latitude && (!isJaipurAddr || addr.latitude < 28)
        ? addr.latitude
        : isJaipurAddr
        ? 26.9205
        : 28.5244;
    const finalLng =
      addr.longitude && (!isJaipurAddr || addr.longitude < 76.5)
        ? addr.longitude
        : isJaipurAddr
        ? 75.8450
        : 77.2167;

    const newAddr: UserAddress = {
      ...addr,
      id,
      user_id: effectiveUserId,
      latitude: finalLat,
      longitude: finalLng,
      created_at: new Date().toISOString(),
    };
    setSavedAddresses((prev) => {
      const updated = [newAddr, ...prev];
      AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Auto set as active address
    setActiveAddress(newAddr);
    const displayName = `${newAddr.type}: ${newAddr.landmark_street || newAddr.house_flat}, ${newAddr.city}`;
    setCurrentLocationName(displayName);
    setCoords({ latitude: finalLat, longitude: finalLng });

    AsyncStorage.setItem(
      ACTIVE_LOCATION_STORAGE_KEY,
      JSON.stringify({
        name: displayName,
        coords: { latitude: finalLat, longitude: finalLng },
        addressId: id,
      })
    ).catch(() => {});

    // Sync to Supabase user_addresses table
    saveUserAddressToDb({
      id,
      user_id: effectiveUserId,
      phone: user?.phone || '+919999999999',
      type: addr.type,
      label: addr.label,
      house_flat: addr.house_flat,
      landmark_street: addr.landmark_street,
      city: addr.city,
      state: addr.state || (isJaipurAddr ? 'Rajasthan' : 'Delhi'),
      pincode: addr.pincode,
      latitude: finalLat,
      longitude: finalLng,
      is_default: addr.is_default || false,
      contact_person: addr.contact_person || user?.full_name || 'Patient',
      contact_phone: addr.contact_phone || user?.phone || '+91 99999 99999',
    }).catch(() => {});

    setIsPickerModalOpen(false);
    return id;
  }, [user?.id, user?.phone, user?.full_name]);

  const updateAddress = useCallback((id: string, patch: Partial<UserAddress>) => {
    setSavedAddresses((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    if (activeAddress?.id === id) {
      setActiveAddress((cur) => (cur ? { ...cur, ...patch } : null));
    }

    // Sync update to Supabase
    saveUserAddressToDb({ id, ...patch }).catch(() => {});
  }, [activeAddress?.id]);

  const deleteAddress = useCallback((id: string) => {
    setSavedAddresses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      AsyncStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    if (activeAddress?.id === id) {
      const fallback = savedAddresses.find((a) => a.id !== id) || null;
      setActiveAddress(fallback);
      if (fallback) {
        setCurrentLocationName(`${fallback.type}: ${fallback.landmark_street || fallback.house_flat}, ${fallback.city}`);
      } else {
        setCurrentLocationName('Surajpole Gate, Jaipur');
      }
    }

    // Sync deletion to Supabase
    deleteUserAddressFromDb(id).catch(() => {});
  }, [activeAddress?.id, savedAddresses]);

  // GPS / Geolocation Detection (Swiggy 1-tap "Use current location")
  const detectCurrentLocation = useCallback(async (): Promise<boolean> => {
    setIsDetecting(true);
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
            });
          });
          const { latitude, longitude } = pos.coords;
          setCoords({ latitude, longitude });
          // Nearest recognizable healthcare hub
          const hubName = latitude > 26.5 && latitude < 27.5 ? 'Surajpole Gate, Jaipur (GPS)' : 'Koramangala, Bengaluru (GPS)';
          setCurrentLocationName(hubName);
          setActiveAddress(null);
          AsyncStorage.setItem(
            ACTIVE_LOCATION_STORAGE_KEY,
            JSON.stringify({ name: hubName, coords: { latitude, longitude } })
          ).catch(() => {});
          setIsPickerModalOpen(false);
          setIsDetecting(false);
          return true;
        }
      } else {
        // Native mobile using expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude, longitude } = loc.coords;
          setCoords({ latitude, longitude });

          try {
            const [reverse] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverse) {
              const detectedCity = `${reverse.district || reverse.name || 'Current Area'}, ${reverse.city || 'Jaipur'}`;
              setCurrentLocationName(`${detectedCity} (GPS)`);
              setActiveAddress(null);
              AsyncStorage.setItem(
                ACTIVE_LOCATION_STORAGE_KEY,
                JSON.stringify({ name: `${detectedCity} (GPS)`, coords: { latitude, longitude } })
              ).catch(() => {});
              setIsPickerModalOpen(false);
              setIsDetecting(false);
              return true;
            }
          } catch {}

          setCurrentLocationName('Current Location (GPS)');
          setActiveAddress(null);
          setIsPickerModalOpen(false);
          setIsDetecting(false);
          return true;
        }
      }
    } catch (err) {
      console.warn('[LocationContext] Location detection fallback:', err);
    }

    // Gentle fallback to default flagship hub if permission denied or timeout
    setCurrentLocationName('Surajpole Gate, Jaipur');
    setCoords({ latitude: 26.9205, longitude: 75.8450 });
    setIsDetecting(false);
    setIsPickerModalOpen(false);
    return false;
  }, []);

  const value = useMemo(
    () => ({
      currentLocationName,
      activeAddress,
      savedAddresses,
      coords,
      isDetecting,
      isPickerModalOpen,
      openLocationPicker,
      closeLocationPicker,
      selectAddress,
      addAddress,
      updateAddress,
      deleteAddress,
      selectHub,
      detectCurrentLocation,
      setCustomPinLocation,
    }),
    [
      currentLocationName,
      activeAddress,
      savedAddresses,
      coords,
      isDetecting,
      isPickerModalOpen,
      openLocationPicker,
      closeLocationPicker,
      selectAddress,
      addAddress,
      updateAddress,
      deleteAddress,
      selectHub,
      detectCurrentLocation,
      setCustomPinLocation,
    ]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider (in app/_layout.tsx)');
  }
  return context;
};

