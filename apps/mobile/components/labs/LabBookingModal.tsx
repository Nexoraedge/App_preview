// apps/mobile/components/labs/LabBookingModal.tsx
// Comprehensive Lab & Scans Booking Modal for Adityam Niramayaa.
// Supports Home Sample Collection vs Diagnostic Centre Visit,
// Real Patient Selector (Self vs Family Dependents),
// Fasting guidance, 7-day morning slot picker, and online payment.

import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Users,
  ShieldCheck,
  MapPin,
  Home as HomeIcon,
  Building2,
  AlertCircle,
  FileText,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import type { Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useFamily, getRelationLabel, type Member } from '../../src/context/FamilyContext';
import { useLocation } from '../../src/context/LocationContext';
import { inr } from '../../src/theme';
import { type Item, type Centre } from '../../src/data/labsSample';
import { PaymentGatewayModal, PaymentMethod } from '../payment/PaymentGatewayModal';
import { VerifyPhoneModal } from '../auth/VerifyPhoneModal';
import { AppointmentQrCode } from '../ui/AppointmentQrCode';

export interface LabBookingModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCentre: Centre | null;
  selectedItems: Item[];
  totalAmount: number;
  onConfirmBooking: (
    patientName: string,
    patientPhone: string,
    collectionMode: 'HOME_COLLECTION' | 'CENTRE_VISIT',
    collectionAddress: string,
    slotString: string,
    paymentMethod: string,
    txnId: string
  ) => void;
  isSubmitting: boolean;
  confirmedBooking: Booking | null;
  language: 'en' | 'hi';
  onViewAppointments?: () => void;
}

