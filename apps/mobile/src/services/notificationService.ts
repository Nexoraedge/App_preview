// apps/mobile/src/services/notificationService.ts
// In-App & Browser Notification Engine for Adityam Niramayaa.
// Supports day-of appointment alerts, 1-hour advance reminders, refund updates,
// and Web Notification API integration.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking } from '@adityam/types';
import { parseSlotDetails } from './bookingStorage';

export type NotificationType =
  | 'ONE_HOUR_REMINDER'
  | 'TODAY_APPOINTMENT'
  | 'CONFIRMATION'
  | 'REFUND'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  title: string;
  titleHi: string;
  body: string;
  bodyHi: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  bookingRef?: string;
  doctorName?: string;
  hospitalName?: string;
  slotTime?: string;
  actionRoute?: string;
}

const READ_NOTIFS_STORAGE_KEY = '@adityam_read_notifications_v1';

/**
 * Check if a time slot string (e.g. "06:00 PM") is within 60 minutes from now
 */
function isWithinOneHour(slotTimeStr: string): boolean {
  const match = slotTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = hours * 60 + minutes;

  // Between 0 and 60 minutes ahead
  return slotMinutes >= currentMinutes && slotMinutes - currentMinutes <= 60;
}

/**
 * Generate smart contextual notifications dynamically from user's live bookings
 */
