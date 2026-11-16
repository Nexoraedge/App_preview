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

/**
 * Louder 2-cycle urgent order alarm for Pharmacy / Partner desks.
 * Also displays a sticky browser Notification when permission is granted.
 */
export function playPartnerOrderAlarm(
  title = 'New Medicine Order!',
  body = 'A patient just sent a prescription to your pharmacy.'
) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const playPulse = (freq: number, startOffset: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0.001, now + startOffset);
          gain.gain.exponentialRampToValueAtTime(0.32, now + startOffset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + duration);
        };

        // Cycle 1
        playPulse(880, 0.0, 0.22);
        playPulse(1174.66, 0.18, 0.22);
        playPulse(1318.51, 0.36, 0.32);
        // Cycle 2
        playPulse(880, 0.78, 0.22);
        playPulse(1174.66, 0.96, 0.22);
        playPulse(1318.51, 1.14, 0.38);

        setTimeout(() => {
          ctx.close().catch(() => {});
        }, 1700);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, requireInteraction: true });
      }
    } else {
      Vibration.vibrate([0, 350, 150, 350, 150, 350]);
    }
  } catch {
    // Ignore audio context restrictions before user interaction
  }
}

/**
 * Plays a pleasant ascending 4-note chime when the pharmacy sends an itemized bill
 * to the patient app, plus browser Notification / mobile Vibration.
 */
export function playPatientBillChime(
  title = 'Medicine Bill Ready!',
  body = 'Your pharmacy has sent your itemized bill. Tap to review and pay.'
) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const playNote = (freq: number, startOffset: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + startOffset);
          gain.gain.setValueAtTime(0.001, now + startOffset);
          gain.gain.exponentialRampToValueAtTime(0.24, now + startOffset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + startOffset);
          osc.stop(now + startOffset + duration);
        };

        // Pleasant C-major ascending chime (C5 -> E5 -> G5 -> C6)
        playNote(523.25, 0, 0.22);
        playNote(659.25, 0.14, 0.22);
        playNote(783.99, 0.28, 0.24);
        playNote(1046.5, 0.42, 0.45);

        setTimeout(() => {
          ctx.close().catch(() => {});
        }, 1100);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } else {
      Vibration.vibrate([0, 180, 90, 240]);
    }
  } catch {
    // Ignore audio context restrictions before user interaction
  }
}
