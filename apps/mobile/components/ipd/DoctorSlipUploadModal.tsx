// apps/mobile/components/ipd/DoctorSlipUploadModal.tsx
// Doctor admission advice slip upload bottom sheet modal

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
import { X, CheckCircle2, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DoctorSlipUploadModalProps {
  visible: boolean;
  onClose: () => void;
  isHi: boolean;
  patientName: string;
  onPatientNameChange: (text: string) => void;
  patientPhone: string;
  onPatientPhoneChange: (text: string) => void;
  adviceNote: string;
  onAdviceNoteChange: (text: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  successRef: string | null;
}

export function DoctorSlipUploadModal({
  visible,
  onClose,
  isHi,
  patientName,
  onPatientNameChange,
  patientPhone,
  onPatientPhoneChange,
  adviceNote,
  onAdviceNoteChange,
  isSubmitting,
  onSubmit,
  successRef,
}: DoctorSlipUploadModalProps) {
  const insets = useSafeAreaInsets();

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
            maxHeight: '80%',
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
            <View>
              <Text
                style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}
              >
                {isHi
                  ? 'डॉक्टर का पर्चा अपलोड करें'
                  : "Upload Doctor's Advice Slip"}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '400',
                  color: '#64748B',
                  marginTop: 1,
                }}
              >
                {isHi
                  ? 'पारदर्शी अस्पताल दरें और बीमा सहायता प्राप्त करें'
                  : 'Get transparent hospital rates & insurance assistance'}
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

          {successRef ? (
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
                  ? 'पर्चा सफलतापूर्वक प्राप्त हुआ'
                  : 'Slip Received Successfully'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#2563EB',
                  marginTop: 4,
                }}
              >
                {isHi ? 'केस आईडी: ' : 'Case ID: '}
                {successRef}
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
                  ? `आदित्यम निरामया केयर सलाहकार आपके पर्चे की समीक्षा कर रहे हैं। हम जल्द ही ${patientPhone} पर अस्पताल पैकेज अनुमान के साथ संपर्क करेंगे।`
                  : `An Adityam Niramayaa care advisor is reviewing your prescription. We will contact you at ${patientPhone} with comparative package estimates.`}
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {/* Upload box */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#93C5FD',
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Upload size={24} color="#2563EB" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#0F172A',
                    marginTop: 8,
                  }}
                >
                  {isHi
                    ? 'डॉक्टर का पर्चा संलग्न करें'
                    : "Doctor's prescription attached"}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  {isHi
                    ? 'पीडीएफ या फोटो (अधिकतम 10 एमबी)'
                    : 'PDF or Image (Max 10 MB)'}
                </Text>
              </View>

              {/* Patient Name */}
              <TextInput
                value={patientName}
                onChangeText={onPatientNameChange}
                placeholder={isHi ? 'मरीज का नाम' : 'Patient name'}
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
                    marginBottom: 8,
                  },
                  Platform.OS === 'web' &&
                    ({ outline: 'none', outlineStyle: 'none' } as any),
                ]}
              />

              {/* Patient Phone */}
              <TextInput
                value={patientPhone}
                onChangeText={onPatientPhoneChange}
                placeholder={
                  isHi ? 'संपर्क फोन नंबर' : 'Contact phone number'
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
                    marginBottom: 8,
                  },
                  Platform.OS === 'web' &&
                    ({ outline: 'none', outlineStyle: 'none' } as any),
                ]}
              />

              {/* Notes */}
              <TextInput
                value={adviceNote}
                onChangeText={onAdviceNoteChange}
                placeholder={
                  isHi
                    ? 'उपचार या अस्पताल की प्राथमिकता का विवरण लिखें...'
                    : 'Describe advised treatment or specific hospital preference...'
                }
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
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
                    marginBottom: 14,
                    height: 70,
                    textAlignVertical: 'top',
                  },
                  Platform.OS === 'web' &&
                    ({ outline: 'none', outlineStyle: 'none' } as any),
                ]}
              />

              {/* Submit Button */}
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
                      ? 'पर्चा भेजा जा रहा है...'
                      : 'Uploading Advice Slip...'
                    : isHi
                    ? 'पर्चा भेजें और कॉल पाएं →'
                    : 'Submit Slip for Review →'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
