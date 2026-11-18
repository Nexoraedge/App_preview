// apps/mobile/components/ui/LocationPickerModal.tsx
// Swiggy / Zepto-Style Location & Multi-Address Selection Sheet
// Features: 1-Tap GPS detection, Saved Addresses (Home, Work, Other),
// Add New Address Form, Search filter, and Popular Healthcare Hubs.

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  MapPin,
  Navigation,
  Search,
  X,
  Home,
  Briefcase,
  Plus,
  CheckCircle2,
  Trash2,
  Check,
  Building,
  Sparkles,
  ChevronRight,
  Crosshair,
  Compass,
} from 'lucide-react-native';
import { useLocation, POPULAR_HUBS, PopularHub } from '../../src/context/LocationContext';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import type { UserAddress, AddressType } from '@adityam/types';
import { MapPinPickerModal } from './MapPinPickerModal';

export function LocationPickerModal() {
  const {
    isPickerModalOpen,
    initialAddingNew,
    closeLocationPicker,
    currentLocationName,
    activeAddress,
    savedAddresses,
    selectAddress,
    addAddress,
    deleteAddress,
    selectHub,
    detectCurrentLocation,
    isDetecting,
    setCustomPinLocation,
  } = useLocation();

  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    if (isPickerModalOpen) {
      setIsAddingNew(Boolean(initialAddingNew));
    }
  }, [isPickerModalOpen, initialAddingNew]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'pick_active' | 'pin_for_form'>('pick_active');
  const [markedCoords, setMarkedCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const defaultCity = activeAddress?.city || (user?.city && user.city !== 'Delhi NCR' ? user.city : 'Jaipur');
  const defaultPincode = activeAddress?.pincode || (defaultCity.toLowerCase().includes('jaipur') ? '302003' : '110017');

  // Add Address Form State
  const [addressType, setAddressType] = useState<AddressType>('Home');
  const [otherLabel, setOtherLabel] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [landmarkStreet, setLandmarkStreet] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [pincode, setPincode] = useState(defaultPincode);
  const [contactName, setContactName] = useState(user?.full_name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');

  // Keep form inputs fresh with current user profile
  React.useEffect(() => {
    if (isAddingNew) {
      if (user?.full_name && (!contactName || contactName === 'Abhishek Jain')) setContactName(user.full_name);
      if (user?.phone && (!contactPhone || contactPhone.includes('99999'))) setContactPhone(user.phone);
      if (!city || city === 'South Delhi NCR') {
        const c = activeAddress?.city || (user?.city && user.city !== 'Delhi NCR' ? user.city : 'Jaipur');
        setCity(c);
      }
      if (!pincode) {
        const pin = activeAddress?.pincode || (defaultCity.toLowerCase().includes('jaipur') ? '302003' : '110017');
        setPincode(pin);
      }
    }
  }, [isAddingNew, user?.full_name, user?.phone, user?.city, activeAddress, defaultCity]);

  // Filtered lists based on search
  const filteredAddresses = useMemo(() => {
    if (!searchQuery.trim()) return savedAddresses;
    const q = searchQuery.toLowerCase().trim();
    return savedAddresses.filter(
      (a) =>
        a.type.toLowerCase().includes(q) ||
        (a.label && a.label.toLowerCase().includes(q)) ||
        a.house_flat.toLowerCase().includes(q) ||
        a.landmark_street.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.pincode.includes(q)
    );
  }, [savedAddresses, searchQuery]);

  const filteredHubs = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_HUBS;
    const q = searchQuery.toLowerCase().trim();
    return POPULAR_HUBS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.nameHi.includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.state.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSaveAddress = () => {
    if (!houseFlat.trim()) {
      Alert.alert(
        isHi ? 'विवरण आवश्यक है' : 'Details Required',
        isHi ? 'कृपया मकान / फ्लैट नंबर दर्ज करें' : 'Please enter House / Flat / Building details'
      );
      return;
    }
    if (!landmarkStreet.trim()) {
      Alert.alert(
        isHi ? 'पता आवश्यक है' : 'Address Required',
        isHi ? 'कृपया गली, मोहल्ला या लैंडमार्क दर्ज करें' : 'Please enter Street, Landmark or Area'
      );
      return;
    }

    // Estimate accurate coordinates from city/pincode if map was not explicitly pinned
    let finalLat = markedCoords?.latitude;
    let finalLng = markedCoords?.longitude;
    const isJaipurAddr = (city + ' ' + landmarkStreet + ' ' + pincode).toLowerCase().includes('jaipur') || pincode.startsWith('302');
    if (!finalLat || !finalLng) {
      if (isJaipurAddr) {
        finalLat = 26.9205;
        finalLng = 75.8450;
      } else if (city.toLowerCase().includes('delhi') || pincode.startsWith('110')) {
        finalLat = 28.5244;
        finalLng = 77.2167;
      } else if (city.toLowerCase().includes('bengaluru') || pincode.startsWith('560')) {
        finalLat = 12.9352;
        finalLng = 77.6245;
      } else if (city.toLowerCase().includes('mumbai') || pincode.startsWith('400')) {
        finalLat = 19.1363;
        finalLng = 72.8277;
      } else {
        finalLat = 26.9205;
        finalLng = 75.8450;
      }
    }

    addAddress({
      type: addressType,
      label: addressType === 'Other' && otherLabel.trim() ? otherLabel.trim() : undefined,
      house_flat: houseFlat.trim(),
      landmark_street: landmarkStreet.trim(),
      city: city.trim() || (isJaipurAddr ? 'Jaipur' : 'South Delhi NCR'),
      pincode: pincode.trim() || (isJaipurAddr ? '302003' : '110017'),
      contact_person: contactName.trim() || user?.full_name || 'Patient',
      contact_phone: contactPhone.trim() || user?.phone || '+91 99999 99999',
      is_default: savedAddresses.length === 0,
      latitude: finalLat,
      longitude: finalLng,
    });

    // Reset Form
    setIsAddingNew(false);
    setHouseFlat('');
    setLandmarkStreet('');
    setPincode('');
    setOtherLabel('');
    setMarkedCoords(null);
  };

  const handleConfirmLocationFromMap = (location: {
    name: string;
    city: string;
    landmark: string;
    pincode: string;
    latitude: number;
    longitude: number;
  }) => {
    setIsMapModalOpen(false);
    setMarkedCoords({ latitude: location.latitude, longitude: location.longitude });

    if (mapMode === 'pin_for_form') {
      // Auto-populate form inputs
      if (location.landmark) setLandmarkStreet(location.landmark);
      if (location.city) setCity(location.city);
      if (location.pincode) setPincode(location.pincode);
    } else {
      // Set active location in app immediately
      setCustomPinLocation({
        name: location.name,
        city: location.city,
        landmark: location.landmark,
        pincode: location.pincode,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  };

  const getAddressIcon = (type: AddressType) => {
    switch (type) {
      case 'Home':
        return <Home size={18} color="#2563EB" />;
      case 'Work':
        return <Briefcase size={18} color="#EA580C" />;
      default:
        return <MapPin size={18} color="#059669" />;
    }
  };

  const getAddressBadgeColor = (type: AddressType) => {
    switch (type) {
      case 'Home':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' };
      case 'Work':
        return { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' };
      default:
        return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' };
    }
  };

  return (
    <>
      <Modal
        visible={isPickerModalOpen}
      animationType="slide"
      transparent
      onRequestClose={closeLocationPicker}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={closeLocationPicker}
        />

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '88%',
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {/* Header Bar */}
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }}>
                {isAddingNew
                  ? isHi
                    ? 'नया पता जोड़ें'
                    : 'Add Delivery & Service Address'
                  : isHi
                  ? 'स्थान व पता चुनें'
                  : 'Select Location & Address'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                {isAddingNew
                  ? isHi
                    ? 'दवाइयों व लैब सैंपल पिकअप हेतु'
                    : 'For home lab collection & medicines'
                  : isHi
                  ? 'निकटतम अस्पताल व लैब सेवाएं खोजने हेतु'
                  : 'For fastest doctor appointments & lab tests'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (isAddingNew) {
                  setIsAddingNew(false);
                } else {
                  closeLocationPicker();
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
          >
            {isAddingNew ? (
              /* ============================================================ */
              /* ADD NEW ADDRESS FORM (SWIGGY STYLE) */
              /* ============================================================ */
              <View style={{ gap: 14 }}>
                {/* Address Type Tag Selector */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
                    {isHi ? 'पते का प्रकार' : 'SAVE ADDRESS AS'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(['Home', 'Work', 'Other'] as AddressType[]).map((type) => {
                      const selected = addressType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setAddressType(type)}
                          activeOpacity={0.8}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: selected ? '#2563EB' : '#E2E8F0',
                            backgroundColor: selected ? '#EFF6FF' : '#F8FAFC',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          {type === 'Home' && <Home size={15} color={selected ? '#2563EB' : '#64748B'} />}
                          {type === 'Work' && <Briefcase size={15} color={selected ? '#2563EB' : '#64748B'} />}
                          {type === 'Other' && <MapPin size={15} color={selected ? '#2563EB' : '#64748B'} />}
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: selected ? '800' : '600',
                              color: selected ? '#1D4ED8' : '#475569',
                            }}
                          >
                            {type === 'Home' ? (isHi ? 'घर' : 'Home') : type === 'Work' ? (isHi ? 'दफ़्तर' : 'Work') : isHi ? 'अन्य' : 'Other'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {addressType === 'Other' && (
                  <View>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      {isHi ? 'पते का नाम (उदा. माताजी का घर)' : 'Address Label (e.g. Parents, Clinic)'}
                    </Text>
                    <TextInput
                      value={otherLabel}
                      onChangeText={setOtherLabel}
                      placeholder={isHi ? 'उदा. ननिहाल या दूसरा घर' : "e.g. Mom's House, Studio"}
                      placeholderTextColor="#94A3B8"
                      style={{
                        height: 44,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        fontSize: 14,
                        color: '#0F172A',
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                )}

                {/* 📍 Doorstep Pin on Map Card */}
                <TouchableOpacity
                  onPress={() => {
                    setMapMode('pin_for_form');
                    setIsMapModalOpen(true);
                  }}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    backgroundColor: markedCoords ? '#F0FDF4' : '#EFF6FF',
                    borderWidth: 1.2,
                    borderColor: markedCoords ? '#86EFAC' : '#BFDBFE',
                    borderRadius: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 6 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: markedCoords ? '#DCFCE7' : '#DBEAFE',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MapPin size={18} color={markedCoords ? '#16A34A' : '#2563EB'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: markedCoords ? '#15803D' : '#1D4ED8' }}>
                        {markedCoords
                          ? isHi
                            ? '✓ पिन सटीक स्थान पर सेट है'
                            : '✓ Doorstep Pinned on Map'
                          : isHi
                          ? 'सटीक दरवाजे पर पिन लगाएं'
                          : 'Pin Exact Doorstep on Map'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 }} numberOfLines={1}>
                        {markedCoords
                          ? `${markedCoords.latitude.toFixed(4)}° N, ${markedCoords.longitude.toFixed(4)}° E`
                          : isHi
                          ? 'दवाइयों व लैब टेस्ट के लिए सटीक स्थान'
                          : 'For accurate sample pickup & delivery'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: markedCoords ? '#DCFCE7' : '#2563EB',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '800',
                        color: markedCoords ? '#15803D' : '#FFFFFF',
                      }}
                    >
                      {markedCoords ? (isHi ? 'बदलें' : 'Change') : isHi ? 'पिन चुनें' : 'Pin on Map'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* House / Flat No */}
                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    {isHi ? 'मकान / फ्लैट / ब्लॉक नंबर *' : 'House / Flat / Block / Floor No. *'}
                  </Text>
                  <TextInput
                    value={houseFlat}
                    onChangeText={setHouseFlat}
                    placeholder={isHi ? 'उदा. फ्लैट 402, ब्लॉक बी, साकेत हाइट्स' : 'e.g. Flat 402, Block B, Silver Oak Apt'}
                    placeholderTextColor="#94A3B8"
                    style={{
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      fontSize: 14,
                      color: '#0F172A',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </View>

                {/* Street / Landmark */}
                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    {isHi ? 'सड़क / लैंडमार्क / इलाका *' : 'Street / Landmark / Area *'}
                  </Text>
                  <TextInput
                    value={landmarkStreet}
                    onChangeText={setLandmarkStreet}
                    placeholder={isHi ? 'उदा. साकेत मेट्रो स्टेशन के पास' : 'e.g. Opposite Community Center, Saket'}
                    placeholderTextColor="#94A3B8"
                    style={{
                      height: 44,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      fontSize: 14,
                      color: '#0F172A',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </View>

                {/* City & Pincode Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      {isHi ? 'शहर / राज्य' : 'City / State'}
                    </Text>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder={defaultCity}
                      placeholderTextColor="#94A3B8"
                      style={{
                        height: 44,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        fontSize: 14,
                        color: '#0F172A',
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      {isHi ? 'पिनकोड' : 'Pincode'}
                    </Text>
                    <TextInput
                      value={pincode}
                      onChangeText={setPincode}
                      placeholder={defaultPincode}
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={6}
                      style={{
                        height: 44,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        fontSize: 14,
                        color: '#0F172A',
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                </View>

                {/* Contact Name & Phone Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      {isHi ? 'मरीज / संपर्क नाम' : 'Contact Person'}
                    </Text>
                    <TextInput
                      value={contactName}
                      onChangeText={setContactName}
                      placeholder={user?.full_name || 'Patient Full Name'}
                      placeholderTextColor="#94A3B8"
                      style={{
                        height: 44,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        fontSize: 14,
                        color: '#0F172A',
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      {isHi ? 'मोबाइल नंबर' : 'Phone Number'}
                    </Text>
                    <TextInput
                      value={contactPhone}
                      onChangeText={setContactPhone}
                      placeholder={user?.phone || '+91 98765 43210'}
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      style={{
                        height: 44,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        fontSize: 14,
                        color: '#0F172A',
                        backgroundColor: '#F8FAFC',
                      }}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => setIsAddingNew(false)}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>
                      {isHi ? 'रद्द करें' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveAddress}
                    activeOpacity={0.85}
                    style={{
                      flex: 2,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: '#2563EB',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#2563EB',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                      {isHi ? 'सहेजें व चुनें' : 'Save & Select Address'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ============================================================ */
              /* LOCATION PICKER MAIN VIEW (SWIGGY STYLE) */
              /* ============================================================ */
              <View style={{ gap: 18 }}>
                {/* Search Bar */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F1F5F9',
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    height: 44,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Search size={17} color="#64748B" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={
                      isHi
                        ? 'क्षेत्र, सड़क, लैंडमार्क या पिनकोड खोजें...'
                        : 'Search for area, landmark or pincode...'
                    }
                    placeholderTextColor="#94A3B8"
                    style={{
                      flex: 1,
                      paddingHorizontal: 10,
                      fontSize: 13.5,
                      color: '#0F172A',
                    }}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 1-Tap "Use Current Location" GPS Button (Swiggy / Zepto Style) */}
                <TouchableOpacity
                  onPress={detectCurrentLocation}
                  disabled={isDetecting}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    backgroundColor: '#F0FDF4',
                    borderWidth: 1.2,
                    borderColor: '#BBF7D0',
                    borderRadius: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: '#DCFCE7',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isDetecting ? (
                        <ActivityIndicator size="small" color="#16A34A" />
                      ) : (
                        <Crosshair size={20} color="#16A34A" strokeWidth={2.4} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#15803D' }}>
                        {isDetecting
                          ? isHi
                            ? 'स्थान का पता लगाया जा रहा है...'
                            : 'Detecting precise GPS location...'
                          : isHi
                          ? 'वर्तमान स्थान का उपयोग करें'
                          : 'Use Current Location'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#166534', fontWeight: '500', marginTop: 1 }}>
                        {isHi ? 'डिवाइस जीपीएस द्वारा स्वचालित' : 'Auto-detected via device GPS'}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={17} color="#16A34A" />
                </TouchableOpacity>

                {/* Interactive Map Pin Drop Button (Swiggy / Zepto / Uber Style) */}
                <TouchableOpacity
                  onPress={() => {
                    setMapMode('pick_active');
                    setIsMapModalOpen(true);
                  }}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 1.2,
                    borderColor: '#BFDBFE',
                    borderRadius: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: '#DBEAFE',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MapPin size={20} color="#2563EB" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1D4ED8' }}>
                          {isHi ? 'नक्शे पर सटीक पिन लगाएं' : 'Set Location on Map'}
                        </Text>
                        <View
                          style={{
                            backgroundColor: '#2563EB',
                            paddingHorizontal: 6,
                            paddingVertical: 1.5,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>MAP PIN</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11.5, color: '#1E40AF', fontWeight: '500', marginTop: 1 }}>
                        {isHi ? 'नक्शे को घुमाकर पिन सटीक दरवाजे पर छोड़ें' : 'Drag & drop pin to mark your exact doorstep'}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={17} color="#2563EB" />
                </TouchableOpacity>

                {/* SAVED ADDRESSES SECTION */}
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {isHi ? 'सहेजे गए पते' : 'SAVED ADDRESSES'} ({filteredAddresses.length})
                    </Text>

                    <TouchableOpacity
                      onPress={() => setIsAddingNew(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: '#EFF6FF',
                      }}
                    >
                      <Plus size={13} color="#2563EB" strokeWidth={2.5} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1D4ED8' }}>
                        {isHi ? 'नया पता' : 'Add New'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {filteredAddresses.length === 0 ? (
                    <View
                      style={{
                        padding: 20,
                        backgroundColor: '#F8FAFC',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        alignItems: 'center',
                      }}
                    >
                      <MapPin size={28} color="#94A3B8" />
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#334155', marginTop: 8 }}>
                        {isHi ? 'कोई सहेजा गया पता नहीं मिला' : 'No Saved Addresses Yet'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
                        {isHi
                          ? 'दवाइयों की तेज़ होम डिलीवरी व लैब टेस्ट के लिए अपना घर या दफ़्तर का पता जोड़ें।'
                          : 'Save your home or office address for 1-tap medicine delivery and doorstep lab sample pickup.'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setIsAddingNew(true)}
                        activeOpacity={0.8}
                        style={{
                          marginTop: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: '#2563EB',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                          {isHi ? 'नया पता जोड़ें' : 'Add New Address'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {filteredAddresses.map((addr) => {
                        const isSelected = activeAddress?.id === addr.id;
                        const badge = getAddressBadgeColor(addr.type);
                        return (
                          <TouchableOpacity
                            key={addr.id}
                            onPress={() => selectAddress(addr.id)}
                            activeOpacity={0.85}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              padding: 13,
                              borderRadius: 16,
                              backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                              borderWidth: 1.5,
                              borderColor: isSelected ? '#3B82F6' : '#E2E8F0',
                              shadowColor: '#0F172A',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.04,
                              shadowRadius: 5,
                              elevation: 1,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, paddingRight: 8 }}>
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  backgroundColor: badge.bg,
                                  borderWidth: 1,
                                  borderColor: badge.border,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginTop: 2,
                                }}
                              >
                                {getAddressIcon(addr.type)}
                              </View>

                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                                    {addr.type === 'Other' && addr.label ? addr.label : addr.type}
                                  </Text>
                                  {addr.is_default && (
                                    <View
                                      style={{
                                        backgroundColor: '#F1F5F9',
                                        paddingHorizontal: 6,
                                        paddingVertical: 1.5,
                                        borderRadius: 6,
                                      }}
                                    >
                                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#475569' }}>
                                        DEFAULT
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                <Text
                                  numberOfLines={2}
                                  style={{
                                    fontSize: 12.5,
                                    color: '#475569',
                                    fontWeight: '500',
                                    marginTop: 3,
                                    lineHeight: 17,
                                  }}
                                >
                                  {addr.house_flat}, {addr.landmark_street}, {addr.city} - {addr.pincode}
                                </Text>

                                {addr.contact_person && (
                                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 3 }}>
                                    {addr.contact_person} {addr.contact_phone ? `• ${addr.contact_phone}` : ''}
                                  </Text>
                                )}
                              </View>
                            </View>

                            <View style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
                              <View
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 10,
                                  borderWidth: 2,
                                  borderColor: isSelected ? '#2563EB' : '#CBD5E1',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isSelected ? '#2563EB' : 'transparent',
                                }}
                              >
                                {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                              </View>

                              {savedAddresses.length > 1 && (
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    deleteAddress(addr.id);
                                  }}
                                  hitSlop={6}
                                >
                                  <Trash2 size={14} color="#94A3B8" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Dedicated Interactive Map Pin Picker Modal (Swiggy / Uber / Zepto Style) */}
    <MapPinPickerModal
      visible={isMapModalOpen}
      onClose={() => setIsMapModalOpen(false)}
      onConfirmLocation={handleConfirmLocationFromMap}
    />
  </>
  );
}

