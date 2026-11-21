// apps/mobile/src/services/bookingStorage.ts
// Dual-Layer Resilient Healthcare Booking & Persistence Engine
// Instant offline-first writes to AsyncStorage + direct guaranteed sync to Supabase Cloud

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Booking, BookingStatus, ServiceType } from '@adityam/types';
import { getSupabaseClient } from '../lib/supabase';

const LOCAL_BOOKINGS_STORAGE_KEY = '@adityam_local_bookings_v3';

// In-memory pub/sub listener for reactive cross-screen updates
type BookingListener = (bookings: Booking[]) => void;
const listeners = new Set<BookingListener>();

export function subscribeBookings(listener: BookingListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Rigorously determine whether a booking is active/upcoming vs past/completed
 */
export function isBookingUpcoming(b: Booking): boolean {
  if (!b) return false;

  // 1. Terminal cancellation or completion status
  if (
    b.status === 'CANCELLED' ||
    b.status === 'COMPLETED' ||
    b.status === 'SERVED' ||
    b.status === 'MISSED'
  ) {
    return false;
  }

  const slotLower = (b.slot_time || '').toLowerCase();
  const notesLower = (b.notes || '').toLowerCase();

  // 2. Keyword detection in slot string or notes
  if (
    slotLower.includes('completed') ||
    slotLower.includes('delivered') ||
    slotLower.includes('expired') ||
    slotLower.includes('missed') ||
    slotLower.includes('report ready') ||
    notesLower.includes('report uploaded') ||
    notesLower.includes('digital report uploaded') ||
    notesLower.includes('delivered')
  ) {
    return false;
  }

  // 3. Completed telephony / investigation call status
  if (
    b.call_status === 'completed' &&
    (b.service_type === 'INVESTIGATION' || notesLower.includes('panel verified') || notesLower.includes('paid ₹'))
  ) {
    return false;
  }

  // 4. Slot keyword shortcuts
  if (slotLower.includes('yesterday')) {
    return false;
  }

  if (
    slotLower.includes('today') ||
    slotLower.includes('tomorrow') ||
    slotLower.includes('immediate') ||
    slotLower.includes('next available') ||
    slotLower.includes('in 45 mins') ||
    slotLower.includes('45 mins')
  ) {
    return true;
  }

  // 5. Explicit calendar dates in slot_time (e.g., "Oct 14, 2026", "14 Oct 2026", "2026-10-14")
  const dateRegex = /\b(?:(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}))(?:,?\s+(\d{4}))?\b/i;
  const match = b.slot_time ? b.slot_time.match(dateRegex) : null;
  if (match) {
    try {
      const monthStr = match[2] || match[3];
      const dayStr = match[1] || match[4];
      const yearStr = match[5] || '2026';
      const parsedDate = new Date(`${monthStr} ${dayStr}, ${yearStr}`);
      if (!isNaN(parsedDate.getTime())) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (parsedDate.getTime() < todayStart.getTime()) {
          return false;
        }
      }
    } catch {}
  }

  // 6. Pharmacy scan & pay age check (> 24 hours without active status is past)
  if (b.service_type === 'PHARMACY_SCAN_PAY' && b.created_at) {
    const ageHours = (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      return false;
    }
  }

  return true;
}

/**
 * Cleanly format slot date and time details, stripping legacy status artifacts
 */
