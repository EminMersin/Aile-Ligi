import type { FamilyLookup } from '@/types/models';

/**
 * Kod sorgusu sonucu ekranlar arasında geçici olarak tutulur.
 * (Adres parametreleri yalnızca metin taşıyabildiği için kullanılır.)
 */
let current: { code: string; lookup: FamilyLookup } | null = null;

export const joinCache = {
  set(code: string, lookup: FamilyLookup) {
    current = { code, lookup };
  },
  get() {
    return current;
  },
  clear() {
    current = null;
  },
};
