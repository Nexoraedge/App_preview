import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, Hospital } from '@adityam/types';
import { AdminSidebar, AdminNavSection } from '../../../components/admin/AdminSidebar';
import { AdityamNiramayaaLeadsView } from '../../../components/admin/labs/AdityamNiramayaaLeadsView';

export default function AdminAdityamNiramayaaLabsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hospitalsCount, setHospitalsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [bookRes, hospRes] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('hospitals').select('id', { count: 'exact', head: true }),
      ]);
      if (bookRes.data) setBookings(bookRes.data as Booking[]);
      if (typeof hospRes.count === 'number') setHospitalsCount(hospRes.count);
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

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
          totalBookings: bookings.length,
          pendingRx: 0,
          hospitals: hospitalsCount,
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
            <TouchableOpacity onPress={() => setMobileMenuOpen(true)}>
              <Menu size={20} color="#1A2421" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2421' }}>
              Adityam Niramayaa · Leads & Stats
            </Text>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: isDesktop ? 28 : 16, paddingBottom: 60 }}
        >
          {loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#1B5E43" />
              <Text style={{ marginTop: 10, color: '#5C6B64', fontSize: 13 }}>
                Loading Adityam Niramayaa leads & stats...
              </Text>
            </View>
          ) : (
            <AdityamNiramayaaLeadsView
              bookings={bookings}
              onBack={() => router.replace('/admin?section=labs' as any)}
              onRefresh={() => loadData(true)}
              refreshing={refreshing}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
