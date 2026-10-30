import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ComingSoonSheet } from '@/components/Sheet';
import { AppHeader, Card, ListRow, Pill, PrimaryButton, Screen, SectionTitle } from '@/components/ui';
import { t, type TranslationKey } from '@/i18n';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/** Plus faydaları: simge + i18n anahtarı. */
const FEATURES: { icon: string; label: TranslationKey }[] = [
  { icon: '📸', label: 'plus.feature1' },
  { icon: '🔗', label: 'plus.feature2' },
  { icon: '☁️', label: 'plus.feature3' },
  { icon: '🔄', label: 'plus.feature4' },
  { icon: '🔨', label: 'plus.feature5' },
  { icon: '♾️', label: 'plus.feature6' },
];

/** Plus paketleri: fiyat gösterilmez, yalnızca paket adları listelenir. */
const PLANS: { label: TranslationKey; bestValue?: boolean }[] = [
  { label: 'plus.monthly' },
  { label: 'plus.yearly', bestValue: true },
  { label: 'plus.family' },
];

/** Aile Ligi Plus tanıtımı — tamamen pasif, ödeme alınmaz. */
export default function PlusScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Screen>
      <AppHeader title={t('plus.title')} onBack={() => goBack()} />

      <Card tone="gold" style={styles.heroCard}>
        <Text style={styles.heroIcon}>⭐</Text>
        <Text style={styles.heroTitle}>{t('plus.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('plus.subtitle')}</Text>
        <Pill label={t('common.soon')} tone="gold" icon="⏳" />
      </Card>

      <SectionTitle title={t('plus.featuresTitle')} />
      {FEATURES.map((feature) => (
        <ListRow key={feature.label} icon={feature.icon} title={t(feature.label)} tone="plus" />
      ))}

      <SectionTitle title={t('plus.pricingTitle')} />
      <View style={styles.planRow}>
        {PLANS.map((plan) => (
          <Card key={plan.label} style={styles.planCard}>
            <Text style={styles.planName} numberOfLines={2}>
              {t(plan.label)}
            </Text>
            <Text style={styles.planPrice}>—</Text>
            <Text style={styles.planNote}>{t('plus.priceHidden')}</Text>
            <Pill label={t('common.soon')} tone="gold" />
            {plan.bestValue ? (
              <View style={styles.bestRow}>
                <Pill label={t('plus.bestValue')} tone="plus" icon="🏆" />
              </View>
            ) : null}
          </Card>
        ))}
      </View>

      <PrimaryButton
        label={t('plus.cta')}
        icon="⭐"
        tone="ai"
        onPress={() => setSheetOpen(true)}
        style={{ marginTop: spacing.xl }}
      />

      <Text style={styles.freeNote}>{t('plus.freeNote')}</Text>

      <ComingSoonSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('plus.soonTitle')}
        body={t('plus.soonBody')}
        icon="⭐"
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    marginTop: spacing.md,
  },
  heroIcon: {
    fontSize: 46,
  },
  heroTitle: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  planCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  planName: {
    fontSize: fontSize.label,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    minHeight: 34,
  },
  planPrice: {
    fontSize: fontSize.display,
    fontWeight: '900',
    color: colors.textMuted,
    lineHeight: 36,
  },
  planNote: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    minHeight: 26,
  },
  bestRow: {
    marginTop: spacing.xs,
  },
  freeNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
