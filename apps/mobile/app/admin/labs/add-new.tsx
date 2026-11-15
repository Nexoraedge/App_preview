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
import { AddLabPage } from '../../../components/admin/labs/AddLabPage';

export default function AddNewLabRoute() {
  const router = useRouter();
  const { editSlug } = useLocalSearchParams<{ editSlug?: string }>();
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
        `lab_${Date.now()}.jpg`,
        asset.base64 ?? undefined
      );
      onPicked(uploadedUrl);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Could not upload image. You can paste an image URL directly.');
      } else {
        Alert.alert('Upload Failed', 'You can paste an image URL directly.');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSelectSection = (sec: AdminNavSection) => {
    router.replace(`/admin?section=${sec}` as any);
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#FAF8F2' }}>
      <AdminSidebar
        activeSection="labs"
        onSelectSection={handleSelectSection}
        isDesktop={isDesktop}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenPatientApp={() => router.push('/(tabs)')}
        counts={{
          totalBookings: 0,
          pendingRx: 0,
          hospitals: 0,
          labs: 0,
          pharmacies: 0,
          patients: 0,
        }}
        realtimeConnected={true}
      />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        {!isDesktop && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E6E1D5',
            }}
          >
            <TouchableOpacity
              onPress={() => setMobileMenuOpen(true)}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#FAF8F2',
                borderWidth: 1,
                borderColor: '#E6E1D5',
              }}
            >
              <Menu size={18} color="#1A2421" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2421' }}>
              {editSlug ? 'Edit Lab Centre' : 'Add Lab & Scan Centre'}
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
          <AddLabPage
            editSlug={typeof editSlug === 'string' ? editSlug : undefined}
            isUploadingPhoto={isUploadingPhoto}
            onPickPhoto={handlePickPhoto}
            onCancel={() =>
              editSlug
                ? router.replace(`/admin/labs/${editSlug}` as any)
                : router.replace('/admin?section=labs' as any)
            }
            onSaved={async (savedSlug) => {
              router.replace(`/admin/labs/${savedSlug}` as any);
            }}
          />
        </ScrollView>
      </View>
    </View>
  );
}