export async function getLiveNotifications(bookings: Booking[]): Promise<AppNotification[]> {
  let readIds: string[] = [];
  try {
    const stored = await AsyncStorage.getItem(READ_NOTIFS_STORAGE_KEY);
    if (stored) {
      readIds = JSON.parse(stored);
    }
  } catch { }

  const list: AppNotification[] = [];

  bookings.forEach((b, idx) => {
    const slot = parseSlotDetails(b.slot_time, b.service_type);
    const isToday =
      slot.slotDate.toLowerCase().includes('today') ||
      slot.slotDateHi.includes('आज');
    const doctor = b.doctor_name || 'Specialist Doctor';
    const hospital = b.hospital_name || 'Adityam Partner Hospital';
    const token = 10 + (idx % 20);
    const isCancelled = b.status === 'CANCELLED';

    // 1. CANCELLED -> Refund Notice
    if (isCancelled) {
      const id = `refund-${b.booking_ref || b.id}`;
      list.push({
        id,
        title: `100% Refund Processed • ₹${b.doctor_fee || 640}`,
        titleHi: `100% रिफंड जारी किया गया • ₹${b.doctor_fee || 640}`,
        body: `Refund for booking #${b.booking_ref} is credited back to your original payment source in 2–6 working days.`,
        bodyHi: `बुकिंग #${b.booking_ref} का रिफंड जारी कर दिया गया है। 2–6 कार्य दिवसों में मूल खाते में जमा होगा।`,
        type: 'REFUND',
        timestamp: b.created_at || new Date().toISOString(),
        isRead: readIds.includes(id),
        bookingRef: b.booking_ref,
        actionRoute: '/appointments',
      });
      return;
    }

    // 2. ACTIVE CONSULTATION
    if (b.status === 'PAID' || b.status === 'CONFIRMED') {
      // 2A. 1-Hour Urgent Reminder (if today and slot within 60 mins)
      if (isToday && isWithinOneHour(slot.slotTime)) {
        const id = `1hr-${b.booking_ref || b.id}`;
        list.push({
          id,
          title: `⏰ Consultation in 1 Hour with ${doctor}`,
          titleHi: `⏰ 1 घंटे में परामर्श: ${doctor}`,
          body: `Your OPD appointment at ${hospital} starts in less than 1 hour. Please reach 15 mins prior with previous records. Room 101.`,
          bodyHi: `${hospital} में आपका परामर्श 1 घंटे से कम में शुरू होगा। कृपया पुराने पर्चों के साथ 15 मिनट पूर्व पहुंचें।`,
          type: 'ONE_HOUR_REMINDER',
          timestamp: new Date().toISOString(),
          isRead: readIds.includes(id),
          bookingRef: b.booking_ref,
          doctorName: doctor,
          hospitalName: hospital,
          slotTime: slot.slotTime,
          actionRoute: '/appointments',
        });
      }

      // 2B. Today's Appointment Alert
      if (isToday) {
        const id = `today-${b.booking_ref || b.id}`;
        list.push({
          id,
          title: `Today's Appointment with ${doctor}`,
          titleHi: `आज आपका परामर्श है: ${doctor}`,
          body: `Slot at ${slot.slotTime} at ${hospital}. Token #${token}. Show digital pass at reception for priority entry.`,
          bodyHi: `${hospital} में आज ${slot.slotTime} बजे परामर्श। टोकन #${token}। रिसेप्शन पर डिजिटल पास दिखाएं।`,
          type: 'TODAY_APPOINTMENT',
          timestamp: b.created_at || new Date().toISOString(),
          isRead: readIds.includes(id),
          bookingRef: b.booking_ref,
          doctorName: doctor,
          hospitalName: hospital,
          slotTime: slot.slotTime,
          actionRoute: '/appointments',
        });
      }

      // 2C. Booking Confirmation
      const confId = `conf-${b.booking_ref || b.id}`;
      list.push({
        id: confId,
        title: `OPD Booking Confirmed • #${b.booking_ref}`,
        titleHi: `ओपीडी बुकिंग पुष्ट • #${b.booking_ref}`,
        body: `Fast-track appointment booked for ${doctor} at ${hospital} on ${slot.slotDate} (${slot.slotTime}).`,
        bodyHi: `${doctor} (${hospital}) हेतु ${slot.slotDateHi} (${slot.slotTime}) का डिजिटल पास जारी किया गया।`,
        type: 'CONFIRMATION',
        timestamp: b.created_at || new Date().toISOString(),
        isRead: readIds.includes(confId),
        bookingRef: b.booking_ref,
        doctorName: doctor,
        hospitalName: hospital,
        slotTime: slot.slotTime,
        actionRoute: '/appointments',
      });
    }
  });

  // Always include a welcome healthcare charter alert if no other alerts
  if (list.length === 0) {
    list.push({
      id: 'welcome-niramayaa-charter',
      title: 'Welcome to Adityam Niramayaa Jaipur',
      titleHi: 'आदित्यम निरामया जयपुर में आपका स्वागत है',
      body: 'Zero-wait OPD passes, verified top doctors, and cashless healthcare benefits are active across our Jaipur hospital network.',
      bodyHi: 'जयपुर के शीर्ष अस्पतालों में जीरो-वेट ओपीडी पास, सत्यापित विशेषज्ञ डॉक्टर और कैशलेस स्वास्थ्य सुविधाएं सक्रिय हैं।',
      type: 'SYSTEM',
      timestamp: new Date().toISOString(),
      isRead: readIds.includes('welcome-niramayaa-charter'),
    });
  }

  // Sort with 1-hour reminders first, then newest
  return list.sort((a, b) => {
    if (a.type === 'ONE_HOUR_REMINDER' && b.type !== 'ONE_HOUR_REMINDER') return -1;
    if (b.type === 'ONE_HOUR_REMINDER' && a.type !== 'ONE_HOUR_REMINDER') return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Mark a single notification or all as read
 */
export async function markNotificationsAsRead(ids: string[]): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(READ_NOTIFS_STORAGE_KEY);
    const existing: string[] = stored ? JSON.parse(stored) : [];
    const updated = Array.from(new Set([...existing, ...ids]));
    await AsyncStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[notificationService] Failed to save read state:', err);
  }
}

/**
 * Clear all read tracking
 */
export async function clearAllReadTracking(): Promise<void> {
  try {
    await AsyncStorage.removeItem(READ_NOTIFS_STORAGE_KEY);
  } catch { }
}

/**
 * Trigger Native Browser Desktop/Mobile Push Notification if permission granted
 */
export function triggerBrowserNotification(title: string, body: string): void {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('[notificationService] Web Notification error:', err);
      }
    }
  }
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

