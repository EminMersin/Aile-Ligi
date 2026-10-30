import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ToggleRow } from '@/components/forms';
import { ConfirmSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { WEEKDAY_LONG } from '@/constants/config';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { formatDateTR, formatDateTimeTR } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { FamilySettings, WeeklySnapshot } from '@/types/models';

interface WeekGroup {
  weekStart: string;
  top: WeeklySnapshot[];
}

/** Haftalık sıfırlama: otomatik sıfırlama, gün/saat seçimi, manuel sıfırlama ve geçmiş haftalar. */
export default function WeeklyResetSettingsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      toast(t('settings.resetSettingsSaved'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  // Geçmiş haftalar: anlık görüntüleri haftaya göre gruplayıp her haftanın ilk 3 sırasını gösterir.
  const weeks: WeekGroup[] = [];
  for (const snapshot of data.snapshots) {
    const group = weeks.find((week) => week.weekStart === snapshot.weekStart);
    if (group) group.top.push(snapshot);
    else weeks.push({ weekStart: snapshot.weekStart, top: [snapshot] });
  }
  weeks.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  for (const week of weeks) week.top.sort((a, b) => a.rank - b.rank);

  const handleManualReset = async () => {
    setBusy(true);
    try {
      await actions.resetWeekly();
      toast(t('settings.resetDone'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('settings.weeklyReset')}
        subtitle={data.family.name}
        onBack={() => goBack()}
      />

      <Card tone="primary" style={styles.statusCard}>
        <Text style={styles.statusIcon}>{settings.weeklyResetEnabled ? '🔄' : '⏸️'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>
            {settings.weeklyResetEnabled ? t('settings.autoReset') : t('weekly.resetOff')}
          </Text>
          <Text style={styles.statusDesc}>
            {settings.weeklyResetEnabled
              ? t('weekly.resetInfo', {
                  day: WEEKDAY_LONG[settings.weeklyResetDay],
                  hour: settings.weeklyResetHour,
                })
              : t('settings.resetDayDesc')}
          </Text>
        </View>
      </Card>

      <SectionTitle title={t('settings.autoReset')} />
      <Card>
        <ToggleRow
          label={t('settings.autoReset')}
          description={t('settings.autoResetDesc')}
          value={settings.weeklyResetEnabled}
          onChange={(value) => void saveSetting({ weeklyResetEnabled: value })}
        />

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>{t('settings.resetDay')}</Text>
        <Text style={styles.fieldHint}>{t('settings.resetDayDesc')}</Text>
        <View style={styles.dayGrid}>
          {/* Türkiye'de hafta Pazartesi başlar; WEEKDAY_LONG dizisi Date.getDay()
              sırasıyla (0=Pazar) tutulduğu için burada sadece görünüm sırası
              Pazartesi'den başlayacak şekilde yeniden dizilir, değerler aynı kalır. */}
          {[1, 2, 3, 4, 5, 6, 0].map((index) => {
            const dayLabel = WEEKDAY_LONG[index];
            const active = settings.weeklyResetDay === index;
            return (
              <Pressable
                key={dayLabel}
                onPress={() => void saveSetting({ weeklyResetDay: index })}
                style={[styles.dayCell, active && styles.dayCellActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{dayLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>{t('settings.resetHour')}</Text>
        <Text style={styles.fieldHint}>
          {t('settings.resetHourHint', { hour: String(settings.weeklyResetHour).padStart(2, '0') })}
        </Text>
        <View style={styles.hourGrid}>
          {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => {
            const active = settings.weeklyResetHour === hour;
            return (
              <Pressable
                key={hour}
                onPress={() => void saveSetting({ weeklyResetHour: hour })}
                style={[styles.hourCell, active && styles.dayCellActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>
                  {String(hour).padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionTitle title={t('settings.manualReset')} />
      <Card tone="penalty">
        <View style={styles.manualRow}>
          <Text style={styles.manualIcon}>♻️</Text>
          <Text style={styles.manualDesc}>{t('settings.manualResetDesc')}</Text>
        </View>
        <PrimaryButton
          label={t('settings.manualReset')}
          tone="penalty"
          icon="🔄"
          loading={busy}
          onPress={() => setConfirmOpen(true)}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Card style={styles.lastResetCard}>
        <Text style={styles.fieldLabel}>{t('settings.lastReset')}</Text>
        <Text style={styles.lastResetValue}>
          {data.family.lastResetAt ? formatDateTimeTR(data.family.lastResetAt) : t('settings.lastResetNone')}
        </Text>
      </Card>

      <SectionTitle title={t('settings.pastWeeks')} />
      {weeks.length === 0 ? (
        <EmptyState icon="🗓️" title={t('settings.pastWeeks')} description={t('settings.pastWeeksEmpty')} />
      ) : (
        weeks.map((week) => (
          <Card key={week.weekStart} style={styles.weekCard}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekTitle}>
                {t('settings.weekOf', { date: formatDateTR(week.weekStart) })}
              </Text>
              {week.top[0]?.rank === 1 ? (
                <Pill label={t('weekly.champion')} tone="gold" icon="🏆" />
              ) : null}
            </View>
            {week.top.slice(0, 3).map((snapshot) => (
              <View key={snapshot.memberId} style={styles.weekRow}>
                <Text style={styles.weekRank}>
                  {snapshot.rank === 1 ? '🥇' : snapshot.rank === 2 ? '🥈' : '🥉'}
                </Text>
                <Text style={styles.weekName} numberOfLines={1}>
                  {snapshot.memberName}
                </Text>
                <Text style={styles.weekPoints}>{snapshot.points}</Text>
              </View>
            ))}
          </Card>
        ))
      )}

      <ConfirmSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('settings.manualReset')}
        description={t('settings.manualResetConfirm')}
        confirmLabel={t('settings.manualReset')}
        tone="penalty"
        onConfirm={handleManualReset}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statusIcon: {
    fontSize: 30,
  },
  statusTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  statusDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayCell: {
    width: '48.5%',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hourCell: {
    width: '15%',
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayText: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.textOnDark,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  manualIcon: {
    fontSize: 26,
  },
  manualDesc: {
    flex: 1,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  lastResetCard: {
    marginTop: spacing.md,
  },
  lastResetValue: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  weekCard: {
    marginBottom: spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  weekTitle: {
    flex: 1,
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  weekRank: {
    fontSize: 18,
    width: 26,
  },
  weekName: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  weekPoints: {
    fontSize: fontSize.body,
    fontWeight: '900',
    color: colors.goldDeep,
  },
});
