const STORAGE_KEY = 'adityam_partner_open_menus_v1';

let memoryState: Record<string, boolean> | null = null;

export function getPartnerOpenMenus(): Record<string, boolean> {
  if (memoryState) return memoryState;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryState = parsed;
          return memoryState!;
        }
      }
    }
  } catch {
    // noop
  }
  memoryState = { orders: false, opd: false };
  return memoryState;
}

export function setPartnerOpenMenus(next: Record<string, boolean>): void {
  memoryState = next;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // noop
  }
}
