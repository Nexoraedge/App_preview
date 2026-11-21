// apps/mobile/components/opd/BookingSlotModal.tsx
// Booking confirmation modal & slot picker bottom sheet for OPD
// Features real patient selector (Self vs Dependents), instant persistent booking,
// and NMC Telemedicine Compliance Charter.

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Users,
  ShieldCheck,
  Ticket,
  ChevronRight,
  Info,
  Lock,
  CreditCard,
  Sun,
  Moon,
  Building2,
  Phone,
  MapPin,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import type { Doctor, Booking, Dependent } from '@adityam/types';
import {
  translateDoctorName,
  translateHospitalName,
  translateSpecialty,
  translateQualification,
  translateTiming,
} from '../../src/utils/hindiDictionary';
import { calculateDoctorSlots } from '../../src/data/opdData';
import { useAuth } from '../../src/context/AuthContext';
import { useFamily, getRelationLabel, type Member } from '../../src/context/FamilyContext';
import { inr } from '../../src/theme';
import { getSupabaseClient } from '../../src/lib/supabase';
import { PaymentGatewayModal, PaymentMethod } from '../payment/PaymentGatewayModal';
import { AppointmentQrCode } from '../ui/AppointmentQrCode';
import { VerifyPhoneModal } from '../auth/VerifyPhoneModal';

interface BookingTarget {
  doctor: Doctor;
  slot: string;
  hospitalName: string;
}

export interface DayOption {
  key: string;
  dayLabel: string;
  dayLabelHi: string;
  dateLabel: string;
  fullDateStr: string;
  isToday: boolean;
  isClosed: boolean;
}

export function isDoctorAvailableOnDay(timingStr: string | undefined, date: Date): boolean {
  if (!timingStr) return true;
  const dayIndex = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const timingLower = timingStr.toLowerCase();

  // If Mon-Fri specified, Saturday & Sunday are closed
  if (timingLower.includes('mon-fri') || timingLower.includes('monday-friday')) {
    return dayIndex >= 1 && dayIndex <= 5;
  }
  // If Mon-Sat specified, Sunday is closed
  if (timingLower.includes('mon-sat') || timingLower.includes('monday-saturday')) {
    return dayIndex >= 1 && dayIndex <= 6;
  }
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayShort = dayNames[dayIndex];
  if (timingLower.includes(dayShort)) {
    return true;
  }
  // Default medical standard: closed on Sundays
  return dayIndex !== 0;
}

export function isSlotBookable(
  slotTimeStr: string,
  isToday: boolean
): { bookable: boolean; reason?: 'passed' | 'buffer' | 'full' } {
  if (!isToday) return { bookable: true };

  const match = slotTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return { bookable: true };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = hours * 60 + minutes;

  // Slot has already passed
  if (slotMinutes <= currentMinutes) {
    return { bookable: false, reason: 'passed' };
  }

  // 1-hour advance buffer (60 minutes): doctor unavailable for last-minute booking
  if (slotMinutes - currentMinutes < 60) {
    return { bookable: false, reason: 'buffer' };
  }

  return { bookable: true };
}

interface BookingSlotModalProps {
  visible: boolean;
  onClose: () => void;
  confirmedBooking: Booking | null;
  bookingTargetDoctor: BookingTarget | null;
  selectedModalSlot: string;
  onSelectModalSlot: (slot: string) => void;
  isSubmitting: boolean;
  onConfirmBooking: (
    patientName: string,
    patientPhone: string,
    paymentMethod?: string,
    txnId?: string,
    reason?: string,
    slot?: string
  ) => void;
  userPhone?: string | null;
  userName?: string | null;
  language: 'en' | 'hi';
  onViewAppointments?: () => void;
}

