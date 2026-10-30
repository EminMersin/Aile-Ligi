import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { AppHeader, Card, ErrorState, LoadingState, Pill, PrimaryButton, Screen } from '@/components/ui';
import { repository } from '@/data';
import { useFamilyState } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/** Aile kodu ekranı: kayıt sonrası gösterilir ve Ayarlar'dan tekrar açılabilir. */
export default function FamilyCodeScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useFamilyState();
  const [busy, setBusy] = useState(false);

  if (isError) {
    return (
      <ErrorState
        message={messageForError(error)}
        retryLabel={t('auth.signOut')}
        onRetry={() => repository.signOut().finally(() => refetch())}
      />
    );
  }

  if (isLoading || !data) {
    return <LoadingState label={t('common.loading')} />;
  }

  const { code, name } = data.family;
  const digits = code.split('');

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    toast(t('common.copied'), 'success');
  };

  return (
    <Screen>
      <AppHeader title={t('family.codeTitle')} subtitle={name} onBack={() => goBack()} />

      <Card tone="primary" style={styles.codeCard}>
        <Text style={styles.heading}>{t('auth.familyCreated')}</Text>
        <View style={styles.codeRow}>
          {digits.map((digit, index) => (
            <View key={index} style={styles.codeBox}>
              <Text style={styles.codeDigit}>{digit}</Text>
            </View>
          ))}
        </View>
        <Pill label={t('auth.yourFamilyCode')} tone="primary" icon="🔑" />
        <Text style={styles.hint}>{t('auth.codeShareHint')}</Text>
      </Card>

      <PrimaryButton label={t('common.copy')} onPress={handleCopy} tone="muted" icon="📋" />
      <PrimaryButton
        label={t('auth.continueBtn')}
        onPress={() => {
          setBusy(true);
          router.replace('/(tabs)');
        }}
        loading={busy}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  codeCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeBox: {
    width: 46,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.primaryDeep,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