export function LabBookingModal({
  visible,
  onClose,
  selectedCentre,
  selectedItems,
  totalAmount,
  onConfirmBooking,
  isSubmitting,
  confirmedBooking,
  language,
  onViewAppointments,
}: LabBookingModalProps) {
  const isHi = language === 'hi';
  const { user } = useAuth();
  const { members } = useFamily();
  const { activeAddress, currentLocationName, savedAddresses, selectAddress, openLocationPicker } = useLocation();
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);

  // Mode: Home Sample Collection vs Diagnostic Centre Walk-in (Home collection active within 25 km radius)
  const hasScanItems = selectedItems.some((i) => i.segment === 'scan');
  const isWithinHomeRadius = (selectedCentre?.distanceKm ?? 0) <= 25;
  const canDoHome = Boolean(selectedCentre?.home && isWithinHomeRadius && !hasScanItems);
  const [collectionMode, setCollectionMode] = useState<'HOME_COLLECTION' | 'CENTRE_VISIT'>('CENTRE_VISIT');

  const [selectedPatientId, setSelectedPatientId] = useState<string>('self');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<string>('07:30 AM');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false);

  // Default to home collection if available
  useEffect(() => {
    if (visible && !confirmedBooking) {
      setCollectionMode(canDoHome ? 'HOME_COLLECTION' : 'CENTRE_VISIT');
      setSelectedPatientId('self');
      setSelectedDayIndex(0);
      setSelectedSlot('07:30 AM');
    }
  }, [visible, confirmedBooking, canDoHome]);

  const hasValidUserPhone = Boolean(
    user?.phone &&
    !user.phone.startsWith('+9100') &&
    !user.phone.startsWith('+910') &&
    user.phone !== '+91 99999 99999'
  );
  const effectiveSelfName = user?.full_name || (isHi ? 'रोगी' : 'Patient');
  const effectiveSelfPhone = hasValidUserPhone ? user?.phone || '' : '';

  const familyMembers = useMemo<Member[]>(() => members.filter((m: Member) => m.id !== 'self'), [members]);
  const selectedMember = familyMembers.find((m: Member) => m.id === selectedPatientId);
  const currentPatientName = selectedMember
    ? `${selectedMember.name} (${getRelationLabel(selectedMember.relation, isHi)})`
    : effectiveSelfName;
  const currentPatientPhone = effectiveSelfPhone;

  // Address for Home Collection
  const resolvedAddress = useMemo(() => {
    if (activeAddress) {
      const typeLabel = activeAddress.type === 'Home' ? (isHi ? 'घर' : 'Home') : activeAddress.type === 'Work' ? (isHi ? 'दफ़्तर' : 'Work') : activeAddress.label || (isHi ? 'अन्य' : 'Other');
      return `${typeLabel}: ${activeAddress.landmark_street || activeAddress.house_flat || ''}, ${activeAddress.city || 'Jaipur'}`;
    }
    return currentLocationName || 'Surajpole Gate, Jaipur';
  }, [activeAddress, currentLocationName, isHi]);

  // Fasting requirement check
  const maxFastingHrs = useMemo(() => {
    let max = 0;
    for (const it of selectedItems) {
      if (it.fastingHrs && it.fastingHrs > max) max = it.fastingHrs;
    }
    return max;
  }, [selectedItems]);

  // 7-day rolling window
  const dateOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });

      let label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dayName;
      let labelHi = isToday ? 'आज' : isTomorrow ? 'कल' : dayName;

      list.push({
        index: i,
        label,
        labelHi,
        dateFormatted,
        fullStr: isToday ? `Today, ${dateFormatted}` : isTomorrow ? `Tomorrow, ${dateFormatted}` : `${dayName}, ${dateFormatted}`,
      });
    }
    return list;
  }, []);

  const morningSlots = [
    '06:30 AM',
    '07:00 AM',
    '07:30 AM',
    '08:00 AM',
    '08:30 AM',
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
  ];

  const composedSlot = `${dateOptions[selectedDayIndex]?.fullStr || 'Tomorrow'} · ${selectedSlot}`;

  const handleProceedToPayment = () => {
    if (!hasValidUserPhone) {
      setIsVerifyPhoneOpen(true);
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  if (!selectedCentre) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: Platform.OS === 'web' ? 24 : 32,
              maxHeight: '92%',
              maxWidth: 640,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: confirmedBooking ? '#ECFDF5' : '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {confirmedBooking ? (
                    <CheckCircle2 size={18} color="#10B981" />
                  ) : (
                    <Building2 size={18} color="#2563EB" />
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    {confirmedBooking
                      ? isHi
                        ? 'जांच बुकिंग सुरक्षित!'
                        : 'Lab Booking Confirmed!'
                      : isHi
                        ? 'जांच व स्कैन बुकिंग'
                        : 'Confirm Diagnostics Booking'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                    {selectedCentre.name}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Body */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
              {confirmedBooking ? (
                /* CONFIRMED STATE */
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#DCFCE7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <CheckCircle2 size={32} color="#16A34A" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                    {isHi ? 'जांच बुकिंग सफल!' : 'Lab Booking Confirmed!'}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#16A34A', marginTop: 4 }}>
                    #{confirmedBooking.booking_ref}
                  </Text>

                  {/* Summary Card */}
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 14,
                      marginTop: 14,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'रोगी:' : 'Patient:'}</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                        {confirmedBooking.patient_name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'केंद्र / लैब:' : 'Lab Centre:'}</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                        {confirmedBooking.hospital_name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'समय (स्लॉट):' : 'Slot:'}</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#D97706' }}>
                        {confirmedBooking.slot_time}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'कुल शुल्क:' : 'Total Amount:'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#16A34A' }}>
                        ₹{confirmedBooking.doctor_fee} ({isHi ? 'ऑनलाइन भुगतान पूर्ण' : 'Paid Online'})
                      </Text>
                    </View>
                  </View>

                  {/* Digital QR Entry Pass */}
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 18,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      marginTop: 14,
                      alignItems: 'center',
                    }}
                  >
                    <AppointmentQrCode
                      bookingRef={confirmedBooking.booking_ref}
                      tokenNumber={12}
                      patientName={confirmedBooking.patient_name}
                      doctorName={confirmedBooking.doctor_name || 'Lab Panel'}
                      hospitalName={confirmedBooking.hospital_name || 'Diagnostic Partner'}
                      slotTime={confirmedBooking.slot_time || 'Tomorrow, 07:30 AM'}
                      size={130}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 10 }}>
                      {isHi ? 'डिजिटल लैब प्रवेश पास' : 'Digital Lab Fast-Track Pass'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                      {isHi
                        ? 'लैब रिसेप्शन या फ्लेबोटोमिस्ट को यह QR कोड दिखाएं'
                        : 'Show this QR pass at lab reception or to the home phlebotomist'}
                    </Text>
                    {(confirmedBooking as any).verification_code ? (
                      <View
                        style={{
                          marginTop: 10,
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1.5,
                          borderColor: '#2563EB',
                          borderRadius: 12,
                          paddingHorizontal: 18,
                          paddingVertical: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#1E40AF', letterSpacing: 0.5 }}>
                          {isHi ? 'सैंपल कलेक्शन सत्यापन OTP' : 'SAMPLE COLLECTION VERIFICATION OTP'}
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1D4ED8', letterSpacing: 6, marginTop: 2 }}>
                          {(confirmedBooking as any).verification_code}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Action */}
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      if (onViewAppointments) onViewAppointments();
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563EB',
                      paddingVertical: 13,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 16,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                      {isHi ? 'मेरी अपॉइंटमेंट्स में देखें' : 'View in My Appointments'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* BOOKING FORM */
                <View>
                  {/* 1. SELECTED TESTS STRIP & FASTING NOTICE */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 12,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      {isHi ? 'चयनित टेस्ट व स्कैन:' : 'Selected Tests & Scans:'}
                    </Text>
                    <View style={{ gap: 4 }}>
                      {selectedItems.map((item) => (
                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', flex: 1 }} numberOfLines={1}>
                            • {isHi && item.nameHi ? item.nameHi : item.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            {item.reportHrs}h report
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Fasting Notice Badge */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: maxFastingHrs > 0 ? '#FEF3C7' : '#EFF6FF',
                        borderRadius: 10,
                        padding: 8,
                        marginTop: 10,
                        borderWidth: 1,
                        borderColor: maxFastingHrs > 0 ? '#FDE68A' : '#BFDBFE',
                      }}
                    >
                      <AlertCircle size={14} color={maxFastingHrs > 0 ? '#D97706' : '#2563EB'} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: maxFastingHrs > 0 ? '#92400E' : '#1E40AF', flex: 1 }}>
                        {maxFastingHrs > 0
                          ? isHi
                            ? `⚠️ इस जांच हेतु ${maxFastingHrs} घंटे खाली पेट (फास्टिंग) रहना अनिवार्य है। केवल पानी पी सकते हैं।`
                            : `⚠️ Fasting required: Minimum ${maxFastingHrs} hours fasting before blood sample collection. Only plain water allowed.`
                          : isHi
                            ? '✅ किसी उपवास की आवश्यकता नहीं है। आप सामान्य आहार ले सकते हैं।'
                            : '✅ No fasting required. You can have regular meals before this test.'}
                      </Text>
                    </View>
                  </View>

                  {/* 2. COLLECTION MODE SWITCHER */}
                  {selectedCentre?.home && !hasScanItems && !isWithinHomeRadius && (
                    <View
                      style={{
                        marginTop: 12,
                        backgroundColor: '#FFFBEB',
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <MapPin size={15} color="#D97706" />
                      <Text style={{ fontSize: 11.5, color: '#92400E', flex: 1, lineHeight: 16 }}>
                        {isHi
                          ? `आपकी लोकेशन जांच केंद्र से ${selectedCentre.distanceKm} km दूर है। होम सैंपल कलेक्शन 25 km के दायरे में उपलब्ध है — यह बुकिंग सेंटर विज़िट के रूप में होगी।`
                          : `Your location is ${selectedCentre.distanceKm} km away. Free home sample collection is available within 25 km — this booking is set to Centre Walk-in.`}
                      </Text>
                    </View>
                  )}

                  {canDoHome && (
                    <View style={{ marginTop: 14 }}>
                      {selectedCentre?.id !== 'adityam-home-collection' && (
                        <>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                            {isHi ? 'सैंपल कलेक्शन का तरीका:' : 'Collection Mode:'}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            {/* Home Collection Option */}
                            <TouchableOpacity
                              onPress={() => setCollectionMode('HOME_COLLECTION')}
                              activeOpacity={0.8}
                              style={{
                                flex: 1,
                                padding: 12,
                                borderRadius: 14,
                                borderWidth: 1.5,
                                backgroundColor: collectionMode === 'HOME_COLLECTION' ? '#EFF6FF' : '#FFFFFF',
                                borderColor: collectionMode === 'HOME_COLLECTION' ? '#2563EB' : '#E2E8F0',
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <HomeIcon size={16} color={collectionMode === 'HOME_COLLECTION' ? '#2563EB' : '#64748B'} />
                                <Text style={{ fontSize: 12.5, fontWeight: '800', color: collectionMode === 'HOME_COLLECTION' ? '#1E40AF' : '#0F172A' }}>
                                  {isHi ? 'घर पर सैंपल' : 'Home Collection'}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10.5, color: '#16A34A', fontWeight: '800', marginTop: 4 }}>
                                {isHi ? 'मुफ़्त विज़िट (₹0)' : 'FREE Phlebotomist'}
                              </Text>
                            </TouchableOpacity>

                            {/* Centre Walk-in Option */}
                            <TouchableOpacity
                              onPress={() => setCollectionMode('CENTRE_VISIT')}
                              activeOpacity={0.8}
                              style={{
                                flex: 1,
                                padding: 12,
                                borderRadius: 14,
                                borderWidth: 1.5,
                                backgroundColor: collectionMode === 'CENTRE_VISIT' ? '#EFF6FF' : '#FFFFFF',
                                borderColor: collectionMode === 'CENTRE_VISIT' ? '#2563EB' : '#E2E8F0',
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Building2 size={16} color={collectionMode === 'CENTRE_VISIT' ? '#2563EB' : '#64748B'} />
                                <Text style={{ fontSize: 12.5, fontWeight: '800', color: collectionMode === 'CENTRE_VISIT' ? '#1E40AF' : '#0F172A' }}>
                                  {isHi ? 'सेंटर पर जाएं' : 'Visit Centre'}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '700', marginTop: 4 }}>
                                {selectedCentre.distanceKm} km · Fast-track
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}

                      {/* Address selector dropdown if Home Collection */}
                      {collectionMode === 'HOME_COLLECTION' && (
                        <View style={{ marginTop: 8, gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderRadius: 12,
                              padding: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                            }}
                          >
                            <MapPin size={14} color="#2563EB" />
                            <TouchableOpacity
                              onPress={() => setAddressDropdownOpen((v) => !v)}
                              style={{ flex: 1 }}
                            >
                              <Text style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>
                                {isHi ? 'सैंपल पिकअप पता:' : 'Sample Collection Address:'}
                              </Text>
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                                {resolvedAddress} {savedAddresses.length > 0 ? (addressDropdownOpen ? '▲' : '▼') : ''}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={openLocationPicker}
                              style={{
                                backgroundColor: '#EFF6FF',
                                borderWidth: 1,
                                borderColor: '#BFDBFE',
                                paddingHorizontal: 9,
                                paddingVertical: 5,
                                borderRadius: 8,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                                {isHi ? '+ नया पता' : '+ Add Address'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {addressDropdownOpen && savedAddresses.length > 0 && (
                            <View
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                padding: 6,
                                gap: 4,
                              }}
                            >
                              {savedAddresses.map((addr) => {
                                const isSel = activeAddress?.id === addr.id;
                                return (
                                  <TouchableOpacity
                                    key={addr.id}
                                    onPress={() => {
                                      selectAddress(addr.id);
                                      setAddressDropdownOpen(false);
                                    }}
                                    style={{
                                      paddingHorizontal: 10,
                                      paddingVertical: 8,
                                      borderRadius: 8,
                                      backgroundColor: isSel ? '#EFF6FF' : 'transparent',
                                    }}
                                  >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#1D4ED8' : '#0F172A' }}>
                                      {addr.label}: {addr.landmark_street}, {addr.city} - {addr.pincode}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {/* 3. PATIENT SELECTOR */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                      {isHi ? 'रोगी चुनें:' : 'Select Patient:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {/* Self */}
                      <TouchableOpacity
                        onPress={() => setSelectedPatientId('self')}
                        activeOpacity={0.8}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: selectedPatientId === 'self' ? '#1E40AF' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: selectedPatientId === 'self' ? '#1E40AF' : '#E2E8F0',
                        }}
                      >
                        <User size={13} color={selectedPatientId === 'self' ? '#FFFFFF' : '#475569'} />
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: selectedPatientId === 'self' ? '#FFFFFF' : '#334155' }}>
                          {effectiveSelfName} ({isHi ? 'स्वयं' : 'Self'})
                        </Text>
                      </TouchableOpacity>

                      {/* Dependents */}
                      {familyMembers.map((mem) => {
                        const isSel = selectedPatientId === mem.id;
                        return (
                          <TouchableOpacity
                            key={mem.id}
                            onPress={() => setSelectedPatientId(mem.id)}
                            activeOpacity={0.8}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              backgroundColor: isSel ? '#1E40AF' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isSel ? '#1E40AF' : '#E2E8F0',
                            }}
                          >
                            <Users size={13} color={isSel ? '#FFFFFF' : '#475569'} />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                              {mem.name} ({getRelationLabel(mem.relation, isHi)})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 4. DATE PICKER */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                      {isHi ? 'तारीख चुनें:' : 'Select Date:'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                      {dateOptions.map((opt) => {
                        const isSelected = selectedDayIndex === opt.index;
                        return (
                          <TouchableOpacity
                            key={opt.index}
                            onPress={() => setSelectedDayIndex(opt.index)}
                            activeOpacity={0.8}
                            style={{
                              minWidth: 84,
                              paddingVertical: 9,
                              paddingHorizontal: 10,
                              borderRadius: 12,
                              borderWidth: 1.5,
                              backgroundColor: isSelected ? '#1E40AF' : '#FFFFFF',
                              borderColor: isSelected ? '#1E40AF' : '#CBD5E1',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: isSelected ? '#BFDBFE' : '#64748B' }}>
                              {isHi ? opt.labelHi : opt.label}
                            </Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '900', color: isSelected ? '#FFFFFF' : '#0F172A', marginTop: 2 }}>
                              {opt.dateFormatted}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* 5. MORNING FASTING SLOTS */}
                  <View style={{ marginTop: 14, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                      {isHi ? 'सैंपल कलेक्शन समय (स्लॉट):' : 'Sample Collection Time Slot:'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {morningSlots.map((slot) => {
                        const isSel = selectedSlot === slot;
                        return (
                          <TouchableOpacity
                            key={slot}
                            onPress={() => setSelectedSlot(slot)}
                            activeOpacity={0.8}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: isSel ? '#2563EB' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isSel ? '#2563EB' : '#CBD5E1',
                            }}
                          >
                            <Clock size={11} color={isSel ? '#FFFFFF' : '#64748B'} />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? '#FFFFFF' : '#334155' }}>
                              {slot}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 6. PRICE & SAVINGS STRIP */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 12,
                      marginTop: 14,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {isHi ? 'जांच केंद्र एमआरपी:' : 'Standard MRP:'} <Text style={{ textDecorationLine: 'line-through' }}>₹{Math.round(totalAmount * 1.25)}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '800' }}>
                        {isHi ? 'आदित्यम 20% छूट:' : 'Adityam 20% off:'} −₹{Math.round(totalAmount * 0.25)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#16A34A' }}>
                      {inr(totalAmount)}
                    </Text>
                  </View>

                  {/* 7. SINGLE ONLINE PAYMENT ACTION */}
                  <View style={{ marginTop: 16 }}>
                    <TouchableOpacity
                      onPress={handleProceedToPayment}
                      disabled={isSubmitting}
                      activeOpacity={0.88}
                      style={{
                        width: '100%',
                        backgroundColor: '#16A34A',
                        paddingVertical: 14,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        shadowColor: '#16A34A',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.28,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      <Lock size={15} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                        {isHi
                          ? `ऑनलाइन भुगतान करें • ${inr(totalAmount)} → डिजिटल पास पाएं`
                          : `Pay Online • ${inr(totalAmount)} → Get Lab Pass`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Verify Phone Modal for unverified users */}
      <VerifyPhoneModal
        visible={isVerifyPhoneOpen}
        onClose={() => setIsVerifyPhoneOpen(false)}
        onSuccess={() => {
          setIsVerifyPhoneOpen(false);
          setIsPaymentModalOpen(true);
        }}
        isHi={isHi}
        title={isHi ? 'लैब पास हेतु मोबाइल सत्यापन' : 'Verify Phone for Lab Pass'}
        subtitle={
          isHi
            ? 'जांच रिपोर्ट सीधे आपके फोन पर भेजने व फ्लेबोटोमिस्ट समन्वय हेतु 10-अंकों का मोबाइल नंबर सत्यापित करें।'
            : 'Diagnostic centres require your verified phone to coordinate sample collection and dispatch digital reports.'
        }
      />

      {/* Dedicated Payment Gateway Modal */}
      {selectedCentre && (
        <PaymentGatewayModal
          visible={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          amount={totalAmount}
          serviceTitle={selectedItems.map((i) => i.name).slice(0, 2).join(', ')}
          providerName={selectedCentre.name}
          patientName={currentPatientName}
          onPaymentSuccess={(method, txnId) => {
            setIsPaymentModalOpen(false);
            onConfirmBooking(
              currentPatientName,
              currentPatientPhone,
              collectionMode,
              resolvedAddress,
              composedSlot,
              method,
              txnId
            );
          }}
        />
      )}
    </>
  );
}

