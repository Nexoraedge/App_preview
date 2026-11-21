import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { fetchAllBookings } from '../../../src/services/bookingStorage';
import { AdminSidebar, AdminNavSection } from '../../../components/admin/AdminSidebar';
import { VerificationDetailView } from '../../../components/admin/enquiries/VerificationDetailView';

export default function AdminVerificationDetailSlugRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [counts, setCounts] = useState({
    totalBookings: 0,
    pendingRx: 0,
    hospitals: 0,
    enquiries: 0,
    verifications: 0,
    labs: 0,
    pharmacies: 0,
    patients: 0,
  });

  const loadCounts = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const [cloudRes, localList, hospRes, labRes, pharmRes, usersRes, enqRes, verifRes] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(250),
        fetchAllBookings(),
        supabase.from('hospitals').select('id', { count: 'exact', head: true }),
        supabase.from('lab_centres').select('id', { count: 'exact', head: true }),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('partner_enquiries').select('id', { count: 'exact', head: true }).eq('status', 'NEW'),
        supabase
          .from('partner_verification_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['PENDING', 'UNDER_REVIEW']),
      ]);

      const merged = new Map<string, Booking>();
      if (cloudRes.data) {
        for (const b of cloudRes.data as Booking[]) {
          if (b.booking_ref) merged.set(b.booking_ref, b);
        }
      }
      if (Array.isArray(localList)) {
        for (const b of localList) {
          if (b.booking_ref && !merged.has(b.booking_ref)) merged.set(b.booking_ref, b);
        }
      }

      const list = Array.from(merged.values());
      setCounts({
        totalBookings: list.length,
        pendingRx: list.filter((b) => Boolean(b.bill_image_url) && b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length,
        hospitals: hospRes.count ?? 0,
        enquiries: enqRes.count ?? 0,
        verifications: verifRes.count ?? 0,
        labs: labRes.count ?? 0,
        pharmacies: pharmRes.count ?? 0,
        patients: usersRes.count ?? 0,
      });
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const handleSelectSection = (sec: AdminNavSection) => {
    router.replace(`/admin?section=${sec}` as any);
  };

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#FAF8F2',
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
      }}
    >
      <AdminSidebar
        activeSection="verifications"
        onSelectSection={handleSelectSection}
        isDesktop={isDesktop}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenPatientApp={() => router.push('/(tabs)')}
        counts={counts}
        realtimeConnected={true}
      />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E6E1D5',
            paddingHorizontal: isDesktop ? 28 : 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {!isDesktop && (
            <TouchableOpacity
              onPress={() => setMobileMenuOpen(true)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#F3EFE4',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#E6E1D5',
              }}
            >
              <Menu size={18} color="#1A2421" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A2421' }}>
              Verification Review
            </Text>
            <Text style={{ fontSize: 12, color: '#5C6B64' }}>
              /admin/verifications/{id}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: isDesktop ? 28 : 16, paddingBottom: 60 }}
        >
          <VerificationDetailView
            requestId={String(id || '')}
            onStatusChanged={() => void loadCounts()}
            onBack={() => router.replace('/admin?section=verifications' as any)}
          />
        </ScrollView>
      </View>
    </View>
  );
}
