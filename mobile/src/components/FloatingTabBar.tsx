import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { fontSize, radius, shadow, spacing, TAB_BAR_HEIGHT, useColors, type ThemeColors } from '@/theme';

/**
 * Yüzen (floating) alt menü. Ortada büyük mavi "Görevler" düğmesi bulunur —
 * referans ekran görüntülerindeki görünüm.
 *
 * Not: react-navigation tipleri expo-router içinde paketli olduğu için
 * navigation alanı bilinçli olarak gevşek tiplenmiştir.
 */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: any;
  /** Belirli sekmeleri gizlemek için (ör. çocuklara "Aile Yöneticisi" gösterilmez). */
  hidden?: string[];
};

const TABS: Record<string, { label: string; icon: string; wide?: boolean }> = {
  index: { label: t('nav.home'), icon: '🏠' },
  weekly: { label: t('nav.weekly'), icon: '📅' },
  tasks: { label: t('nav.tasks'), icon: '✅', wide: true },
  admin: { label: t('nav.admin'), icon: '👑' },
  settings: { label: t('nav.settings'), icon: '⚙️' },
};

export function FloatingTabBar({ state, navigation, hidden = [] }: TabBarProps) {
  const styles = createStyles(useColors());
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.select({ ios: 18, default: 14 }) ?? 14);

  const visibleRoutes = state.routes.filter(
    (route) => TABS[route.name] && !hidden.includes(route.name),
  );

  return (
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {visibleRoutes.map((route) => {
          const index = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === index;
          const config = TABS[route.name];

          if (config.wide) {
            return (
              <Pressable
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={[styles.centerButton, focused && styles.centerButtonActive]}
                accessibilityRole="button"
                accessibilityLabel={config.label}
              >
                <Text style={styles.centerIcon}>{config.icon}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={config.label}
              accessibilityState={{ selected: focused }}
            >
              <Text style={[styles.itemIcon, !focused && styles.itemIconMuted]}>{config.icon}</Text>
              <Text style={[styles.itemLabel, focused && styles.itemLabelActive]} numberOfLines={1}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** İçeriğin alt menü altında kalmaması için ayrılacak boşluk. */
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + 34;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    height: TAB_BAR_HEIGHT,
    width: '100%',
    maxWidth: 520,
    ...shadow.bar,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemIconMuted: {
    opacity: 0.45,
  },
  itemLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  itemLabelActive: {
    color: colors.primary,
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow.raised,
  },
  centerButtonActive: {
    backgroundColor: colors.primaryDeep,
  },
  centerIcon: {
    fontSize: 24,
  },
});
