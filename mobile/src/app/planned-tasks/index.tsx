import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet, MemberPickerSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  IconBadge,
  LoadingState,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { todayISO, weekdayShort } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { PlannedTask } from '@/types/models';

/** Tekrar biçimini okunur metne çevirir. */
function repeatLabel(task: PlannedTask): string {
  switch (task.recurrence) {
    case 'daily':
      return t('planned.repeatDaily');
    case 'weekly':
      return t('planned.repeatWeekly');
    case 'monthly':
      return t('planned.repeatMonthly');
    default:
      return t('planned.repeatNone');
  }
}

/**
 * "Görevleri planla" ekranı: yöneticinin hazırladığı planlı görevleri listeler.
 * Her satırda "Puan ver" butonu vardır; görev belirli bir üyeye atanmışsa doğrudan
 * o üyeye verilir, atanmamışsa kişi seçilir. Satıra uzun basınca görev silinir.
 */
export default function PlannedTasksScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const actions = useActions();
  const isParent = useIsParent();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  const [pickerTask, setPickerTask] = useState<PlannedTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlannedTask | null>(null);

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

  const plannedTasks = data.plannedTasks;

  /** Puanı (ya da cezayı) seçilen üyeye uygular. */
  const awardTo = async (task: PlannedTask, memberId: string) => {
    try {
      await actions.completePlannedTask(task.id, memberId, todayISO());
      const member = data.members.find((item) => item.id === memberId);
      toast(
        task.kind === 'penalty'
          ? t('penalties.approvedToast', { name: member?.name ?? '', points: task.points })
          : t('tasks.awarded', { name: member?.name ?? '', points: task.points }),
        'success',
      );
      setPickerTask(null);
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  const handleAwardPress = (task: PlannedTask) => {
    const assigned = task.assignedMemberId
      ? (data.members.find((item) => item.id === task.assignedMemberId) ?? null)
      : null;
    if (assigned) {
      void awardTo(task, assigned.id);
      return;
    }
    setPickerTask(task);
  };

  const handleDelete = async () => {
    try {
      await actions.deletePlannedTask(deleteTarget?.id ?? '');
      toast(t('planned.deleted'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('planned.title')}
        subtitle={t('planned.count', { count: plannedTasks.length })}
        onBack={() => goBack()}
        right={
          <Pressable style={styles.addButton} onPress={() => router.push('/planned-tasks/new')}>
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        }
      />

      {plannedTasks.length === 0 ? (
        <EmptyState icon="🗓️" title={t('planned.empty')} description={t('planned.add')} />
      ) : (
        plannedTasks.map((task) => {
          const assigned = task.assignedMemberId
            ? (data.members.find((item) => item.id === task.assignedMemberId) ?? null)
            : null;
          const penalty = task.kind === 'penalty';
          return (
            <Card key={task.id} style={styles.taskCard}>
              <Pressable
                onLongPress={() => setDeleteTarget(task)}
                delayLongPress={350}
                style={styles.cardTop}
              >
                <IconBadge icon={task.icon} tone={penalty ? 'penalty' : 'gain'} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {assigned ? (
                      <>
                        <Avatar
                          emoji={assigned.avatar}
                          size={22}
                          tone={assigned.role === 'parent' ? 'gold' : 'primary'}
                        />
                        <Text style={styles.metaText}>{assigned.name}</Text>
                      </>
                    ) : (
                      <Text style={styles.metaText}>{t('planned.unassigned')}</Text>
                    )}
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>{repeatLabel(task)}</Text>
                    {task.recurrence === 'weekly' && task.weekdays.length > 0 ? (
                      <Text style={styles.metaText}>
                        {task.weekdays.map((day) => weekdayShort(day)).join(', ')}
                      </Text>
                    ) : null}
                    {task.dueTime ? <Text style={styles.metaText}>{`⏰ ${task.dueTime}`}</Text> : null}
                  </View>
                </View>
                <Text style={[styles.points, penalty && { color: colors.penaltyDeep }]}>
                  {penalty ? `−${task.points}` : `+${task.points}`}
                </Text>
              </Pressable>

              <PrimaryButton
                label={t('planned.markDone')}
                tone={penalty ? 'penalty' : 'gain'}
                onPress={() => handleAwardPress(task)}
                style={styles.awardButton}
              />
            </Card>
          );
        })
      )}

      <Text style={styles.hint}>{t('planned.longPressHint')}</Text>

      <MemberPickerSheet
        visible={!!pickerTask}
        onClose={() => setPickerTask(null)}
        title={t('planned.whoTitle')}
        subtitle={`${pickerTask?.icon ?? ''} ${pickerTask?.title ?? ''} · ${pickerTask?.points ?? 0} ${t(
          'common.pt',
        )}`}
        members={data.members}
        confirmLabel={t('tasks.awardBtn')}
        tone={pickerTask?.kind === 'penalty' ? 'penalty' : 'gain'}
        onConfirm={async (member) => {
          if (!pickerTask) return;
          await awardTo(pickerTask, member.id);
        }}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        description={t('planned.deleteConfirm', { name: deleteTarget?.title ?? '' })}
        confirmLabel={t('common.delete')}
        tone="penalty"
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.textOnDark,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  taskCard: {
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  points: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.gainDeep,
  },
  awardButton: {
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
