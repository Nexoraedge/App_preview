import { translateSpecialty } from './hindiDictionary';

/**
 * Free English -> Hindi translation/transliteration helper.
 * Runs once at Admin verification/approval time (never per patient screen load).
 * Layer 1: Local medical dictionary for known specialties.
 * Layer 2: Free Google Translate gtx endpoint (no API key).
 * Layer 3: Free MyMemory endpoint fallback.
 */
export async function translateEnToHi(text: string): Promise<string> {
  const clean = (text || '').trim();
  if (!clean) return '';

  // Skip if already contains Devanagari characters
  if (/[\u0900-\u097F]/.test(clean)) return clean;

  // Check local medical specialty dictionary first
  const localSpec = translateSpecialty(clean, true);
  if (localSpec && localSpec !== clean) {
    return localSpec;
  }

  // Layer 2: Free Google Translate gtx endpoint
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(clean)}`
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.[0])) {
        const joined = json[0].map((part: any) => (Array.isArray(part) ? part[0] : '')).join('').trim();
        if (joined) return joined;
      }
    }
  } catch {
    // fall through to MyMemory
  }

  // Layer 3: Free MyMemory fallback
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|hi`
    );
    if (res.ok) {
      const json = await res.json();
      const translated = String(json?.responseData?.translatedText || '').trim();
      if (translated && translated.toLowerCase() !== clean.toLowerCase()) {
        return translated;
      }
    }
  } catch {
    // ignore offline errors
  }

  return clean;
}
