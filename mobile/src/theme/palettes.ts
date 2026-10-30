/**
 * Aile Ligi açık/koyu renk paletleri.
 * Her iki palet de birebir aynı anahtarlara sahip olmalı — yeni bir renk
 * eklerken hem lightColors hem darkColors içine eklemeyi unutmayın.
 */
export const lightColors = {
  bg: '#F2F3F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border: '#E9ECF2',

  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnDark: '#FFFFFF',

  primary: '#3B82F6',
  primaryDeep: '#2563EB',
  primarySoft: '#E8EFFF',

  gain: '#22C55E',
  gainDeep: '#16A34A',
  gainSoft: '#DCFCE7',

  penalty: '#EF4444',
  penaltyDeep: '#DC2626',
  penaltySoft: '#FEE2E2',

  ai: '#A21CE8',
  aiDeep: '#7E14B8',
  aiSoft: '#F5E6FF',

  gold: '#F5B301',
  goldDeep: '#D99A00',
  goldSoft: '#FEF3C7',
  championFrom: '#FFF6D0',
  championTo: '#FFE39B',

  pink: '#EC4899',
  pinkSoft: '#FBE7F3',

  mint: '#34D399',
  mintSoft: '#E3F9EE',

  plus: '#F59E0B',
  plusSoft: '#FEF3C7',

  overlay: 'rgba(17, 24, 39, 0.45)',
} as const;

export const darkColors: Record<keyof typeof lightColors, string> = {
  bg: '#0B0F17',
  surface: '#161B26',
  surfaceAlt: '#1E2430',
  border: '#2A3140',

  text: '#F3F4F6',
  textSecondary: '#A6ADBB',
  textMuted: '#767E8C',
  textOnDark: '#FFFFFF',

  primary: '#5B9BFF',
  primaryDeep: '#7CB0FF',
  primarySoft: '#1D2A44',

  gain: '#34D07C',
  gainDeep: '#4ADE80',
  gainSoft: '#12321F',

  penalty: '#F87171',
  penaltyDeep: '#FCA5A5',
  penaltySoft: '#3A1618',

  ai: '#C77DF3',
  aiDeep: '#D8A2F7',
  aiSoft: '#2C1640',

  gold: '#F7C948',
  goldDeep: '#FFD873',
  goldSoft: '#3A2E0E',
  championFrom: '#3A2E0E',
  championTo: '#4E3D12',

  pink: '#F472B6',
  pinkSoft: '#3A1E2C',

  mint: '#4FE3B0',
  mintSoft: '#123329',

  plus: '#FBBF24',
  plusSoft: '#3A2E0E',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ThemeColors = Record<keyof typeof lightColors, string>;
export type ThemeMode = 'system' | 'light' | 'dark';
