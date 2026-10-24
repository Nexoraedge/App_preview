// apps/mobile/components/opd/BookingSlotModal.tsx
// Booking confirmation modal & slot picker bottom sheet for OPD

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { X, CheckCircle2, Clock, Calendar } from 'lucide-react-native';
import type { Doctor, Booking } from '@adityam/types';
import {
  translateDoctorName,
  translateHospitalName,
  translateSpecialty,
  translateQualification,
  translateTiming,
} from '../../src/utils/hindiDictionary';
import { calculateDoctorSlots } from '../../src/data/opdData';

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
  onConfirmBooking: () => void;
  userPhone?: string | null;
  userName?: string | null;
  language: 'en' | 'hi';
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
}: BookingSlotModalProps) {
  const isHi = language === 'hi';

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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 16,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: '700', color: '#182F3B' }}
            >
              {confirmedBooking
                ? isHi
                  ? 'स्लॉट अनुरोध प्राप्त हुआ!'
                  : 'OPD Slot Requested!'
                : isHi
                ? 'ओपीडी स्लॉट बुकिंग'
                : 'Confirm OPD Slot'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Confirmed State */}
          {confirmedBooking ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={32} color="#3B82F6" />
              </View>
              <Text
                style={{ fontSize: 20, fontWeight: '700', color: '#182F3B' }}
              >
                {isHi ? 'ओपीडी स्लॉट सुरक्षित!' : 'OPD Slot Reserved!'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontWeight: '700',
                  color: '#3B82F6',
                  marginTop: 4,
                }}
              >
                {isHi ? 'संदर्भ संख्या:' : 'Reference:'}{' '}
                {confirmedBooking.booking_ref}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#475569',
                  textAlign: 'center',
                  marginTop: 12,
                  paddingHorizontal: 16,
                  lineHeight: 18,
                }}
              >
                {isHi
                  ? `${
                      confirmedBooking.doctor_name
                        ? translateDoctorName(confirmedBooking.doctor_name, true)
                        : 'डॉक्टर'
                    } के साथ ${
                      confirmedBooking.slot_time || 'आज'
                    } का स्लॉट सुरक्षित किया जा रहा है। हमारे कंसीयर्ज समन्वयक एक्सोटेल द्वारा आपसे संपर्क करेंगे।`
                  : `Your consult with ${confirmedBooking.doctor_name} for ${
                      confirmedBooking.slot_time || 'Today'
                    } is reserved. Our concierge desk is contacting you via Exotel masked telephony.`}
              </Text>

              <View
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginTop: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#182F3B',
                    textTransform: 'uppercase',
                  }}
                >
                  {isHi ? 'वर्चुअल टेलीफोनी रूट' : 'Virtual Telephony Route'}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    fontWeight: '700',
                    color: '#1E293B',
                    marginTop: 2,
                  }}
                >
                  +91 11 4000 8800 ➔ {userPhone || '+91 99999 99999'}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: '#3B82F6',
                    fontWeight: '600',
                    marginTop: 4,
                  }}
                >
                  {isHi
                    ? '✓ आपका व्यक्तिगत नंबर 100% गोपनीय रहता है।'
                    : '✓ Your personal number remains 100% confidential.'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: '100%',
                  backgroundColor: '#3B82F6',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 20,
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}
                >
                  {isHi ? 'पूर्ण' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : bookingTargetDoctor ? (
            <View style={{ paddingVertical: 16 }}>
              <Text
                style={{ fontSize: 16, fontWeight: '700', color: '#182F3B' }}
              >
                {translateDoctorName(bookingTargetDoctor.doctor.name, isHi)}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#2563EB',
                  fontWeight: '700',
                  marginTop: 2,
                }}
              >
                {translateSpecialty(bookingTargetDoctor.doctor.specialty, isHi)}{' '}
                •{' '}
                {translateHospitalName(
                  bookingTargetDoctor.hospitalName,
                  isHi
                )}
              </Text>
              {bookingTargetDoctor.doctor.qualification && (
                <Text
                  style={{
                    fontSize: 11,
                    color: '#64748B',
                    fontWeight: '500',
                    marginTop: 2,
                  }}
                >
                  {translateQualification(
                    bookingTargetDoctor.doctor.qualification,
                    isHi
                  )}
                </Text>
              )}

              {/* Doctor OPD Timings / Schedule */}
              {bookingTargetDoctor.doctor.opd_timing && (
                <View
                  style={{
                    backgroundColor: 'rgba(239, 246, 255, 0.8)',
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(191, 219, 254, 0.7)',
                    marginTop: 12,
                    marginBottom: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Clock size={16} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10.5,
                        fontWeight: '700',
                        color: '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {isHi
                        ? 'डॉक्टर का ओपीडी समय (शेड्यूल):'
                        : 'Doctor OPD Schedule:'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#0F172A',
                        marginTop: 2,
                      }}
                    >
                      {translateTiming(
                        bookingTargetDoctor.doctor.opd_timing,
                        isHi
                      )}
                    </Text>
                  </View>
                </View>
              )}

              {/* Booking Timing: Selectable Time Slots */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginVertical: 10,
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
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: '#334155',
                    }}
                  >
                    {isHi
                      ? 'बुकिंग का समय (स्लॉट) चुनें:'
                      : 'Select Booking Slot:'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(219, 234, 254, 0.7)',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Clock size={11} color="#1D4ED8" />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: '#1D4ED8',
                      }}
                    >
                      {selectedModalSlot || bookingTargetDoctor.slot}
                    </Text>
                  </View>
                </View>

                {/* Interactive slot chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {calculateDoctorSlots(bookingTargetDoctor.doctor, isHi).map(
                    (slot) => {
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
                            borderRadius: 12,
                            borderWidth: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                            borderColor: isSelected ? '#1D4ED8' : '#E2E8F0',
                            shadowColor: isSelected ? '#2563EB' : 'transparent',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: isSelected ? 0.2 : 0,
                            shadowRadius: 2,
                            elevation: isSelected ? 2 : 0,
                          }}
                        >
                          <Clock
                            size={12}
                            color={isSelected ? '#FFFFFF' : '#64748B'}
                          />
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
                    }
                  )}
                </View>

                {/* Consultation Fee Breakdown */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(226, 232, 240, 0.8)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#475569',
                      fontWeight: '600',
                    }}
                  >
                    {isHi
                      ? 'परामर्श शुल्क (ऐप में दर):'
                      : 'Consultation Fee (In-App):'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#94A3B8',
                        textDecorationLine: 'line-through',
                      }}
                    >
                      ₹{bookingTargetDoctor.doctor.consultation_fee}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '900',
                        color: '#16A34A',
                      }}
                    >
                      ₹{bookingTargetDoctor.doctor.discounted_fee}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Patient Information */}
              <View
                style={{
                  backgroundColor: '#FFF9F0',
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(207, 138, 64, 0.3)',
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ fontSize: 12, fontWeight: '700', color: '#182F3B' }}
                >
                  {isHi ? 'मरीज की जानकारी:' : 'Patient Information:'}
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                  {isHi ? 'नाम: ' : 'Name: '}
                  <Text style={{ fontWeight: '700' }}>
                    {userName || 'Rahul Jain'}
                  </Text>
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                  {isHi ? 'फ़ोन: ' : 'Phone: '}
                  <Text style={{ fontWeight: '700' }}>
                    {userPhone || '+91 99999 99999'}
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={onConfirmBooking}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  backgroundColor: '#2563EB',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Calendar size={16} color="#FFFFFF" />
                <Text
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}
                >
                  {isSubmitting
                    ? isHi
                      ? 'स्लॉट बुक किया जा रहा है...'
                      : 'Reserving OPD Slot...'
                    : isHi
                    ? 'पुष्टि करें और ओपीडी स्लॉट बुक करें'
                    : 'Confirm & Reserve OPD Slot'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
