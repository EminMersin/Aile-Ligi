import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Card,
  ErrorState,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/**
 * Aile kodu ekranı: 6 haneli kodu büyük kutularda gösterir.
 * Herkes kodu kopyalayabilir; kodu yalnızca yönetici yenileyebilir.
 */
export default function FamilyCodeScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();
  const [rotateSheet, setRotateSheet] = useState(false);

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (isError || !data) {
    return (
      <ErrorState
        message={t('error.generic')}
        retryLabel={t('common.retry')}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const { code, name } = data.family;
  const digits = code.split('');
  const linkedCount = data.members.filter((member) => member.isLinked).length;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      toast(t('common.copied'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  const handleRotate = async () => {
    try {
      const newCode = await actions.rotateCode();
      toast(`${t('family.rotated')}: ${newCode}`, 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader title={t('family.codeTitle')} subtitle={name} onBack={() => goBack()} />

      <Card tone="primary" style={styles.codeCard}>
        <View style={styles.codeRow}>
          {digits.map((digit, index) => (
            <View key={index} style={styles.codeBox}>
              <Text style={styles.codeDigit}>{digit}</Text>
            </View>
          ))}
        </View>
        <Pill label={t('auth.yourFamilyCode')} tone="primary" icon="🔑" />
        <Text style={styles.hint}>{t('family.codeDesc')}</Text>
      </Card>

      <Card style={styles.statsCard}>
        <Text style={styles.statsLabel}>{t('family.linked')}</Text>
        <Text style={styles.statsValue}>
          {linkedCount} / {data.members.length}
        </Text>
      </Card>

      <PrimaryButton
        label={t('common.copy')}
        onPress={handleCopy}
        tone="muted"
        icon="📋"
        style={{ marginTop: spacing.md }}
      />
      {isParent ? (
        <PrimaryButton
          label={t('family.rotate')}
          onPress={() => setRotateSheet(true)}
          icon="🔄"
          style={{ marginTop: spacing.sm }}
        />
      ) : null}

      <ConfirmSheet
        visible={rotateSheet}
        onClose={() => setRotateSheet(false)}
        title={t('family.rotate')}
        description={t('family.rotateConfirm')}
        confirmLabel={t('family.rotate')}
        tone="primary"
        onConfirm={handleRotate}
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
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  statsLabel: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  statsValue: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.primaryDeep,
  },
});
