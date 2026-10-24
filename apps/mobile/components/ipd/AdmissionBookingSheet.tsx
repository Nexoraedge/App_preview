// apps/mobile/components/ipd/AdmissionBookingSheet.tsx
// Bottom sheet modal for procedure & hospital admission booking

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Bed,
  Users,
  Building2,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PlannedSurgery,
  HospitalAdmissionInfo,
  inr,
} from '../../src/data/ipdData';
import { HeartPulseIcon } from '../ServiceIcons';

interface AdmissionBookingSheetProps {
  visible: boolean;
  onClose: () => void;
  isHi: boolean;
  selectedSurgery: PlannedSurgery | null;
  selectedHospital: HospitalAdmissionInfo | null;
  roomType: 'DELUXE' | 'SEMI' | 'GENERAL' | 'ICU';
  onSelectRoomType: (type: 'DELUXE' | 'SEMI' | 'GENERAL' | 'ICU') => void;
  patientName: string;
  onPatientNameChange: (text: string) => void;
  patientPhone: string;
  onPatientPhoneChange: (text: string) => void;
  insurancePolicy: string;
  onInsurancePolicyChange: (text: string) => void;
  admissionReason: string;
  onAdmissionReasonChange: (text: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  confirmedBookingId: string | null;
}

export function AdmissionBookingSheet({
  visible,
  onClose,
  isHi,
  selectedSurgery,
  selectedHospital,
  roomType,
  onSelectRoomType,
  patientName,
  onPatientNameChange,
  patientPhone,
  onPatientPhoneChange,
  insurancePolicy,
  onInsurancePolicyChange,
  admissionReason,
  onAdmissionReasonChange,
  isSubmitting,
  onSubmit,
  confirmedBookingId,
}: AdmissionBookingSheetProps) {
  const insets = useSafeAreaInsets();

  const roomOptions = [
    {
      id: 'DELUXE',
      title: isHi ? 'सिंगल डीलक्स रूम' : 'Single Deluxe',
      subtitle: isHi ? 'प्राइवेट अटैच्ड रूम' : 'Private en-suite room',
      icon: (c: string) => <Bed size={18} color={c} />,
    },
    {
      id: 'SEMI',
      title: isHi ? 'ट्विन शेयरिंग' : 'Twin Sharing',
      subtitle: isHi ? 'पर्दा विभाजन रूम' : 'Curtain partition room',
      icon: (c: string) => <Users size={18} color={c} />,
    },
    {
      id: 'GENERAL',
      title: isHi ? 'जनरल वार्ड' : 'General Ward',
      subtitle: isHi ? 'साझा अस्पताल वार्ड' : 'Shared healthcare ward',
      icon: (c: string) => <Building2 size={18} color={c} />,
    },
    {
      id: 'ICU',
      title: isHi ? 'आईसीयू (ICU)' : 'ICU / Critical Care',
      subtitle: isHi ? 'गहन निगरानी यूनिट' : 'Specialist telemetry care',
      icon: (c: string) => <HeartPulseIcon size={18} color={c} />,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            maxHeight: '88%',
            maxWidth: 520,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          {/* Drag Handle */}
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: '#CBD5E1',
              alignSelf: 'center',
              marginBottom: 12,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
            }}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}
                numberOfLines={1}
              >
                {selectedSurgery
                  ? isHi && selectedSurgery.shortNameHi
                    ? selectedSurgery.shortNameHi
                    : selectedSurgery.shortName
                  : selectedHospital
                  ? isHi && selectedHospital.nameHi
                    ? selectedHospital.nameHi
                    : selectedHospital.name
                  : ''}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '400',
                  color: '#64748B',
                  marginTop: 1,
                }}
              >
                {selectedSurgery
                  ? isHi && selectedSurgery.nameHi
                    ? selectedSurgery.nameHi
                    : selectedSurgery.name
                  : selectedHospital
                  ? isHi && selectedHospital.locationHi
                    ? selectedHospital.locationHi
                    : selectedHospital.location
                  : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {confirmedBookingId ? (
            /* Success View */
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={32} color="#059669" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#0F172A',
                  textAlign: 'center',
                }}
              >
                {isHi
                  ? 'भर्ती अनुरोध पंजीकृत हो गया है'
                  : 'Admission Request Registered'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#2563EB',
                  marginTop: 4,
                }}
              >
                {isHi ? 'संदर्भ आईडी: ' : 'Reference ID: '}
                {confirmedBookingId}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#64748B',
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 18,
                  paddingHorizontal: 12,
                }}
              >
                {isHi
                  ? 'हमारे वरिष्ठ चिकित्सा सलाहकार 15 मिनट के भीतर आपसे संपर्क कर अस्पताल विकल्प, रूम उपलब्धता और बीमा कागजी कार्रवाई में सहायता करेंगे।'
                  : 'Our senior medical advisor will call you within 15 minutes to review hospital options, room availability, and help with insurance paperwork.'}
              </Text>

              <TouchableOpacity
                onPress={onClose}
                style={{
                  backgroundColor: '#2563EB',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  marginTop: 20,
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {isHi ? 'पूर्ण' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Booking Form */
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {selectedSurgery && (
                /* Package Overview Card */
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: '#DBEAFE',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: '#1E40AF',
                      }}
                    >
                      {isHi ? 'पैकेज विवरण' : 'PACKAGE OVERVIEW'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: '#1E40AF',
                      }}
                    >
                      {isHi && selectedSurgery.stayDaysHi
                        ? selectedSurgery.stayDaysHi
                        : selectedSurgery.stayDays}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#334155',
                      marginTop: 4,
                      lineHeight: 16,
                    }}
                  >
                    {isHi && selectedSurgery.whatItInvolvesHi
                      ? selectedSurgery.whatItInvolvesHi
                      : selectedSurgery.whatItInvolves}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '500',
                        color: '#64748B',
                      }}
                    >
                      {isHi ? 'रिकवरी: ' : 'Recovery: '}
                      {isHi && selectedSurgery.recoveryTimelineHi
                        ? selectedSurgery.recoveryTimelineHi
                        : selectedSurgery.recoveryTimeline}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#1D4ED8',
                      }}
                    >
                      {isHi ? 'न्यूनतम ' : 'From '}
                      {inr(selectedSurgery.price)}*
                    </Text>
                  </View>
                </View>
              )}

              {/* Room Choice Section */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#0F172A',
                  marginBottom: 8,
                }}
              >
                {isHi ? 'पसंदीदा रूम चुनें' : 'Choose Room Preference'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  rowGap: 8,
                  marginBottom: 14,
                }}
              >
                {roomOptions.map((r) => {
                  const isSelected = roomType === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => onSelectRoomType(r.id as any)}
                      activeOpacity={0.85}
                      style={{
                        width: '48.5%',
                        backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                        borderRadius: 14,
                        padding: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: isSelected ? '#DBEAFE' : '#F1F5F9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {r.icon(isSelected ? '#2563EB' : '#64748B')}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSelected ? '#1E40AF' : '#0F172A',
                          }}
                          numberOfLines={1}
                        >
                          {r.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#64748B',
                            marginTop: 1,
                          }}
                          numberOfLines={1}
                        >
                          {r.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Patient Information Inputs */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#0F172A',
                  marginBottom: 6,
                }}
              >
                {isHi ? 'मरीज संपर्क विवरण' : 'Patient Contact Details'}
              </Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                <TextInput
                  value={patientName}
                  onChangeText={onPatientNameChange}
                  placeholder={isHi ? 'मरीज का पूरा नाम' : 'Patient full name'}
                  placeholderTextColor="#94A3B8"
                  style={[
                    {
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    },
                    Platform.OS === 'web' &&
                      ({ outline: 'none', outlineStyle: 'none' } as any),
                  ]}
                />
                <TextInput
                  value={patientPhone}
                  onChangeText={onPatientPhoneChange}
                  placeholder={
                    isHi
                      ? 'कॉल के लिए मोबाइल नंबर'
                      : 'Mobile number for callback'
                  }
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={[
                    {
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    },
                    Platform.OS === 'web' &&
                      ({ outline: 'none', outlineStyle: 'none' } as any),
                  ]}
                />
                <TextInput
                  value={insurancePolicy}
                  onChangeText={onInsurancePolicyChange}
                  placeholder={
                    isHi
                      ? 'स्वास्थ्य बीमा कंपनी (उदा. स्टार हेल्थ, केयर)'
                      : 'Health Insurance provider (e.g. Star Health, Care)'
                  }
                  placeholderTextColor="#94A3B8"
                  style={[
                    {
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    },
                    Platform.OS === 'web' &&
                      ({ outline: 'none', outlineStyle: 'none' } as any),
                  ]}
                />
                <TextInput
                  value={admissionReason}
                  onChangeText={onAdmissionReasonChange}
                  placeholder={
                    isHi
                      ? 'संक्षिप्त विवरण (उदा. डॉक्टर ने अगले हफ्ते सर्जरी की सलाह दी)'
                      : 'Brief notes (e.g. doctor advised surgery next week)'
                  }
                  placeholderTextColor="#94A3B8"
                  style={[
                    {
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    },
                    Platform.OS === 'web' &&
                      ({ outline: 'none', outlineStyle: 'none' } as any),
                  ]}
                />
              </View>

              {/* Cashless guarantee note */}
              <View
                style={{
                  backgroundColor: '#ECFDF5',
                  borderRadius: 12,
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <ShieldCheck size={16} color="#059669" />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#065F46',
                    flex: 1,
                  }}
                >
                  {isHi
                    ? 'बीमा कागजी कार्रवाई और पार्टनर अस्पताल भर्ती हेतु समर्पित सहायता।'
                    : 'Dedicated assistance for insurance paperwork & partner hospital admission.'}
                </Text>
              </View>

              {/* Submit CTA */}
              <TouchableOpacity
                onPress={onSubmit}
                disabled={isSubmitting}
                activeOpacity={0.88}
                style={{
                  backgroundColor: '#2563EB',
                  borderRadius: 14,
                  paddingVertical: 13,
                  alignItems: 'center',
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {isSubmitting
                    ? isHi
                      ? 'अनुरोध भेजा जा रहा है...'
                      : 'Submitting Request...'
                    : isHi
                    ? 'भर्ती अनुरोध सुनिश्चित करें →'
                    : 'Confirm Inpatient Admission →'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
