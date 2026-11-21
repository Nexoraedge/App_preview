import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { usePartnerAuth } from '../../../../components/partner/PartnerAuthGate';
import { AddHospitalPage } from '../../../../components/admin/hospitals/AddHospitalPage';

export default function PartnerAddNewHospitalRoute() {
  const router = useRouter();
  const { editSlug, requestId } = useLocalSearchParams<{ editSlug?: string; requestId?: string }>();
  const { partnerUser } = usePartnerAuth();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
        `hospital_${Date.now()}.jpg`,
        asset.base64 ?? undefined
      );
      onPicked(uploadedUrl);
    } catch {
      Alert.alert('Upload Notice', 'Could not pick image. You can paste an image URL instead.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLinkHospitalToPartner = async (hospitalId: string) => {
    if (!partnerUser?.id || partnerUser.partnerHospitalId === hospitalId) return;
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('users')
        .update({ partner_hospital_id: hospitalId })
        .eq('id', partnerUser.id);
    } catch {
      // noop
    }
  };

  return (
    <PartnerShell
      activeRoute="opd_hospital"
      title={editSlug ? 'Edit Hospital Profile' : 'Add New Hospital'}
      subtitle="Facilities, labs, IPD services, main branch & OPD timings"
    >
      <AddHospitalPage
        editSlug={editSlug}
        requestId={requestId}
        partnerMode={true}
        submittedBy={
          partnerUser
            ? { id: partnerUser.id, fullName: partnerUser.fullName, email: partnerUser.email }
            : undefined
        }
        isUploadingPhoto={isUploadingPhoto}
        onPickPhoto={handlePickPhoto}
        onCancel={() => router.replace('/partner/opd/hospital' as any)}
        onSavedHospitalId={handleLinkHospitalToPartner}
        onCreated={async () => {
          router.replace('/partner/opd/hospital' as any);
        }}
      />
    </PartnerShell>
  );
}
