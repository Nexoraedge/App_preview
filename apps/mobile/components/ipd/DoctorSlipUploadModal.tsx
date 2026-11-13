// apps/mobile/components/ipd/DoctorSlipUploadModal.tsx
// Doctor admission advice slip upload bottom sheet modal

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  Alert,
} from 'react-native';
import { X, CheckCircle2, Upload, Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
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
  onSubmit: (slipUri?: string | null, slipBase64?: string) => void;
  successRef: string | null;
  onViewAppointments?: () => void;
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
  onViewAppointments,
}: DoctorSlipUploadModalProps) {
  const insets = useSafeAreaInsets();
  const [slipUri, setSlipUri] = useState<string | null>(null);
  const [slipBase64, setSlipBase64] = useState<string | undefined>(undefined);

  const handlePickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setSlipUri(res.assets[0].uri);
        setSlipBase64(res.assets[0].base64 || undefined);
      }
    } catch {}
  };

  const handlePickCamera = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setSlipUri(res.assets[0].uri);
        setSlipBase64(res.assets[0].base64 || undefined);
      }
    } catch {}
  };

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

              <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
                {onViewAppointments && (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onViewAppointments();
                    }}
                    style={{
                      backgroundColor: '#2563EB',
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
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
                      {isHi ? 'मेरी अपॉइंटमेंट्स देखें →' : 'View My Bookings →'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    backgroundColor: onViewAppointments ? '#F1F5F9' : '#2563EB',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: onViewAppointments ? '#475569' : '#FFFFFF',
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {isHi ? 'पूर्ण' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {/* Upload box */}
              {slipUri ? (
                <View
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderWidth: 1.5,
                    borderColor: '#86EFAC',
                    borderRadius: 16,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <Image
                    source={{ uri: slipUri }}
                    style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: '#E2E8F0' }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} color="#16A34A" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803D' }}>
                        {isHi ? 'पर्चा संलग्न है' : 'Prescription Attached'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {isHi ? 'तस्वीर सफलतापूर्वक चुनी गई' : 'File selected successfully'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSlipUri(null);
                      setSlipBase64(undefined);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 8 }}
                  >
                    <Trash2 size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    onPress={handlePickGallery}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      backgroundColor: '#F8FAFC',
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: '#93C5FD',
                      borderRadius: 16,
                      padding: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Upload size={22} color="#2563EB" />
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '700',
                        color: '#0F172A',
                        marginTop: 6,
                        textAlign: 'center',
                      }}
                    >
                      {isHi ? 'गैलरी / फ़ाइल चुनें' : 'Choose File / Gallery'}
                    </Text>
                  </TouchableOpacity>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      onPress={handlePickCamera}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: '#CBD5E1',
                        borderRadius: 16,
                        padding: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={22} color="#334155" />
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: '700',
                          color: '#0F172A',
                          marginTop: 6,
                          textAlign: 'center',
                        }}
                      >
                        {isHi ? 'फोटो लें' : 'Take Photo'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

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
                onPress={() => onSubmit(slipUri, slipBase64)}
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
