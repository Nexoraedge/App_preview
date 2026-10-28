// apps/mobile/src/services/bookingStorage.ts
// Dual-Layer Resilient Healthcare Booking & Persistence Engine
// Instant offline-first writes to AsyncStorage + background sync to Supabase

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Booking, BookingStatus, ServiceType } from '@adityam/types';
import { getSupabaseClient } from '../lib/supabase';

const LOCAL_BOOKINGS_STORAGE_KEY = '@adityam_local_bookings_v2';

// In-memory pub/sub listener for reactive cross-screen updates
type BookingListener = (bookings: Booking[]) => void;
const listeners = new Set<BookingListener>();

export function subscribeBookings(listener: BookingListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(bookings: Booking[]) {
  listeners.forEach((listener) => {
    try {
      listener(bookings);
    } catch (err) {
      console.warn('[bookingStorage] listener error:', err);
    }
  });
}

/**
 * Realistic Baseline Seed Appointments
 */
export const SEED_HISTORICAL_BOOKINGS: Booking[] = [
  {
    id: 'seed-apt-1',
    booking_ref: 'AN-2026-7821',
    service_type: 'OPD_CONCIERGE',
    user_id: '00000000-0000-0000-0000-000000000001',
    patient_name: 'Abhishek Jain',
    patient_phone: '+91 99999 99999',
    hospital_name: 'Jain ENT Hospital',
    branch_name: 'Main Campus, Karkardooma',
    doctor_name: 'Dr. Satish Jain',
    doctor_fee: 800,
    slot_time: 'Tomorrow, 10:30 AM',
    specialty_requested: 'ENT & Head-Neck Surgery',
    status: 'CONFIRMED',
    call_status: 'connected',
    notes: 'Priority OPD token issued. Direct desk check-in code generated.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'seed-apt-2',
    booking_ref: 'AN-2026-9043',
    service_type: 'OPD_CONCIERGE',
    user_id: '00000000-0000-0000-0000-000000000001',
    patient_name: 'Sunita Malhotra (Mother)',
    patient_phone: '+91 99999 99999',
    hospital_name: 'Sir Ganga Ram Hospital',
    branch_name: 'Rajinder Nagar, New Delhi',
    doctor_name: 'Dr. Arvind Kumar',
    doctor_fee: 1200,
    slot_time: 'Friday, 02:00 PM',
    specialty_requested: 'Cardiology & Heart Care',
    status: 'NEW',
    call_status: 'pending',
    notes: 'Tele-concierge coordinating VIP queue bypass.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'seed-apt-3',
    booking_ref: 'AN-2026-6109',
    service_type: 'INVESTIGATION',
    user_id: '00000000-0000-0000-0000-000000000001',
    patient_name: 'Abhishek Jain',
    patient_phone: '+91 99999 99999',
    hospital_name: 'Adityam Partner Labs • Saket Center',
    branch_name: 'Saket Community Center',
    doctor_name: 'Diagnostic Pathology Bay',
    doctor_fee: 1499,
    slot_time: 'Completed • Oct 14, 2026',
    specialty_requested: 'Pathology & Diagnostic Panel',
    status: 'PAID',
    call_status: 'completed',
    notes: 'Full Body Lipid & HbA1c panel verified. Digital report uploaded.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
];

/**
 * Read locally saved bookings from AsyncStorage
 */
export async function getLocalBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
    if (!raw) {
      // First run: save seed bookings
      await AsyncStorage.setItem(
        LOCAL_BOOKINGS_STORAGE_KEY,
        JSON.stringify(SEED_HISTORICAL_BOOKINGS)
      );
      return SEED_HISTORICAL_BOOKINGS;
    }
    const parsed: Booking[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[bookingStorage] getLocalBookings fallback:', err);
    return SEED_HISTORICAL_BOOKINGS;
  }
}

/**
 * Save new booking with dual persistence (AsyncStorage + Supabase sync)
 */
export async function saveNewBooking(booking: Booking): Promise<Booking> {
  try {
    const current = await getLocalBookings();
    // Prepend new booking at top
    const updated = [booking, ...current.filter((b) => b.id !== booking.id && b.booking_ref !== booking.booking_ref)];
    await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(updated));

    // Web LocalStorage mirror
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }

    notifyListeners(updated);

    // Background push to Supabase Cloud (with timeout guarantee)
    syncBookingToSupabase(booking).catch(() => {});

    return booking;
  } catch (err) {
    console.error('[bookingStorage] saveNewBooking failed:', err);
    return booking;
  }
}

/**
 * Background async push to Supabase table
 */
async function syncBookingToSupabase(booking: Booking): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    // Upsert into Supabase bookings table
    const { error } = await Promise.race([
      supabase.from('bookings').upsert(
        {
          id: booking.id,
          booking_ref: booking.booking_ref,
          service_type: booking.service_type,
          user_id: booking.user_id,
          patient_name: booking.patient_name,
          patient_phone: booking.patient_phone,
          hospital_name: booking.hospital_name,
          branch_name: booking.branch_name,
          doctor_name: booking.doctor_name,
          doctor_fee: booking.doctor_fee,
          slot_time: booking.slot_time,
          specialty_requested: booking.specialty_requested,
          status: booking.status,
          call_status: booking.call_status,
          notes: booking.notes,
          created_at: booking.created_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'booking_ref' }
      ),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase sync timeout')), 4000)
      ),
    ]);

    if (error) {
      console.warn('[bookingStorage] Supabase upsert non-fatal error:', error.message);
    }
  } catch (err: any) {
    // Non-fatal, offline resilience active
    console.warn('[bookingStorage] Supabase sync deferred (offline-safe):', err?.message || err);
  }
}

/**
 * Fetch all bookings merging local + Supabase
 */
export async function fetchAllBookings(userPhone?: string | null): Promise<Booking[]> {
  const localList = await getLocalBookings();

  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (userPhone) {
      const clean = userPhone.replace(/\D/g, '');
      query = query.or(`patient_phone.ilike.%${clean}%,user_id.eq.${userPhone}`);
    }

    const { data, error } = await Promise.race([
      query,
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timeout')), 3500)
      ),
    ]);

    if (!error && Array.isArray(data) && data.length > 0) {
      // Merge remote and local without duplicate refs
      const localMap = new Map<string, Booking>();
      localList.forEach((b) => localMap.set(b.booking_ref, b));
      data.forEach((remote: Booking) => {
        localMap.set(remote.booking_ref, remote);
      });

      const merged = Array.from(localMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Refresh local cache with latest cloud truth
      await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // Offline mode: proceed with local
  }

  return localList;
}

/**
 * Update booking status (e.g. CANCELLED, CONFIRMED)
 */
export async function updateBookingStatus(
  bookingRef: string,
  newStatus: BookingStatus,
  notes?: string
): Promise<boolean> {
  try {
    const current = await getLocalBookings();
    const updated = current.map((b) => {
      if (b.booking_ref === bookingRef || b.id === bookingRef) {
        return {
          ...b,
          status: newStatus,
          notes: notes ? `${b.notes || ''} • ${notes}` : b.notes,
          updated_at: new Date().toISOString(),
        };
      }
      return b;
    });

    await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
    notifyListeners(updated);

    // Sync to Supabase
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          status: newStatus,
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', bookingRef);
    } catch {}

    return true;
  } catch (err) {
    console.error('[bookingStorage] updateBookingStatus error:', err);
    return false;
  }
}
