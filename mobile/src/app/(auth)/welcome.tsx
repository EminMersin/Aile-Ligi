import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Pill, Screen } from '@/components/ui';
import { isDemoMode } from '@/data';
import { t } from '@/i18n';
import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';

/** Açılış ekranı: Aile Yöneticisi Girişi / Aile Üyesi Girişi. */
export default function WelcomeScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logo}>🏆</Text>
        </View>
        <Text style={styles.title}>{t('auth.appName')}</Text>
        <Text style={styles.tagline}>{t('auth.tagline')}</Text>
      </View>

      <Text style={styles.question}>{t('auth.welcomeTitle')}</Text>

      <Card onPress={() => router.push('/(auth)/parent-sign-in')} style={styles.entryCard}>
        <View style={styles.entryRow}>
          <View style={[styles.entryIcon, { backgroundColor: colors.goldSoft }]}>
            <Text style={styles.entryEmoji}>👑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.entryTitle}>{t('auth.parentEntry')}</Text>
            <Text style={styles.entryDesc}>{t('auth.parentEntryDesc')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Card>

      <Card onPress={() => router.push('/(auth)/member-code')} style={styles.entryCard}>
        <View style={styles.entryRow}>
          <View style={[styles.entryIcon, { backgroundColor: colors.primarySoft }]}>
            <Text style={styles.entryEmoji}>👨‍👩‍👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.entryTitle}>{t('auth.memberEntry')}</Text>
            <Text style={styles.entryDesc}>{t('auth.memberEntryDesc')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Card>

      {isDemoMode ? (
        <View style={styles.demoBox}>
          <Pill label={t('common.demoMode')} tone="gold" icon="🧪" />
          <Text style={styles.demoText}>{t('common.demoModeNote')}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.raised,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: '900',
    color: colors.text,
  },
  tagline: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  question: {
    fontSize: fontSize.label,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  entryCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  entryIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryEmoji: {
    fontSize: 26,
  },
  entryTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  entryDesc: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  demoBox: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  demoText: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
