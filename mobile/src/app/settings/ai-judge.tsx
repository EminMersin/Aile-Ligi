import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ChoiceRow, ToggleRow } from '@/components/forms';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Card,
  ErrorState,
  LoadingState,
  Pill,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { isDemoMode } from '@/data';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { AiJudgeStyle, FamilySettings } from '@/types/models';

/** AI Hakem açıklamaları: özellik pasif, metinler önceden gösterilir. */
const HOW_KEYS = [
  'settings.aiJudgeHow1',
  'settings.aiJudgeHow2',
  'settings.aiJudgeHow3',
  'settings.aiJudgeHow4',
] as const;

/** AI Hakem ve Karar: tamamen pasif ekran, seçimler yalnızca tercih olarak kaydedilir. */
export default function AiJudgeSettingsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  if (!isParent) return <Redirect href="/(tabs)" />;
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

  const { settings } = data.family;

  const saveSetting = async (patch: Partial<FamilySettings>) => {
    try {
      await actions.updateFamily({ settings: patch });
      toast(t('settings.aiJudgeSaved'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader title={t('settings.aiJudge')} subtitle={data.family.name} onBack={() => goBack()} />

      <Card tone="ai" style={styles.heroCard}>
        <Text style={styles.heroIcon}>🔨</Text>
        <Pill label={t('common.soon')} tone="ai" icon="⏳" />
        <Text style={styles.heroText}>{t('settings.aiJudgeInfo')}</Text>
      </Card>

      <SectionTitle title={t('settings.aiJudgeToggle')} />
      <Card>
        <ToggleRow
          label={t('settings.aiJudgeToggle')}
          description={t('settings.aiJudgeToggleDesc')}
          value={settings.aiJudgeEnabled}
          onChange={(value) => void saveSetting({ aiJudgeEnabled: value })}
        />
        <View style={styles.devNote}>
          <Text style={styles.devNoteIcon}>🚧</Text>
          <Text style={styles.devNoteText}>{t('settings.aiJudgeDevNote')}</Text>
        </View>
      </Card>

      <SectionTitle title={t('settings.aiJudgeStyle')} />
      <Card>
        <ChoiceRow<AiJudgeStyle>
          label={t('settings.aiJudgeStyle')}
          value={settings.aiJudgeStyle}
          onChange={(value) => void saveSetting({ aiJudgeStyle: value })}
          options={[
            { value: 'funny', label: t('settings.styleFunny') },
            { value: 'strict', label: t('settings.styleStrict') },
            { value: 'chaos', label: t('settings.styleChaos') },
          ]}
        />
      </Card>

      <SectionTitle title={t('settings.aiJudgeHowTitle')} />
      <Card>
        {HOW_KEYS.map((key, index) => (
          <View key={key} style={styles.howRow}>
            <View style={styles.howBullet}>
              <Text style={styles.howBulletText}>{index + 1}</Text>
            </View>
            <Text style={styles.howText}>{t(key)}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle title={t('settings.notifications')} />
      <Card>
        <ToggleRow
          label={t('settings.notifications')}
          description={t('settings.notificationsDesc')}
          value={false}
          onChange={() => undefined}
          disabled
          badge={t('common.soon')}
        />
      </Card>

      {isDemoMode ? <Text style={styles.demoNote}>{t('common.demoModeNote')}</Text> : null}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
  },
  heroIcon: {
    fontSize: 44,
  },
  heroText: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  devNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.aiSoft,
  },
  devNoteIcon: {
    fontSize: 16,
  },
  devNoteText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.aiDeep,
    fontWeight: '600',
    lineHeight: 18,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  howBullet: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.aiSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howBulletText: {
    fontSize: fontSize.caption,
    fontWeight: '900',
    color: colors.aiDeep,
  },
  howText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 21,
  },
  demoNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
