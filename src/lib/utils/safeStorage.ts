/**
 * localStorage wrapper with an in-memory/window fallback (ported from the
 * legacy `safeStorage` helper so private-mode storage failures degrade softly).
 */
const memoryStore = new Map<string, string>();

function canUseLocalStorage(): boolean {
  try {
    const probe = '__baeeyen_storage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && canUseLocalStorage()) {
        return window.localStorage.getItem(key);
      }
    } catch {
      /* fall through to memory */
    }
    return memoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && canUseLocalStorage()) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      /* fall through to memory */
    }
    memoryStore.set(key, value);
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && canUseLocalStorage()) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      /* fall through to memory */
    }
    memoryStore.delete(key);
  },
};