export function BookingSlotModal({
  visible,
  onClose,
  confirmedBooking,
  bookingTargetDoctor,
  selectedModalSlot,
  onSelectModalSlot,
  isSubmitting,
  onConfirmBooking,
  userPhone,
  userName,
  language,
  onViewAppointments,
}: BookingSlotModalProps) {
  const isHi = language === 'hi';
  const { user } = useAuth();
  const { members } = useFamily();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('self');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<'morning' | 'evening'>('morning');
  const [selectedSymptom, setSelectedSymptom] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');

  // 7-day rolling window with doctor timing closure detection
  const dateOptions = useMemo<DayOption[]>(() => {
    const options: DayOption[] = [];
    const timing = bookingTargetDoctor?.doctor.opd_timing;
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);

      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dateFormatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const isClosed = !isDoctorAvailableOnDay(timing, d);

      let dayLabel = dayName;
      let dayLabelHi = dayName;

      if (isToday) {
        dayLabel = 'Today';
        dayLabelHi = 'आज';
      } else if (isTomorrow) {
        dayLabel = 'Tomorrow';
        dayLabelHi = 'कल';
      } else {
        const hiWeekdays: Record<string, string> = {
          Mon: 'सोम',
          Tue: 'मंगल',
          Wed: 'बुध',
          Thu: 'गुरु',
          Fri: 'शुक्र',
          Sat: 'शनि',
          Sun: 'रवि',
        };
        dayLabelHi = hiWeekdays[dayName] || dayName;
      }

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      options.push({
        key,
        dayLabel,
        dayLabelHi,
        dateLabel: dateFormatted,
        fullDateStr: isToday ? `Today, ${dateFormatted}` : isTomorrow ? `Tomorrow, ${dateFormatted}` : `${dayLabel}, ${dateFormatted}`,
        isToday,
        isClosed,
      });
    }
    return options;
  }, [bookingTargetDoctor?.doctor.opd_timing]);

  // Reset state on each modal open
  useEffect(() => {
    if (visible && !confirmedBooking) {
      setSelectedPatientId('self');
      const firstOpen = dateOptions.find((d) => !d.isClosed) || dateOptions[0];
      setSelectedDateKey(firstOpen ? firstOpen.key : '');
      setSelectedShift('morning');
      setSelectedSymptom('');
      setCustomNote('');
    }
  }, [visible, confirmedBooking, dateOptions]);

  const hasValidUserPhone = Boolean(
    user?.phone &&
    !user.phone.startsWith('+9100') &&
    !user.phone.startsWith('+910') &&
    user.phone !== '+91 99999 99999'
  );
  const effectiveSelfName = userName || user?.full_name || (isHi ? 'रोगी' : 'Patient');
  const effectiveSelfPhone = hasValidUserPhone ? (user?.phone || '') : (userPhone || '');

  const familyMembers = useMemo<Member[]>(() => members.filter((m: Member) => m.id !== 'self'), [members]);
  const selectedMember = familyMembers.find((m: Member) => m.id === selectedPatientId);
  const currentPatientName = selectedMember
    ? `${selectedMember.name} (${getRelationLabel(selectedMember.relation, isHi)})`
    : effectiveSelfName;
  const currentPatientPhone = effectiveSelfPhone;

  // 1-hour window slots (each window supports 5-8 clients)
  const morningSlots = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM',
  ];
  const eveningSlots = [
    '04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM',
    '06:00 PM - 07:00 PM',
    '07:00 PM - 08:00 PM',
  ];
  const activeSlots = selectedShift === 'morning' ? morningSlots : eveningSlots;

  const selectedDateOpt = dateOptions.find((d) => d.key === selectedDateKey) || dateOptions[0];
  const isSelectedDayToday = selectedDateOpt?.isToday ?? false;

  const slotCapacity = Math.min(
    20,
    Math.max(
      1,
      Number(
        (bookingTargetDoctor?.doctor as any)?.slot_capacity ??
          (bookingTargetDoctor?.doctor as any)?.weekly_schedule?._slot_capacity ??
          6
      )
    )
  );
  const [slotBookedCounts, setSlotBookedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!visible || !bookingTargetDoctor) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('bookings')
          .select('slot_time')
          .in('service_type', ['OPD_CONCIERGE', 'OPD'])
          .eq('hospital_name', bookingTargetDoctor.hospitalName)
          .eq('doctor_name', bookingTargetDoctor.doctor.name)
          .neq('status', 'CANCELLED');
        if (cancelled || !Array.isArray(data)) return;
        const counts: Record<string, number> = {};
        for (const row of data) {
          const st = String(row.slot_time || '').trim();
          if (st) counts[st] = (counts[st] || 0) + 1;
        }
        setSlotBookedCounts(counts);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, bookingTargetDoctor?.doctor.name, bookingTargetDoctor?.hospitalName]);

  // Evaluate bookability + remaining capacity of every 1-hour window
  const evaluatedSlots = useMemo(() => {
    const dateLabel = selectedDateOpt?.fullDateStr || 'Today';
    return activeSlots.map((slot) => {
      const base = isSlotBookable(slot, isSelectedDayToday);
      const composedKey = `${dateLabel} · ${slot}`;
      const bookedCount = slotBookedCounts[composedKey] || 0;
      const remaining = Math.max(0, slotCapacity - bookedCount);
      if (base.bookable && remaining <= 0) {
        return { slot, bookable: false, reason: 'full' as const, remaining: 0 };
      }
      return { slot, ...base, remaining };
    });
  }, [activeSlots, isSelectedDayToday, selectedDateOpt?.fullDateStr, slotBookedCounts, slotCapacity]);

  const hasAnyBookableSlot = useMemo(() => {
    return evaluatedSlots.some((s) => s.bookable);
  }, [evaluatedSlots]);

  const firstAvailableSlot = useMemo(() => {
    return evaluatedSlots.find((s) => s.bookable)?.slot || '';
  }, [evaluatedSlots]);

  const effectiveSelectedSlot = useMemo(() => {
    if (selectedModalSlot && evaluatedSlots.find((s) => s.slot === selectedModalSlot && s.bookable)) {
      return selectedModalSlot;
    }
    return firstAvailableSlot;
  }, [selectedModalSlot, evaluatedSlots, firstAvailableSlot]);

  // Symptom chips by specialty
  const specialty = bookingTargetDoctor?.doctor.specialty?.toLowerCase() || '';
  const symptomMap: Record<string, string[]> = {
    cardiology: ['Chest Pain', 'Breathlessness', 'Palpitations', 'High BP', 'Dizziness'],
    orthopedics: ['Joint Pain', 'Back Pain', 'Knee Pain', 'Fracture', 'Stiffness'],
    ent: ['Ear Pain', 'Hearing Loss', 'Throat Pain', 'Nasal Block', 'Dizziness'],
    neurology: ['Headache', 'Seizure', 'Weakness', 'Memory Loss', 'Numbness'],
    pediatrics: ['Fever', 'Cough & Cold', 'Vomiting', 'Rash', 'Growth Concern'],
    'general medicine': ['Fever', 'Weakness', 'Diabetes Review', 'BP Check', 'Body Ache'],
  };
  const symptomChips = symptomMap[specialty] || ['Fever', 'Pain', 'Weakness', 'Consultation', 'Follow-up'];
  const symptomChipsHi: Record<string, string> = {
    'Chest Pain': 'सीने में दर्द', 'Breathlessness': 'सांस फूलना', 'Palpitations': 'धड़कन तेज़', 'High BP': 'ब्लड प्रेशर', 'Dizziness': 'चक्कर',
    'Joint Pain': 'जोड़ों में दर्द', 'Back Pain': 'कमर दर्द', 'Knee Pain': 'घुटने का दर्द', 'Fracture': 'हड्डी टूटना', 'Stiffness': 'अकड़न',
    'Ear Pain': 'कान दर्द', 'Hearing Loss': 'सुनाई न देना', 'Throat Pain': 'गले में दर्द', 'Nasal Block': 'नाक बंद', 'Seizure': 'मिर्गी',
    'Headache': 'सिरदर्द', 'Weakness': 'कमज़ोरी', 'Memory Loss': 'याददाश्त', 'Numbness': 'सुन्नपन',
    'Fever': 'बुखार', 'Cough & Cold': 'खांसी-ज़ुकाम', 'Vomiting': 'उल्टी', 'Rash': 'दाने', 'Growth Concern': 'विकास जांच',
    'Diabetes Review': 'डायबिटीज़', 'BP Check': 'बीपी जांच', 'Body Ache': 'बदन दर्द',
    'Pain': 'दर्द', 'Consultation': 'परामर्श', 'Follow-up': 'फॉलो-अप',
  };

  // Compose slot string for booking
  const composedSlot = `${selectedDateOpt?.fullDateStr || 'Today'} · ${effectiveSelectedSlot || activeSlots[0]}`;
  const complaint = selectedSymptom ? `${selectedSymptom}${customNote ? ' – ' + customNote : ''}` : customNote;

  const handleOnlinePayment = () => {
    if (!hasValidUserPhone) {
      setIsVerifyPhoneOpen(true);
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 20,
            paddingBottom: Math.max(Platform.OS === 'ios' ? 34 : 20, 20),
            paddingHorizontal: 20,
            maxHeight: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.2,
            shadowRadius: 18,
            elevation: 20,
          }}
        >
          {/* Header */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: confirmedBooking ? '#ECFDF5' : '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {confirmedBooking ? (
                  <CheckCircle2 size={18} color="#10B981" />
                ) : (
                  <Calendar size={18} color="#2563EB" />
                )}
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#182F3B' }}>
                {confirmedBooking
                  ? isHi
                    ? 'ओपीडी स्लॉट सुरक्षित!'
                    : 'OPD Slot Confirmed!'
                  : isHi
                  ? 'ओपीडी परामर्श स्लॉट बुकिंग'
                  : 'Confirm OPD Consultation'}
              </Text>
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

          {/* Body Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 12 }}
          >
            {/* Confirmed State */}
            {confirmedBooking ? (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: '#ECFDF5',
                    borderWidth: 3,
                    borderColor: '#A7F3D0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <CheckCircle2 size={40} color="#10B981" />
                </View>

                <Text style={{ fontSize: 20, fontWeight: '800', color: '#065F46' }}>
                  {isHi ? 'अपॉइंटमेंट सफलतापूर्वक दर्ज!' : 'Consultation Booked!'}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#F0FDF4',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#BBF7D0',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>
                    {isHi ? 'संदर्भ संख्या:' : 'Booking Ref:'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                      fontWeight: '800',
                      color: '#166534',
                    }}
                  >
                    {confirmedBooking.booking_ref}
                  </Text>
                </View>

                {/* Booking Summary Card */}
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginTop: 18,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isHi ? 'डॉक्टर:' : 'Doctor:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                      {confirmedBooking.doctor_name}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isHi ? 'अस्पताल:' : 'Hospital:'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#2563EB',
                        maxWidth: '65%',
                        textAlign: 'right',
                      }}
                    >
                      {confirmedBooking.hospital_name}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isHi ? 'मरीज:' : 'Patient:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                      {confirmedBooking.patient_name}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isHi ? 'दिन व समय (स्लॉट):' : 'Day, Date & Slot:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#D97706' }}>
                      {confirmedBooking.slot_time?.includes('·') || confirmedBooking.slot_time?.includes(',')
                        ? confirmedBooking.slot_time
                        : `Today, ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ${confirmedBooking.slot_time}`}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isHi ? 'परामर्श शुल्क:' : 'Consultation Fee:'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#16A34A' }}>
                      ₹{confirmedBooking.doctor_fee} ({isHi ? 'भुगतान पूर्ण' : 'Paid Online'})
                    </Text>
                  </View>
                </View>

                {/* Instant Digital QR Pass */}
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
                    shadowColor: '#1E3A8A',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <AppointmentQrCode
                    bookingRef={confirmedBooking.booking_ref}
                    tokenNumber={14}
                    patientName={confirmedBooking.patient_name}
                    doctorName={confirmedBooking.doctor_name || bookingTargetDoctor?.doctor.name || 'Specialist Doctor'}
                    hospitalName={confirmedBooking.hospital_name || bookingTargetDoctor?.hospitalName || 'Adityam Partner Clinic'}
                    slotTime={confirmedBooking.slot_time || 'Tomorrow, 10:30 AM'}
                    verificationCode={(confirmedBooking as any).verification_code || undefined}
                    size={130}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 10 }}>
                    {isHi ? 'डिजिटल ओपीडी पास' : 'Digital OPD Appointment Pass'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                    {isHi ? 'अस्पताल रिसेप्शन डेस्क पर त्वरित प्रवेश हेतु यह कोड दिखाएं' : 'Show this QR at reception for fast-track queue bypass'}
                  </Text>
                  {(confirmedBooking as any).verification_code ? (
                    <View
                      style={{
                        marginTop: 10,
                        backgroundColor: '#EFF6FF',
                        borderWidth: 1.5,
                        borderColor: '#2563EB',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#1E40AF', letterSpacing: 0.5 }}>
                        {isHi ? 'गोपनीय काउंटर चेक-इन OTP (केवल रिसेप्शन पर बताएं)' : 'CONFIDENTIAL COUNTER OTP (SHARE ONLY AT DESK)'}
                      </Text>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1D4ED8', letterSpacing: 6, marginTop: 2 }}>
                        {(confirmedBooking as any).verification_code}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Exotel Telephony Virtual Route Notice */}
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#EFF6FF',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    marginTop: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} color="#2563EB" />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: '#1E40AF',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isHi ? 'सुरक्षित टेलीफोनी व प्राइवेसी' : 'Masked Exotel Telephony Active'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 4, lineHeight: 16 }}>
                    {isHi
                      ? 'आपका मोबाइल नंबर अस्पताल डेस्क से 100% गोपनीय रहता है। अस्पताल समन्वयक आपसे संपर्क करेंगे।'
                      : 'Your personal mobile number remains 100% confidential. Clinic coordinator connects via secure masked routing.'}
                  </Text>
                </View>

                {/* Dual Action Buttons */}
                <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
                  {onViewAppointments && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onViewAppointments();
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#2563EB',
                        paddingVertical: 14,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        shadowColor: '#2563EB',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Ticket size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                        {isHi ? 'अपॉइंटमेंट पास व टिकट देखें' : 'View Pass in Appointments'}
                      </Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      width: '100%',
                      backgroundColor: '#F1F5F9',
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>
                      {isHi ? 'बंद करें (Done)' : 'Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : bookingTargetDoctor ? (
              <View>
                {/* Doctor Header Summary */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#182F3B' }}>
                    {translateDoctorName(bookingTargetDoctor.doctor.name, isHi)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                    {translateSpecialty(bookingTargetDoctor.doctor.specialty, isHi)} •{' '}
                    {translateHospitalName(bookingTargetDoctor.hospitalName, isHi)}
                  </Text>
                  {bookingTargetDoctor.doctor.qualification && (
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                      {translateQualification(bookingTargetDoctor.doctor.qualification, isHi)}
                    </Text>
                  )}
                </View>

                {/* Doctor OPD Timing */}
                {bookingTargetDoctor.doctor.opd_timing && (
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      marginTop: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Clock size={16} color="#2563EB" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: '#64748B',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isHi ? 'ओपीडी समय तालिका:' : 'OPD Visiting Hours:'}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginTop: 1 }}>
                        {translateTiming(bookingTargetDoctor.doctor.opd_timing, isHi)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Patient Selector (Self vs Family Dependents) */}
                <View
                  style={{
                    marginTop: 14,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="#2563EB" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#182F3B' }}>
                        {isHi ? 'मरीज चुनें (Patient):' : 'Select Patient:'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
                      {selectedMember ? getRelationLabel(selectedMember.relation, isHi) : isHi ? 'स्वयं' : 'Self'}
                    </Text>
                  </View>

                  {/* Horizontal Chips for Patient Selection */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {/* Self Option */}
                    <TouchableOpacity
                      onPress={() => setSelectedPatientId('self')}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        backgroundColor: selectedPatientId === 'self' ? '#EFF6FF' : '#F8FAFC',
                        borderColor: selectedPatientId === 'self' ? '#2563EB' : '#E2E8F0',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <User
                        size={12}
                        color={selectedPatientId === 'self' ? '#2563EB' : '#64748B'}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: selectedPatientId === 'self' ? '#1D4ED8' : '#334155',
                        }}
                      >
                        {effectiveSelfName} ({isHi ? 'स्वयं' : 'Self'})
                      </Text>
                    </TouchableOpacity>

                    {/* Family Members */}
                    {familyMembers.map((mem: Member) => {
                      const isSelected = selectedPatientId === mem.id;
                      return (
                        <TouchableOpacity
                          key={mem.id}
                          onPress={() => setSelectedPatientId(mem.id)}
                          activeOpacity={0.8}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            borderWidth: 1.5,
                            backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                            borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Users
                            size={12}
                            color={isSelected ? '#2563EB' : '#64748B'}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: isSelected ? '#1D4ED8' : '#334155',
                            }}
                          >
                            {mem.name} ({getRelationLabel(mem.relation, isHi)})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ── 7-DAY AHEAD DATE PICKER ── */}
                <View style={{ marginTop: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                      {isHi ? 'तारीख चुनें (अगले 7 दिन):' : 'Select Date (Next 7 Days):'}
                    </Text>
                    {selectedDateOpt?.isClosed && (
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#DC2626' }}>
                        {isHi ? '• इस दिन क्लिनिक बंद है' : '• Clinic Closed on this day'}
                      </Text>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {dateOptions.map((opt) => {
                      const isSelected = selectedDateKey === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          disabled={opt.isClosed}
                          onPress={() => {
                            setSelectedDateKey(opt.key);
                            onSelectModalSlot('');
                          }}
                          activeOpacity={0.8}
                          style={{
                            minWidth: 84,
                            paddingVertical: 10,
                            paddingHorizontal: 10,
                            borderRadius: 14,
                            borderWidth: 1.5,
                            backgroundColor: opt.isClosed
                              ? '#F1F5F9'
                              : isSelected
                                ? '#1E40AF'
                                : '#FFFFFF',
                            borderColor: opt.isClosed
                              ? '#E2E8F0'
                              : isSelected
                                ? '#1E40AF'
                                : '#CBD5E1',
                            alignItems: 'center',
                            opacity: opt.isClosed ? 0.55 : 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color: opt.isClosed
                                ? '#94A3B8'
                                : isSelected
                                  ? '#BFDBFE'
                                  : '#64748B',
                            }}
                          >
                            {isHi ? opt.dayLabelHi : opt.dayLabel}
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '900',
                              color: opt.isClosed
                                ? '#94A3B8'
                                : isSelected
                                  ? '#FFFFFF'
                                  : '#0F172A',
                              marginTop: 2,
                            }}
                          >
                            {opt.dateLabel}
                          </Text>
                          {opt.isClosed && (
                            <View style={{ marginTop: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#DC2626' }}>
                                {isHi ? 'बंद' : 'Closed'}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* ── SHIFT SELECTOR ── */}
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
                    {isHi ? 'ओपीडी शिफ्ट:' : 'OPD Shift:'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { key: 'morning' as const, label: isHi ? '☀ सुबह OPD\n09:00 – 01:00 PM' : '☀ Morning OPD\n09:00 – 01:00 PM' },
                      { key: 'evening' as const, label: isHi ? '🌙 शाम OPD\n05:00 – 08:00 PM' : '🌙 Evening OPD\n05:00 – 08:00 PM' },
                    ].map((shift) => {
                      const isSel = selectedShift === shift.key;
                      return (
                        <TouchableOpacity
                          key={shift.key}
                          onPress={() => { setSelectedShift(shift.key); onSelectModalSlot(''); }}
                          activeOpacity={0.8}
                          style={{
                            flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
                            backgroundColor: isSel ? '#EFF6FF' : '#F8FAFC',
                            borderColor: isSel ? '#2563EB' : '#E2E8F0',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#1D4ED8' : '#475569', textAlign: 'center' }}>
                            {shift.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ── TIME SLOTS WITH 1-HOUR BUFFER & CLOSED SLOTS HANDLING ── */}
                <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>
                      {isHi ? 'समय स्लॉट चुनें:' : 'Select Time Slot:'}
                    </Text>
                    {isSelectedDayToday && (
                      <Text style={{ fontSize: 10, color: '#64748B' }}>
                        {isHi ? '• 1 घंटे पूर्व बुकिंग अनिवार्य' : '• Min. 1 hr advance booking'}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {evaluatedSlots.map(({ slot, bookable, reason, remaining }) => {
                      const isSelected = effectiveSelectedSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          disabled={!bookable}
                          onPress={() => onSelectModalSlot(slot)}
                          activeOpacity={0.8}
                          style={{
                            paddingHorizontal: 11,
                            paddingVertical: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: !bookable
                              ? '#F1F5F9'
                              : isSelected
                                ? '#2563EB'
                                : '#FFFFFF',
                            borderColor: !bookable
                              ? '#E2E8F0'
                              : isSelected
                                ? '#1D4ED8'
                                : '#CBD5E1',
                            opacity: !bookable ? 0.55 : 1,
                          }}
                        >
                          <Clock size={12} color={!bookable ? '#94A3B8' : isSelected ? '#FFFFFF' : '#64748B'} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: !bookable
                                ? '#94A3B8'
                                : isSelected
                                  ? '#FFFFFF'
                                  : '#334155',
                              textDecorationLine: !bookable ? 'line-through' : 'none',
                            }}
                          >
                            {slot}
                          </Text>
                          {bookable ? (
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: isSelected ? '#DBEAFE' : '#16A34A' }}>
                              {remaining}/{slotCapacity}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#DC2626' }}>
                              {reason === 'full'
                                ? isHi ? 'पूर्ण' : 'Full'
                                : reason === 'passed'
                                  ? isHi ? 'समाप्त' : 'Passed'
                                  : isHi ? '<1 घंटा' : '<1 hr'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* UNAVAILABLE FOR THIS TIME BANNER */}
                  {!hasAnyBookableSlot && (
                    <View
                      style={{
                        backgroundColor: '#FEF3C7',
                        padding: 12,
                        borderRadius: 12,
                        marginTop: 12,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={15} color="#D97706" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                          {isHi ? 'इस समय के लिए उपलब्ध नहीं' : 'Not Available for This Time'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#92400E', marginTop: 4, lineHeight: 15 }}>
                        {isHi
                          ? 'इस शिफ्ट के सभी स्लॉट भर चुके हैं या समय निकल चुका है। आप दूसरी शिफ्ट, अगला उपलब्ध दिन चुन सकते हैं या अन्य डॉक्टर देख सकते हैं।'
                          : 'Slots for this time window are full or closed. Switch shifts, jump to the next open day, or view other doctors at this hospital.'}
                      </Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {selectedShift === 'morning' ? (
                          <TouchableOpacity
                            onPress={() => setSelectedShift('evening')}
                            activeOpacity={0.85}
                            style={{
                              backgroundColor: '#1E40AF',
                              paddingVertical: 7,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11.5 }}>
                              {isHi ? 'शाम की OPD देखें →' : 'Switch to Evening OPD →'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => {
                              const currIdx = dateOptions.findIndex((d) => d.key === selectedDateKey);
                              const nextOpen = dateOptions.find((d, i) => i > currIdx && !d.isClosed);
                              if (nextOpen) {
                                setSelectedDateKey(nextOpen.key);
                                setSelectedShift('morning');
                              }
                            }}
                            activeOpacity={0.85}
                            style={{
                              backgroundColor: '#1E40AF',
                              paddingVertical: 7,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11.5 }}>
                              {isHi ? 'अगला उपलब्ध दिन चुनें →' : 'Next Open Day →'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={onClose}
                          activeOpacity={0.85}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#D97706',
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: '#92400E', fontWeight: '800', fontSize: 11.5 }}>
                            {isHi ? 'अन्य डॉक्टर देखें' : 'Other Doctors'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => Linking.openURL('tel:+919811244550')}
                          activeOpacity={0.85}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: '#B45309',
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                          }}
                        >
                          <Phone size={12} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11.5 }}>
                            {isHi ? 'अस्पताल डेस्क' : 'Call Desk'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Fee strip */}
                  {(() => {
                    const mrp = Number(bookingTargetDoctor.doctor.consultation_fee || 0);
                    const disc = Number(bookingTargetDoctor.doctor.discounted_fee || mrp);
                    const saved = Math.max(0, mrp - disc);
                    const pct = mrp > 0 ? Math.round((saved / mrp) * 100) : 0;
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                        <View>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>{isHi ? 'अस्पताल शुल्क:' : 'Hospital MRP:'} <Text style={{ textDecorationLine: 'line-through' }}>₹{mrp}</Text></Text>
                          {saved > 0 ? (
                            <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700' }}>
                              {isHi ? `आदित्यम ${pct}% छूट:` : `Adityam ${pct}% off:`} −₹{saved}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 17, fontWeight: '900', color: '#16A34A' }}>₹{disc}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* ── SYMPTOM CHIPS ── */}
                <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
                    {isHi ? 'शिकायत / लक्षण (ऐच्छिक):' : 'Chief Complaint (optional):'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                    {symptomChips.map((chip) => {
                      const isSel = selectedSymptom === chip;
                      return (
                        <TouchableOpacity
                          key={chip}
                          onPress={() => setSelectedSymptom(isSel ? '' : chip)}
                          activeOpacity={0.8}
                          style={{
                            paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                            backgroundColor: isSel ? '#EFF6FF' : '#F8FAFC',
                            borderColor: isSel ? '#2563EB' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: isSel ? '#1D4ED8' : '#475569' }}>
                            {isHi ? (symptomChipsHi[chip] || chip) : chip}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    value={customNote}
                    onChangeText={setCustomNote}
                    placeholder={isHi ? 'विशेष नोट डॉक्टर के लिए...' : 'Additional note for doctor...'}
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={{
                      marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
                      padding: 10, fontSize: 12, color: '#0F172A', minHeight: 48, textAlignVertical: 'top',
                    }}
                  />
                </View>

                {/* ── NMC COMPLIANCE NOTE ── */}
                <View style={{ backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A', marginTop: 10 }}>
                  <Text style={{ fontSize: 10.5, color: '#78350F', lineHeight: 15 }}>
                    {isHi
                      ? '100% सुरक्षित ऑनलाइन भुगतान। डिजिटल पास तुरंत जारी होता है। 2 घंटे पूर्व निःशुल्क रद्दीकरण (2–6 कार्य दिवसों में 100% रिफंड)।'
                      : '100% secure online payment. Digital pass issued instantly. Free cancellation up to 2 hrs prior (100% refund in 2–6 working days).'}
                  </Text>
                </View>

                {/* ── ONLINE PAYMENT ONLY BUTTON ── */}
                <View style={{ marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={handleOnlinePayment}
                    disabled={isSubmitting || selectedDateOpt?.isClosed || !hasAnyBookableSlot}
                    activeOpacity={0.88}
                    style={{
                      width: '100%',
                      backgroundColor: selectedDateOpt?.isClosed || !hasAnyBookableSlot ? '#94A3B8' : '#16A34A',
                      paddingVertical: 14,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                      shadowColor: '#16A34A',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: selectedDateOpt?.isClosed || !hasAnyBookableSlot ? 0 : 0.28,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    <Lock size={15} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                      {selectedDateOpt?.isClosed
                        ? isHi ? 'क्लिनिक अवकाश • अन्य दिन चुनें' : 'Clinic Closed • Choose Another Day'
                        : !hasAnyBookableSlot
                          ? isHi ? 'आज के ऑनलाइन स्लॉट समाप्त • कल का समय चुनें' : 'Slots Closed Today • Choose Tomorrow'
                          : isHi
                            ? `ऑनलाइन भुगतान करें • ₹${bookingTargetDoctor.doctor.discounted_fee} → डिजिटल पास पाएं`
                            : `Pay Online • ₹${bookingTargetDoctor.doctor.discounted_fee} → Get Digital Pass`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Progressive Profiling: Verify Phone for Google Login Users */}
    <VerifyPhoneModal
      visible={isVerifyPhoneOpen}
      onClose={() => setIsVerifyPhoneOpen(false)}
      onSuccess={() => {
        setIsVerifyPhoneOpen(false);
        setIsPaymentModalOpen(true);
      }}
      isHi={isHi}
      title={isHi ? 'OPD पास हेतु मोबाइल सत्यापन' : 'Verify Phone for OPD Pass'}
      subtitle={
        isHi
          ? 'अस्पताल रिसेप्शन व डॉक्टर कंसल्टेशन पास जारी करने के लिए 10-अंकों का मोबाइल नंबर सत्यापित करें।'
          : 'Hospitals require your verified mobile number to issue your fast-track entry pass and coordinate your consultation.'
      }
    />

    {/* Dedicated Payment Gateway Modal (Razorpay + UPI) */}
    {bookingTargetDoctor && (
      <PaymentGatewayModal
        visible={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={bookingTargetDoctor.doctor.discounted_fee}
        serviceTitle={bookingTargetDoctor.doctor.specialty}
        providerName={bookingTargetDoctor.doctor.name}
        patientName={currentPatientName}
        onPaymentSuccess={(method, txnId) => {
          setIsPaymentModalOpen(false);
          onConfirmBooking(currentPatientName, currentPatientPhone, method, txnId, complaint, composedSlot);
        }}
      />
    )}
  </>
  );
}
