import { tr, type TranslationKey } from './tr';

export type { TranslationKey };

/**
 * Basit çeviri fonksiyonu: t('tasks.awarded', { name: 'Yusuf', points: 20 })
 * Metinlerdeki {ad} yer tutucuları değiştirilir.
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  let value: string = tr[key];
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/** Metinler yalnızca Türkçe olduğu için kancaya gerek yok; ileride dil eklenirse buradan yönetilir. */
export const useTranslation = () => ({ t });
