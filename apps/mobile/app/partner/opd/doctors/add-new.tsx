import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadPrescriptionSlip } from '@adityam/supabase';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { usePartnerAuth } from '../../../../components/partner/PartnerAuthGate';
import { AddDoctorPage } from '../../../../components/admin/doctors/AddDoctorPage';
import { usePartnerHospitalId } from '../../../../src/hooks/usePartnerHospitalId';

export default function PartnerAddNewDoctorRoute() {
  const router = useRouter();
  const { editSlug } = useLocalSearchParams<{ editSlug?: string }>();
  const { partnerUser } = usePartnerAuth();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const hospitalId = usePartnerHospitalId();

  const handlePickPhoto = async (
    onPicked: (url: string) => void,
    options?: { aspect?: [number, number]; allowsEditing?: boolean }
  ) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: options?.allowsEditing ?? true,
        ...(options?.aspect ? { aspect: options.aspect } : {}),
        quality: 0.8,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setIsUploadingPhoto(true);
      const uploadedUrl = await uploadPrescriptionSlip(
        asset.uri,
        `doctor_${Date.now()}.jpg`,
        asset.base64 ?? undefined
      );
      onPicked(uploadedUrl);
    } catch {
      Alert.alert('Upload Notice', 'Could not pick image. You can paste an image URL instead.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <PartnerShell
      activeRoute="opd_doctors"
      title={editSlug ? 'Edit Doctor' : 'Add New Doctor'}
      subtitle="Configure qualifications, sitting schedule, branch & OPD availability"
    >
      <AddDoctorPage
        editSlug={editSlug}
        partnerMode={true}
        lockedHospitalId={hospitalId}
        submittedBy={
          partnerUser
            ? { id: partnerUser.id, fullName: partnerUser.fullName, email: partnerUser.email }
            : undefined
        }
        isUploadingPhoto={isUploadingPhoto}
        onPickPhoto={handlePickPhoto}
        onCancel={() => router.replace('/partner/opd/doctors' as any)}
        onSaved={async () => {
          router.replace('/partner/opd/doctors' as any);
        }}
      />
    </PartnerShell>
  );
}
