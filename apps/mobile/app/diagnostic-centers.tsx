import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  Building2,
  Clock,
  Calendar,
  CheckCircle2,
  X,
  Check,
  Sparkles,
  Award,
  PhoneCall,
  ArrowRight,
  Info,
  Tag,
  Home as HomeIcon,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';

interface NearbyCenter {
  id: string;
  name: string;
  area: string;
  distance: string;
  rating: string;
  reviewsCount: number;
  accreditations: string[];
  equipmentTag: string;
  nextSlot: string;
  centerPrice: number;
  originalPrice: number;
  discountPercent: number;
  address: string;
}

export default function DiagnosticCentersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    category?: string;
    price?: string;
    originalPrice?: string;
    discountPercent?: string;
    tag?: string;
    sampleType?: string;
    locationType?: string;
    reportTime?: string;
    fasting?: string;
  }>();

  const testTitle = params.title || 'Digital Chest X-Ray (PA View)';
  const testTag = params.tag || 'X-RAY';
  const testCategory = params.category || 'Radiology';
  const basePrice = parseInt(params.price || '399', 10);
  const baseOriginalPrice = parseInt(params.originalPrice || '750', 10);
  const baseDiscount = params.discountPercent || '47';
  const reportTime = params.reportTime || 'Reports in 2 hrs';
  const fasting = params.fasting || 'No Fasting Required';
  const isCenterOnly = params.locationType === 'center_only';

  // Slot Booking Modal State
  const [selectedCenter, setSelectedCenter] = useState<NearbyCenter | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [patientName, setPatientName] = useState(user?.full_name || 'Hardik Gupta');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98112 44550');
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState('02:30 PM - 03:30 PM (Priority Pass)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Filter Centers by Area / Distance
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('All');

  // Nearby Diagnostic Centers Catalog
  const nearbyCenters: NearbyCenter[] = useMemo(() => {
    return [
      {
        id: 'center-apollo-saket',
        name: 'Apollo Diagnostics & Imaging Center',
        area: 'Saket',
        distance: '1.2 km away',
        rating: '4.9',
        reviewsCount: 480,
        accreditations: ['NABL Accredited', 'CAP Certified'],
        equipmentTag: 'High-Frequency Digital Equipment',
        nextSlot: 'Today, 02:30 PM',
        centerPrice: basePrice,
        originalPrice: baseOriginalPrice,
        discountPercent: parseInt(baseDiscount, 10),
        address: 'Plot No. 4, Saket District Centre, Sector 6, Pushp Vihar, New Delhi',
      },
      {
        id: 'center-mahajan-hauzkhas',
        name: 'Mahajan Imaging & Diagnostic Scan Hub',
        area: 'Hauz Khas',
        distance: '2.4 km away',
        rating: '4.9',
        reviewsCount: 620,
        accreditations: ['NABH Accredited', 'AERB Approved'],
        equipmentTag: 'Ultra Low-Radiation 3 Tesla / DR',
        nextSlot: 'Today, 03:00 PM',
        centerPrice: Math.round(basePrice * 1.08),
        originalPrice: Math.round(baseOriginalPrice * 1.1),
        discountPercent: parseInt(baseDiscount, 10),
        address: 'K-18, Hauz Khas Enclave, Near Aurobindo Marg, New Delhi',
      },
      {
        id: 'center-max-saket',
        name: 'Max Lab & Diagnostic Services',
        area: 'Saket',
        distance: '3.1 km away',
        rating: '4.8',
        reviewsCount: 390,
        accreditations: ['Hospital Partner', 'NABL Certified'],
        equipmentTag: 'Senior MD Radiologist On-Duty',
        nextSlot: 'Tomorrow, 08:30 AM',
        centerPrice: Math.round(basePrice * 1.15),
        originalPrice: Math.round(baseOriginalPrice * 1.15),
        discountPercent: parseInt(baseDiscount, 10) - 2,
        address: '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
      },
      {
        id: 'center-city-xray',
        name: 'City X-Ray & Comprehensive Scan Clinic',
        area: 'Malviya Nagar',
        distance: '3.8 km away',
        rating: '4.8',
        reviewsCount: 310,
        accreditations: ['NABL Accredited', 'ISO 9001:2015'],
        equipmentTag: 'Direct Digital Radiography (DDR)',
        nextSlot: 'Today, 04:00 PM',
        centerPrice: Math.round(basePrice * 0.95),
        originalPrice: baseOriginalPrice,
        discountPercent: parseInt(baseDiscount, 10) + 2,
        address: 'Main Shivalik Road, Malviya Nagar, New Delhi',
      },
      {
        id: 'center-lalpath-southex',
        name: 'Dr Lal PathLabs & Imaging Hub',
        area: 'South Ext',
        distance: '4.5 km away',
        rating: '4.8',
        reviewsCount: 510,
        accreditations: ['NABL Certified', 'CAP Partner'],
        equipmentTag: 'Zero Wait-Time Partner',
        nextSlot: 'Tomorrow, 09:30 AM',
        centerPrice: basePrice,
        originalPrice: baseOriginalPrice,
        discountPercent: parseInt(baseDiscount, 10),
        address: 'G-8, South Extension Part-1, Ring Road, New Delhi',
      },
    ];
  }, [basePrice, baseOriginalPrice, baseDiscount]);

  const filteredCenters = useMemo(() => {
    if (selectedAreaFilter === 'All') return nearbyCenters;
    return nearbyCenters.filter((c) => c.area === selectedAreaFilter);
  }, [nearbyCenters, selectedAreaFilter]);

  const handleOpenBooking = (center: NearbyCenter) => {
    setSelectedCenter(center);
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleConfirmCenterBooking = async () => {
    if (!selectedCenter) return;
    setIsSubmitting(true);

    const bookingRef = `AN-SCAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'INVESTIGATION',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: selectedCenter.name,
      doctor_fee: selectedCenter.centerPrice,
      slot_time: `${selectedDate}, ${selectedSlot}`,
      specialty_requested: `${testTitle} at ${selectedCenter.name}`,
      status: 'NEW',
      call_status: 'pending',
      notes: `Center: ${selectedCenter.name}. Address: ${selectedCenter.address}. Masked booking created.`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback handling
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedBooking(newBooking);
    }, 700);
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      {/* 1. Header in Royal Medical Blue with Back Button */}
      <LinearGradient
        colors={['#172554', '#1E40AF', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top, 24) + 8,
          paddingHorizontal: 16,
          paddingBottom: 20,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          shadowColor: '#1E3A8A',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 14,
          elevation: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow circle */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -40,
            right: -30,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        />

        {/* Top Navigation Row */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            className="w-10 h-10 rounded-full bg-white/20 border border-white/30 items-center justify-center"
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          <View className="flex-row items-center space-x-1.5 bg-white/20 px-3 py-1 rounded-full border border-white/30">
            <ShieldCheck size={12} color="#FFFFFF" />
            <Text className="text-[10.5px] font-bold text-white">NABL & AERB Verified</Text>
          </View>
        </View>

        {/* Title */}
        <View className="mt-1">
          <View className="flex-row items-center space-x-2 mb-1">
            <View className="bg-white/20 px-2 py-0.5 rounded-md border border-white/30">
              <Text className="text-[9.5px] font-black text-white uppercase tracking-wider">
                {testTag}
              </Text>
            </View>
            <Text className="text-blue-100 text-xs font-semibold">
              {testCategory} Catalog
            </Text>
          </View>
          <Text className="text-2xl font-black text-white tracking-tight leading-7">
            {testTitle}
          </Text>
          <Text className="text-xs text-blue-100 mt-1 font-medium">
            Compare nearby centers, ratings, special offers & book zero-wait slots
          </Text>
        </View>
      </LinearGradient>

      {/* 2. Scrollable Body */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 30,
        }}
      >
        {/* Test Overview Card */}
        <View className="px-4 mt-4">
          <View className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center space-x-2">
                <Clock size={14} color="#2563EB" />
                <Text className="text-xs font-bold text-slate-700">{reportTime}</Text>
              </View>
              <View className="flex-row items-center space-x-1">
                <Text className="text-xs font-semibold text-slate-500">{fasting}</Text>
              </View>
            </View>

            {/* Preparation and Doctor Review info */}
            <View className="mt-3 flex-row items-start space-x-2.5">
              <View className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center shrink-0 mt-0.5">
                <Award size={16} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-slate-900">
                  Certified Senior MD Radiologist Interpretation
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5 leading-4">
                  High-resolution digital scan copies delivered instantly to WhatsApp & app vault with physician-signed reports.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Exclusive Platform Offer Banner */}
        <View className="px-4 mt-3.5">
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl p-3.5 border border-blue-200 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-2.5 flex-1 pr-2">
              <View className="w-9 h-9 rounded-xl bg-[#2563EB] items-center justify-center">
                <Tag size={16} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-blue-950">
                  Adityam Special: Flat {baseDiscount}% Subsidy Applied
                </Text>
                <Text className="text-[10.5px] text-blue-800 mt-0.5">
                  Exclusive negotiated rate at all verified partner diagnostic centers
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Filter by Area Strip */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Nearby Scanning Centers ({filteredCenters.length})
            </Text>
            <View className="flex-row items-center space-x-1">
              <MapPin size={12} color="#2563EB" />
              <Text className="text-[11px] font-bold text-[#2563EB]">South Delhi NCR</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {['All', 'Saket', 'Hauz Khas', 'Malviya Nagar', 'South Ext'].map((area) => (
              <TouchableOpacity
                key={area}
                onPress={() => setSelectedAreaFilter(area)}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  selectedAreaFilter === area
                    ? 'bg-[#2563EB] border-[#2563EB]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    selectedAreaFilter === area ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Nearby Centers List */}
        <View className="px-4 mt-3.5" style={{ rowGap: 12 }}>
          {filteredCenters.map((center) => (
            <View
              key={center.id}
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm"
              style={{
                shadowColor: '#1E3A8A',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              {/* Top Row: Distance & Rating */}
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center space-x-1 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                  <MapPin size={11} color="#2563EB" />
                  <Text className="text-[10px] font-black text-[#2563EB]">
                    {center.distance}
                  </Text>
                </View>

                <View className="flex-row items-center space-x-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Star size={11} color="#D97706" fill="#D97706" />
                  <Text className="text-[10px] font-black text-amber-800">
                    {center.rating} ({center.reviewsCount})
                  </Text>
                </View>
              </View>

              {/* Center Name */}
              <Text className="text-base font-black text-[#0F172A] leading-snug">
                {center.name}
              </Text>
              <Text className="text-xs text-slate-500 mt-1 leading-4" numberOfLines={2}>
                {center.address}
              </Text>

              {/* Accreditations & Specs Pills */}
              <View className="flex-row flex-wrap items-center gap-1.5 mt-2.5">
                {center.accreditations.map((acc, idx) => (
                  <View
                    key={idx}
                    className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md"
                  >
                    <Text className="text-[9.5px] font-bold text-slate-600">{acc}</Text>
                  </View>
                ))}
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <Text className="text-[9.5px] font-bold text-emerald-700">
                    {center.equipmentTag}
                  </Text>
                </View>
              </View>

              {/* Next Slot pill */}
              <View className="mt-2.5 flex-row items-center space-x-1">
                <Clock size={11} color="#10B981" />
                <Text className="text-[11px] font-semibold text-emerald-700">
                  Next Available Slot: {center.nextSlot}
                </Text>
              </View>

              {/* Bottom Row: Price & Booking Action */}
              <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
                <View>
                  <View className="flex-row items-baseline space-x-1.5">
                    <Text className="text-xl font-black text-[#0F172A]">
                      ₹{center.centerPrice}
                    </Text>
                    <Text className="text-xs line-through text-slate-400 font-medium">
                      ₹{center.originalPrice}
                    </Text>
                  </View>
                  <Text className="text-[10px] font-bold text-emerald-600">
                    Save ₹{center.originalPrice - center.centerPrice} ({center.discountPercent}% OFF)
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleOpenBooking(center)}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="px-4 py-2 rounded-xl flex-row items-center space-x-1.5 shadow-2xs"
                  >
                    <Text className="text-white text-xs font-black">Select & Book</Text>
                    <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* SLOT BOOKING MODAL */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[88%]">
            {confirmedBooking ? (
              <View className="py-6 items-center">
                <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-3">
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text className="text-xl font-black text-slate-900 text-center">
                  Appointment Confirmed!
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1 px-4 leading-relaxed">
                  Your priority scan slot has been reserved at {selectedCenter?.name}. Zero wait time pass generated.
                </Text>

                <View className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/80 my-4 space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Booking ID</Text>
                    <Text className="text-xs font-black text-blue-600">
                      {confirmedBooking.booking_ref}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Center</Text>
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                      {selectedCenter?.name}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Slot Timing</Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {confirmedBooking.slot_time}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Total Payable</Text>
                    <Text className="text-xs font-black text-emerald-600">
                      ₹{confirmedBooking.doctor_fee} (Pay at Center)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setBookingModalVisible(false);
                    router.back();
                  }}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center"
                >
                  <Text className="text-white text-sm font-black">Back to Diagnostics</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-black text-slate-900">
                      Book Slot at Center
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {selectedCenter?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBookingModalVisible(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Center & Price Summary */}
                <View className="bg-blue-50/80 p-3 rounded-2xl border border-blue-100 my-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] font-bold text-[#2563EB] uppercase">
                      Subsidized Fee
                    </Text>
                    <Text className="text-base font-black text-slate-900">
                      ₹{selectedCenter?.centerPrice}
                    </Text>
                  </View>
                  <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
                    <Text className="text-[10px] font-black text-emerald-800">
                      PRIORITY PASS INCLUDED
                    </Text>
                  </View>
                </View>

                {/* Patient Information */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Patient Full Name
                </Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter patient full name"
                />

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Phone Number
                </Text>
                <TextInput
                  value={patientPhone}
                  onChangeText={setPatientPhone}
                  keyboardType="phone-pad"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter 10-digit mobile number"
                />

                {/* Date Selection */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Select Date
                </Text>
                <View className="flex-row space-x-2 mb-3">
                  {['Today', 'Tomorrow', 'Day After'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setSelectedDate(d)}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        selectedDate === d
                          ? 'bg-blue-50 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          selectedDate === d ? 'text-[#2563EB]' : 'text-slate-600'
                        }`}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Slot Selection */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Select Time Slot
                </Text>
                <View style={{ rowGap: 8 }} className="mb-4">
                  {[
                    '09:00 AM - 10:30 AM (Morning)',
                    '11:00 AM - 01:00 PM (Noon)',
                    '02:30 PM - 04:00 PM (Afternoon)',
                    '04:30 PM - 06:30 PM (Evening)',
                  ].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSelectedSlot(s)}
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${
                        selectedSlot === s
                          ? 'bg-blue-50 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          selectedSlot === s ? 'text-[#2563EB] font-bold' : 'text-slate-700'
                        }`}
                      >
                        {s}
                      </Text>
                      {selectedSlot === s && <CheckCircle2 size={16} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleConfirmCenterBooking}
                  disabled={isSubmitting}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-black">
                      Confirm Booking (Pay ₹{selectedCenter?.centerPrice} at Center)
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
