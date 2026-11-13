// apps/mobile/components/labs/LabPrescriptionUploadModal.tsx
// Cross-platform (Web, iOS, Android) Lab Prescription Upload Modal
// Uploads slip to Supabase Storage (with base64 fallback), uses live current address,
// and saves directly to Supabase bookings table.

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Upload,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  MapPin,
  User,
  Users,
  Trash2,
  FileText,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useFamily, getRelationLabel, type Member } from '../../src/context/FamilyContext';
import { useLocation } from '../../src/context/LocationContext';
import { uploadPrescriptionSlip } from '../../src/lib/supabase';
import { saveNewBooking } from '../../src/services/bookingStorage';
import { triggerBrowserNotification } from '../../src/services/notificationService';
import { VerifyPhoneModal } from '../auth/VerifyPhoneModal';

interface LabPrescriptionUploadModalProps {
  visible: boolean;
  onClose: () => void;
  isHi: boolean;
  onViewAppointments?: () => void;
}

export function LabPrescriptionUploadModal({
  visible,
  onClose,
  isHi,
  onViewAppointments,
}: LabPrescriptionUploadModalProps) {
  const { user } = useAuth();
  const { members } = useFamily();
  const { activeAddress, currentLocationName } = useLocation();

  const [slipUri, setSlipUri] = useState<string | null>(null);
  const [slipBase64, setSlipBase64] = useState<string | undefined>(undefined);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('self');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false);

  const hasValidUserPhone = Boolean(
    user?.phone &&
      !user.phone.startsWith('+9100') &&
      !user.phone.startsWith('+910') &&
      user.phone !== '+91 99999 99999'
  );

  const effectiveSelfName = user?.full_name || (isHi ? 'रोगी' : 'Patient');
  const familyMembers = useMemo<Member[]>(
    () => members.filter((m: Member) => m.id !== 'self'),
    [members]
  );
  const selectedMember = familyMembers.find((m: Member) => m.id === selectedPatientId);
  const currentPatientName = selectedMember
    ? `${selectedMember.name} (${getRelationLabel(selectedMember.relation, isHi)})`
    : effectiveSelfName;

  // Always resolve the user's live current address from LocationContext (no hardcoded demo address)
  const resolvedAddress = useMemo(() => {
    if (activeAddress) {
      const parts = [
        activeAddress.house_flat,
        activeAddress.landmark_street,
        activeAddress.city,
        activeAddress.pincode,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    return currentLocationName || (isHi ? 'वर्तमान स्थान' : 'Current Location');
  }, [activeAddress, currentLocationName, isHi]);

  const handlePickGallery = async () => {
    setErrorMsg(null);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg(
            isHi
              ? 'पर्चा अपलोड करने के लिए गैलरी की अनुमति दें।'
              : 'Gallery permission is required to select a prescription.'
          );
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setSlipUri(res.assets[0].uri);
        setSlipBase64(res.assets[0].base64 || undefined);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not open image picker.');
    }
  };

  const handlePickCamera = async () => {
    setErrorMsg(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setErrorMsg(
          isHi
            ? 'फोटो लेने के लिए कैमरा अनुमति आवश्यक है।'
            : 'Camera permission is required to take a photo.'
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setSlipUri(res.assets[0].uri);
        setSlipBase64(res.assets[0].base64 || undefined);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not open camera.');
    }
  };

  const submitPrescriptionOrder = async () => {
    if (!slipUri) {
      setErrorMsg(
        isHi ? 'कृपया पहले डॉक्टर के पर्चे की फोटो चुनें।' : 'Please attach a photo of your prescription first.'
      );
      return;
    }

    if (!hasValidUserPhone) {
      setIsVerifyPhoneOpen(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const bookingRef = `AN-LAB-RX-${Math.floor(1000 + Math.random() * 9000)}`;
      const uploadedUrl = await uploadPrescriptionSlip(
        slipUri,
        `${bookingRef}_slip.jpg`,
        slipBase64
      );

      const newBooking: Booking = {
        id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }),
        booking_ref: bookingRef,
        service_type: 'INVESTIGATION',
        user_id: user?.id || '00000000-0000-0000-0000-000000000001',
        patient_name: currentPatientName,
        patient_phone: user?.phone || '',
        hospital_name: 'Adityam Diagnostic Concierge',
        branch_name: resolvedAddress,
        doctor_name: 'Doctor Prescription Upload (Lab Panel Curation)',
        doctor_fee: 0,
        slot_time: 'Immediate Medical Review (within 15 mins)',
        specialty_requested: 'Pathology & Diagnostic Scans',
        status: 'PAID',
        call_status: 'connected',
        bill_image_url: uploadedUrl,
        notes: `Prescription slip uploaded for lab test curation. Address: ${resolvedAddress}.${
          notes.trim() ? ` Note: ${notes.trim()}` : ''
        }`,
        created_at: new Date().toISOString(),
      };

      await saveNewBooking(newBooking);
      triggerBrowserNotification(
        'Lab Prescription Uploaded',
        `Ref #${bookingRef}: Our medical team will curate your test panel within 15 mins.`
      );
      setConfirmedRef(bookingRef);
    } catch (e: any) {
      setErrorMsg(
        e?.message || (isHi ? 'पर्चा अपलोड करने में समस्या आई।' : 'Failed to upload prescription. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSlipUri(null);
    setSlipBase64(undefined);
    setNotes('');
    setErrorMsg(null);
    setConfirmedRef(null);
    onClose();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 16,
              paddingHorizontal: 18,
              paddingBottom: Platform.OS === 'web' ? 24 : 34,
              maxHeight: '90%',
              maxWidth: 600,
              width: '100%',
              alignSelf: 'center',
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: confirmedRef ? '#ECFDF5' : '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {confirmedRef ? (
                    <CheckCircle2 size={20} color="#10B981" />
                  ) : (
                    <FileText size={20} color="#2563EB" />
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    {confirmedRef
                      ? isHi
                        ? 'पर्चा सफलतापूर्वक दर्ज हुआ!'
                        : 'Prescription Registered!'
                      : isHi
                        ? 'लैब जांच हेतु पर्चा अपलोड करें'
                        : 'Upload Lab Prescription'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                    {isHi
                      ? 'हमारी टीम 15 मिनट में सही टेस्ट बुक करेगी'
                      : 'Our medical team curates the right tests in 15 mins'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleClose}
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 14 }}>
              {confirmedRef ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: '#DCFCE7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <CheckCircle2 size={34} color="#16A34A" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                    {isHi ? 'पर्चा प्राप्त हुआ!' : 'Prescription Received!'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#2563EB', marginTop: 4 }}>
                    #{confirmedRef}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: '#475569',
                      textAlign: 'center',
                      marginTop: 10,
                      lineHeight: 19,
                      paddingHorizontal: 10,
                    }}
                  >
                    {isHi
                      ? 'आपका पर्चा सुरक्षित रूप से सहेजा गया है। हमारी मेडिकल टीम 15 मिनट में आपसे संपर्क करेगी।'
                      : 'Your prescription has been saved securely to Supabase. Our diagnostics coordinator will call you within 15 minutes with the curated test panel & best rates.'}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
                    <TouchableOpacity
                      onPress={handleClose}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: '#F1F5F9',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontWeight: '700', color: '#334155', fontSize: 13 }}>
                        {isHi ? 'बंद करें' : 'Done'}
                      </Text>
                    </TouchableOpacity>
                    {onViewAppointments && (
                      <TouchableOpacity
                        onPress={() => {
                          handleClose();
                          onViewAppointments();
                        }}
                        style={{
                          flex: 1.4,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: '#1E40AF',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontWeight: '800', color: '#FFFFFF', fontSize: 13 }}>
                          {isHi ? 'मेरी नियुक्तियां देखें' : 'View in Appointments'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View>
                  {/* Upload / Preview Box */}
                  {slipUri ? (
                    <View
                      style={{
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: '#2563EB',
                        backgroundColor: '#F8FAFC',
                        padding: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: slipUri }}
                        style={{ width: '100%', height: 190, borderRadius: 12, resizeMode: 'contain' }}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setSlipUri(null);
                          setSlipBase64(undefined);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 10,
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: '#FEE2E2',
                        }}
                      >
                        <Trash2 size={14} color="#DC2626" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                          {isHi ? 'हटाएं व दूसरा चुनें' : 'Remove & Re-upload'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        onPress={handlePickGallery}
                        activeOpacity={0.85}
                        style={{
                          flex: 1,
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: '#3B82F6',
                          borderRadius: 16,
                          paddingVertical: 22,
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <ImageIcon size={24} color="#2563EB" />
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E40AF' }}>
                          {isHi ? 'गैलरी / फ़ाइल चुनें' : 'Choose File / Gallery'}
                        </Text>
                      </TouchableOpacity>

                      {Platform.OS !== 'web' && (
                        <TouchableOpacity
                          onPress={handlePickCamera}
                          activeOpacity={0.85}
                          style={{
                            flex: 1,
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1.5,
                            borderStyle: 'dashed',
                            borderColor: '#94A3B8',
                            borderRadius: 16,
                            paddingVertical: 22,
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Camera size={24} color="#334155" />
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155' }}>
                            {isHi ? 'कैमरे से फोटो लें' : 'Take Photo'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Current Location Display */}
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <MapPin size={16} color="#2563EB" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        {isHi ? 'वर्तमान कलेक्शन पता' : 'Current Collection Address'}
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                        {resolvedAddress}
                      </Text>
                    </View>
                  </View>

                  {/* Patient Selector */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                      {isHi ? 'रोगी चुनें' : 'Select Patient'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setSelectedPatientId('self')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          backgroundColor: selectedPatientId === 'self' ? '#EFF6FF' : '#FFFFFF',
                          borderColor: selectedPatientId === 'self' ? '#2563EB' : '#E2E8F0',
                        }}
                      >
                        <User size={13} color={selectedPatientId === 'self' ? '#2563EB' : '#64748B'} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: selectedPatientId === 'self' ? '#1E40AF' : '#334155',
                          }}
                        >
                          {effectiveSelfName} ({isHi ? 'स्वयं' : 'Self'})
                        </Text>
                      </TouchableOpacity>
                      {familyMembers.map((m) => {
                        const isSel = selectedPatientId === m.id;
                        return (
                          <TouchableOpacity
                            key={m.id}
                            onPress={() => setSelectedPatientId(m.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1.5,
                              backgroundColor: isSel ? '#EFF6FF' : '#FFFFFF',
                              borderColor: isSel ? '#2563EB' : '#E2E8F0',
                            }}
                          >
                            <Users size={13} color={isSel ? '#2563EB' : '#64748B'} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#1E40AF' : '#334155' }}>
                              {m.name} ({getRelationLabel(m.relation, isHi)})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Optional Notes */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                      {isHi ? 'अतिरिक्त निर्देश (वैकल्पिक)' : 'Additional Notes (Optional)'}
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder={
                        isHi
                          ? 'उदा. कल सुबह 7 बजे घर से सैंपल कलेक्शन चाहिए...'
                          : 'e.g., Prefer morning home sample collection tomorrow...'
                      }
                      placeholderTextColor="#94A3B8"
                      multiline
                      style={{
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: '#0F172A',
                        minHeight: 64,
                        textAlignVertical: 'top',
                      }}
                    />
                  </View>

                  {errorMsg && (
                    <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700', marginTop: 10 }}>
                      {errorMsg}
                    </Text>
                  )}

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={submitPrescriptionOrder}
                    disabled={isSubmitting || !slipUri}
                    activeOpacity={0.85}
                    style={{
                      marginTop: 16,
                      backgroundColor: slipUri ? '#1E40AF' : '#CBD5E1',
                      paddingVertical: 14,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Upload size={16} color="#FFFFFF" />
                    )}
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                      {isSubmitting
                        ? isHi
                          ? 'अपलोड हो रहा है...'
                          : 'Uploading & Saving...'
                        : isHi
                          ? 'पर्चा भेजें और टेस्ट बुक करें'
                          : 'Submit Prescription'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <VerifyPhoneModal
        visible={isVerifyPhoneOpen}
        onClose={() => setIsVerifyPhoneOpen(false)}
        onSuccess={() => {
          setIsVerifyPhoneOpen(false);
          submitPrescriptionOrder();
        }}
        isHi={isHi}
        title={isHi ? 'पर्चा भेजने हेतु मोबाइल सत्यापन' : 'Verify Phone for Lab Prescription'}
        subtitle={
          isHi
            ? 'हमारी मेडिकल टीम द्वारा संपर्क व रिपोर्ट भेजने हेतु अपना 10-अंकों का मोबाइल नंबर सत्यापित करें।'
            : 'Verify your 10-digit mobile number so our diagnostics coordinator can call you with your curated test panel.'
        }
      />
    </>
  );
}