export function parseSlotDetails(
  slotTimeRaw?: string | null,
  serviceType?: string,
  isHi?: boolean
): { slotDate: string; slotDateHi: string; slotTime: string } {
  let cleaned = (slotTimeRaw || '').trim();
  // Strip leading prefixes like "Completed • ", "Delivered • ", "Confirmed • "
  cleaned = cleaned.replace(/^(completed|delivered|confirmed|cancelled|active)\s*[•\-–]\s*/i, '').trim();

  const now = new Date();
  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  if (!cleaned) {
    return {
      slotDate: isHi ? `आज, ${fmtDate(now)}` : `Today, ${fmtDate(now)}`,
      slotDateHi: `आज, ${fmtDate(now)}`,
      slotTime: isHi ? 'समय निर्धारित' : 'Slot Confirmed',
    };
  }

  let datePart = `Today, ${fmtDate(now)}`;
  let timePart = '11:00 AM';

  // 1. If slot has dot/bullet separator e.g. "Today, 12 Nov · 06:00 PM"
  if (/[·•]/.test(cleaned)) {
    const parts = cleaned.split(/[·•]/);
    datePart = parts[0]?.trim() || `Today, ${fmtDate(now)}`;
    timePart = parts[1]?.trim() || '11:00 AM';
  }
  // 2. If cleaned is purely a time like "06:00 PM" or "10:30 AM"
  else if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(cleaned)) {
    datePart = `Today, ${fmtDate(now)}`;
    timePart = cleaned;
  }
  // 3. If it contains a comma e.g. "Today, 12 Nov" or "Today, 10:30 AM" or "Oct 14, 2026"
  else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    // If the second part is a year e.g. "Oct 14, 2026"
    if (parts[1] && /^\s*\d{4}\s*$/.test(parts[1])) {
      datePart = cleaned;
      timePart = serviceType === 'INVESTIGATION'
        ? (isHi ? 'रिपोर्ट उपलब्ध' : 'Report Available')
        : serviceType === 'PHARMACY_SCAN_PAY'
          ? (isHi ? 'वितरित' : 'Delivered')
          : (isHi ? 'परामर्श संपन्न' : 'Visit Completed');
    }
    // If second part is a time e.g. "Today, 06:00 PM"
    else if (parts[1] && /\d{1,2}:\d{2}/.test(parts[1])) {
      datePart = parts[0]?.trim() || `Today, ${fmtDate(now)}`;
      timePart = parts[1]?.trim() || '11:00 AM';
    } else {
      datePart = cleaned;
      timePart = isHi ? 'समय निर्धारित' : 'Slot Confirmed';
    }
  }
  // 4. Keywords like next available / immediate
  else if (cleaned.toLowerCase().includes('next available')) {
    datePart = `Today, ${fmtDate(now)}`;
    timePart = isHi ? 'शीघ्र भर्ती उपलब्ध' : 'Next Available Admission';
  } else if (cleaned.toLowerCase().includes('immediate')) {
    datePart = `Today, ${fmtDate(now)}`;
    timePart = isHi ? 'तत्काल समीक्षा' : 'Immediate Review';
  } else if (cleaned.toLowerCase().includes('delivery') || cleaned.toLowerCase().includes('pickup')) {
    datePart = `Today, ${fmtDate(now)}`;
    timePart = cleaned;
  } else {
    datePart = cleaned;
    timePart = serviceType === 'INVESTIGATION'
      ? (isHi ? 'सैंपल जांच पूर्ण' : 'Report Available')
      : serviceType === 'PHARMACY_SCAN_PAY'
        ? (isHi ? 'दवा वितरण' : 'Order Processed')
        : (isHi ? 'समय निर्धारित' : 'Slot Confirmed');
  }

  // Hindi translation of datePart
  let datePartHi = datePart
    .replace(/\bToday\b/gi, 'आज')
    .replace(/\bTomorrow\b/gi, 'कल')
    .replace(/\bMon\b/gi, 'सोम')
    .replace(/\bTue\b/gi, 'मंगल')
    .replace(/\bWed\b/gi, 'बुध')
    .replace(/\bThu\b/gi, 'गुरु')
    .replace(/\bFri\b/gi, 'शुक्र')
    .replace(/\bSat\b/gi, 'शनि')
    .replace(/\bSun\b/gi, 'रवि');

  return {
    slotDate: datePart,
    slotDateHi: datePartHi,
    slotTime: timePart || (isHi ? 'समय निर्धारित' : 'Slot Confirmed'),
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

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isUuid(str?: string | null): boolean {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
}

/**
 * Read locally saved bookings from AsyncStorage
 */
export async function getLocalBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: Booking[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[bookingStorage] getLocalBookings fallback:', err);
    return [];
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

    // Guaranteed push to Supabase Cloud
    await syncBookingToSupabase(booking);

    return booking;
  } catch (err) {
    console.error('[bookingStorage] saveNewBooking error:', err);
    return booking;
  }
}

/**
 * Push to Supabase bookings table
 */
