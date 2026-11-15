import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Menu } from 'lucide-react-native';
import { uploadPrescriptionSlip } from '@adityam/supabase';
import { AdminSidebar, AdminNavSection } from '../../../components/admin/AdminSidebar';
import { AddHospitalPage } from '../../../components/admin/hospitals/AddHospitalPage';

export default function AddNewHospitalRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editSlug?: string;
    prefillName?: string;
    prefillPhone?: string;
    prefillAddress?: string;
    prefillCity?: string;
    prefillArea?: string;
    prefillDiscount?: string;
    prefillSpecialty?: string;
  }>();
  const editSlug = params.editSlug;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePickPhoto = async (onPicked: (url: string) => void) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.75,
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

  const handleSelectSection = (section: AdminNavSection) => {
    router.replace(`/admin?section=${section}` as any);
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#FAF8F2', paddingTop: Platform.OS === 'web' ? 0 : insets.top }}>
      <AdminSidebar
        activeSection="hospitals"
        onSelectSection={handleSelectSection}
        isDesktop={isDesktop}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenPatientApp={() => router.push('/')}
        realtimeConnected={true}
        counts={{
          totalBookings: 0,
          pendingRx: 0,
          hospitals: 0,
          labs: 0,
          pharmacies: 0,
          patients: 0,
        }}
      />

      <View style={{ flex: 1 }}>
        {!isDesktop && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E6E1D5',
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setMobileMenuOpen(true)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                backgroundColor: '#FAF8F2',
                borderWidth: 1,
                borderColor: '#E6E1D5',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Menu size={18} color="#1A2421" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2421' }}>
              {editSlug ? 'Edit Hospital' : 'Add New Hospital'}
            </Text>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: isDesktop ? 28 : 16,
            paddingBottom: 60,
          }}
        >
          <AddHospitalPage
            editSlug={typeof editSlug === 'string' ? editSlug : undefined}
            prefill={{
              name: typeof params.prefillName === 'string' ? params.prefillName : undefined,
              phone: typeof params.prefillPhone === 'string' ? params.prefillPhone : undefined,
              address: typeof params.prefillAddress === 'string' ? params.prefillAddress : undefined,
              city: typeof params.prefillCity === 'string' ? params.prefillCity : undefined,
              area: typeof params.prefillArea === 'string' ? params.prefillArea : undefined,
              discount: typeof params.prefillDiscount === 'string' ? params.prefillDiscount : undefined,
              specialty: typeof params.prefillSpecialty === 'string' ? params.prefillSpecialty : undefined,
            }}
            isUploadingPhoto={isUploadingPhoto}
            onPickPhoto={handlePickPhoto}
            onCancel={() =>
              editSlug
                ? router.replace(`/admin/hospitals/${editSlug}` as any)
                : router.replace('/admin?section=hospitals' as any)
            }
            onCreated={async (slug) => {
              router.replace(`/admin/hospitals/${slug}`);
            }}
          />
        </ScrollView>
      </View>
    </View>
  );
}
