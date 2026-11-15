import { Platform, Vibration } from 'react-native';

/**
 * Plays a crisp 2-tone notification chime on web using Web Audio API
 * (zero external audio asset dependency) and triggers Vibration on mobile.
 * Also displays a browser Notification when permission is granted.
 */
export function playAdminAlertChime(
  title = 'New Booking Alert',
  body = 'A new patient request just arrived in Adityam Command Center.'
) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const playTone = (freq: number, startOffset: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0.001, now + startOffset);
          gain.gain.exponentialRampToValueAtTime(0.22, now + startOffset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + duration);
        };

        playTone(880, 0, 0.24);
        playTone(1174.66, 0.16, 0.35);

        setTimeout(() => {
          ctx.close().catch(() => {});
        }, 700);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } else {
      Vibration.vibrate([0, 250, 120, 250]);
    }
  } catch {
    // Ignore audio context autoplay restrictions before first user gesture
  }
}

export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}