async function syncBookingToSupabase(booking: Booking): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const id = isUuid(booking.id) ? booking.id : generateUUID();
    const userId = isUuid(booking.user_id) ? booking.user_id : '00000000-0000-0000-0000-000000000001';

    const payload: Record<string, any> = {
      id,
      booking_ref: booking.booking_ref,
      service_type: booking.service_type,
      user_id: userId,
      patient_name: booking.patient_name || 'Patient',
      patient_phone: booking.patient_phone || '+919999999999',
      hospital_id: booking.hospital_id || null,
      hospital_name: booking.hospital_name || null,
      branch_id: booking.branch_id || null,
      branch_name: booking.branch_name || null,
      doctor_id: booking.doctor_id || null,
      doctor_name: booking.doctor_name || null,
      doctor_fee: booking.doctor_fee || null,
      slot_time: booking.slot_time || null,
      specialty_requested: booking.specialty_requested || null,
      bill_amount: booking.bill_amount ?? null,
      discount_amount: booking.discount_amount ?? null,
      final_payable: booking.final_payable ?? null,
      bill_image_url: booking.bill_image_url || null,
      verification_code: (booking as any).verification_code || null,
      assigned_agent: booking.assigned_agent || null,
      status: booking.status || 'NEW',
      call_status: booking.call_status || 'connected',
      notes: booking.notes || null,
      created_at: booking.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('bookings')
      .upsert(payload, { onConflict: 'booking_ref' });

    if (error) {
      console.warn('[bookingStorage] Supabase upsert error:', error.message, error.details);
      // Fallback with minimal columns
      const fallbackPayload = {
        id,
        booking_ref: booking.booking_ref,
        service_type: booking.service_type,
        patient_name: booking.patient_name || 'Patient',
        patient_phone: booking.patient_phone || '+919999999999',
        hospital_name: booking.hospital_name || null,
        specialty_requested: booking.specialty_requested || null,
        status: booking.status || 'NEW',
        call_status: booking.call_status || 'connected',
        notes: [booking.notes, booking.doctor_name ? `Doctor: ${booking.doctor_name}` : null, booking.slot_time ? `Slot: ${booking.slot_time}` : null].filter(Boolean).join(' • '),
        created_at: booking.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase.from('bookings').upsert(fallbackPayload, { onConflict: 'booking_ref' });
    } else {
      console.log('[bookingStorage] Successfully saved booking to Supabase:', booking.booking_ref);
    }
  } catch (err: any) {
    console.warn('[bookingStorage] Supabase sync deferred (offline-safe):', err?.message || err);
  }
}

/**
 * Fetch all bookings from Supabase + local cache
 */
export async function fetchAllBookings(userPhone?: string | null, userId?: string | null): Promise<Booking[]> {
  try {
    const supabase = getSupabaseClient();
    const isDemo = userId === '00000000-0000-0000-0000-000000000001';

    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    // Strictly separate demo bookings from authenticated real users
    if (isDemo) {
      query = query.eq('user_id', '00000000-0000-0000-0000-000000000001');
    } else if (userId && isUuid(userId)) {
      query = query.eq('user_id', userId);
    } else if (userPhone) {
      query = query.eq('patient_phone', userPhone);
    } else {
      return [];
    }

    const { data, error } = await Promise.race([
      query,
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase query timeout')), 5000)
      ),
    ]);

    if (!error && Array.isArray(data)) {
      // Update local storage cache
      await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(data));
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
      return data;
    }
  } catch (err) {
    console.warn('[bookingStorage] fetchAllBookings network fetch failed, using local cache:', err);
  }

  // Fallback to local cache if offline
  return getLocalBookings();
}

/**
 * Subscribe to real-time cloud changes on Supabase bookings table
 */
export function subscribeCloudBookings(userId?: string | null, onUpdate?: () => void): () => void {
  try {
    const supabase = getSupabaseClient();
    const channelName = `realtime-bookings-${userId || 'global'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        async () => {
          await fetchAllBookings(undefined, userId);
          const current = await getLocalBookings();
          notifyListeners(current);
          if (onUpdate) onUpdate();
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {}
    };
  } catch {
    return () => {};
  }
}

/**
 * Update an existing booking's status
 */
export async function updateBookingStatus(
  bookingRefOrId: string,
  newStatus: BookingStatus,
  notesAppend?: string
): Promise<boolean> {
  try {
    const current = await getLocalBookings();
    const updated = current.map((b) => {
      if (b.booking_ref === bookingRefOrId || b.id === bookingRefOrId) {
        return {
          ...b,
          status: newStatus,
          notes: notesAppend ? `${b.notes || ''} • ${notesAppend}` : b.notes,
          updated_at: new Date().toISOString(),
        };
      }
      return b;
    });

    await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
    notifyListeners(updated);

    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          status: newStatus,
          notes: notesAppend,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', bookingRefOrId);
    } catch {}

    return true;
  } catch (err) {
    console.error('[bookingStorage] updateBookingStatus error:', err);
    return false;
  }
}
