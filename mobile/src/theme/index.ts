import { Platform, type ViewStyle } from 'react-native';

export { lightColors, darkColors, type ThemeColors, type ThemeMode } from './palettes';
export { ThemeProvider, useColors, useTheme } from './ThemeProvider';

/**
 * NOT: Sabit "colors" nesnesi karanlık mod desteğiyle birlikte kaldırıldı.
 * Ekranlarda renk için `useColors()` hook'unu kullanın (bkz. ThemeProvider.tsx).
 * Referans ekran görüntülerindeki görünüm: yumuşak gri zemin, beyaz yuvarlak kartlar,
 * yeşil = puan kazanç, kırmızı = ceza, mor = AI Hakem, altın = şampiyon.
 */

/** Köşe yuvarlaklıkları — kartlar belirgin şekilde yuvarlak. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const fontSize = {
  display: 32,
  title: 24,
  section: 20,
  cardTitle: 17,
  body: 15,
  label: 13,
  caption: 12,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  } satisfies ViewStyle,
  raised: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  } satisfies ViewStyle,
  bar: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  } satisfies ViewStyle,
} as const;

/** Ekranların altına bırakılacak boşluk (yüzen sekme çubuğu içeriği kapatmasın). */
export const TAB_BAR_HEIGHT = 66;
export const TAB_BAR_BOTTOM = Platform.select({ ios: 18, default: 14 }) ?? 14;
export const CONTENT_BOTTOM_INSET = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + spacing.lg;

/** Web'de içeriğin aşırı genişlemesini engeller (telefon benzeri görünüm). */
export const MAX_CONTENT_WIDTH = 560;
