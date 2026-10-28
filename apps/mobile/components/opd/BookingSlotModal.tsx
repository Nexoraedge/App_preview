// apps/mobile/components/opd/BookingSlotModal.tsx
// Booking confirmation modal & slot picker bottom sheet for OPD
// Features real patient selector (Self vs Dependents), instant persistent booking,
// and NMC Telemedicine Compliance Charter.

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
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

interface BookingTarget {
  doctor: Doctor;
  slot: string;
  hospitalName: string;
}

interface BookingSlotModalProps {
  visible: boolean;
  onClose: () => void;
  confirmedBooking: Booking | null;
  bookingTargetDoctor: BookingTarget | null;
  selectedModalSlot: string;
  onSelectModalSlot: (slot: string) => void;
  isSubmitting: boolean;
  onConfirmBooking: (patientName: string, patientPhone: string) => void;
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
  const { user, dependents } = useAuth();

  // Selected patient state: 'self' or dependent.id
  const [selectedPatientId, setSelectedPatientId] = useState<string>('self');

  // Reset to self on modal open
  useEffect(() => {
    if (visible && !confirmedBooking) {
      setSelectedPatientId('self');
    }
  }, [visible, confirmedBooking]);

  const effectiveSelfName = userName || user?.full_name || 'Abhishek Jain';
  const effectiveSelfPhone = userPhone || user?.phone || '+91 99999 99999';

  // Compute selected patient display details
  const selectedDependent = dependents.find((d) => d.id === selectedPatientId);
  const currentPatientName = selectedDependent
    ? `${selectedDependent.full_name} (${selectedDependent.relation})`
    : effectiveSelfName;
  const currentPatientPhone = effectiveSelfPhone;

  return (
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

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isHi ? 'समय (स्लॉट):' : 'Slot:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#D97706' }}>
                      {confirmedBooking.slot_time}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isHi ? 'परामर्श शुल्क:' : 'Fee Payable:'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#16A34A' }}>
                      ₹{confirmedBooking.doctor_fee}
                    </Text>
                  </View>
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
                      {selectedDependent ? selectedDependent.relation : isHi ? 'स्वयं' : 'Self'}
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

                    {/* Family Dependents */}
                    {dependents.map((dep) => {
                      const isSelected = selectedPatientId === dep.id;
                      return (
                        <TouchableOpacity
                          key={dep.id}
                          onPress={() => setSelectedPatientId(dep.id)}
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
                            {dep.full_name} ({dep.relation})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Slot Selection */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginTop: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>
                      {isHi ? 'परामर्श समय (स्लॉट):' : 'Consultation Slot:'}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#DBEAFE',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Clock size={11} color="#1D4ED8" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                        {selectedModalSlot || bookingTargetDoctor.slot}
                      </Text>
                    </View>
                  </View>

                  {/* Interactive slot chips */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {calculateDoctorSlots(bookingTargetDoctor.doctor, isHi).map((slot) => {
                      const isSelected =
                        (selectedModalSlot || bookingTargetDoctor.slot) === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          onPress={() => onSelectModalSlot(slot)}
                          activeOpacity={0.8}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                            borderColor: isSelected ? '#1D4ED8' : '#CBD5E1',
                          }}
                        >
                          <Clock size={12} color={isSelected ? '#FFFFFF' : '#64748B'} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: isSelected ? '#FFFFFF' : '#334155',
                            }}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Pricing Breakdown */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                      {isHi ? 'परामर्श शुल्क (ऐप छूट उपरांत):' : 'Consultation Fee (With Discount):'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#94A3B8',
                          textDecorationLine: 'line-through',
                        }}
                      >
                        ₹{bookingTargetDoctor.doctor.consultation_fee}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#16A34A' }}>
                        ₹{bookingTargetDoctor.doctor.discounted_fee}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Legal & Medical Guidelines Charter */}
                <View
                  style={{
                    backgroundColor: '#FFFBEB',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                    marginTop: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={13} color="#B45309" />
                    <Text
                      style={{
                        fontSize: 10.5,
                        fontWeight: '800',
                        color: '#92400E',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isHi
                        ? 'राष्ट्रीय चिकित्सा आयोग (NMC) व क्लिनिकल दिशा-निर्देश'
                        : 'NMC Telemedicine & Clinical Compliance'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 10.5,
                      color: '#78350F',
                      marginTop: 3,
                      lineHeight: 15,
                    }}
                  >
                    {isHi
                      ? 'स्लॉट आरक्षण सीधे अस्पताल नेटवर्क में दर्ज होता है। परामर्श शुल्क का भुगतान क्लिनिक काउंटर अथवा इन-ऐप वॉलेट से संभव है। 2 घंटे पूर्व निःशुल्क रद्दीकरण मान्य।'
                      : 'OPD reservation confirms priority clinic queue token directly with hospital desk. Payment payable at clinic counter or in-app wallet. Free cancellation up to 2 hours prior.'}
                  </Text>
                </View>

                {/* Submit Action */}
                <TouchableOpacity
                  onPress={() => onConfirmBooking(currentPatientName, currentPatientPhone)}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                  style={{
                    width: '100%',
                    backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 16,
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  <Calendar size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {isSubmitting
                      ? isHi
                        ? 'स्लॉट सुरक्षित किया जा रहा है...'
                        : 'Reserving Priority Slot...'
                      : isHi
                      ? `पुष्टि करें • ${currentPatientName.split(' ')[0]} हेतु बुक करें`
                      : `Confirm & Reserve for ${currentPatientName.split(' ')[0]}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
