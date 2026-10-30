import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MemberPickerSheet, SheetModal } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Avatar,
  EmptyState,
  ErrorState,
  IconBadge,
  ListRow,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { formatDateTR, startOfWeek, toISODate, todayISO, weekdayLong } from '@/lib/utils';
import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';
import type { PlannedTask } from '@/types/models';

interface DayEntry {
  date: Date;
  iso: string;
  dayIndex: number;
  tasks: PlannedTask[];
}

/** Bir görevin verilen güne düşüp düşmediğini tekrar kuralına göre belirler. */
function tasksForDay(tasks: PlannedTask[], date: Date, iso: string): PlannedTask[] {
  const dayIndex = date.getDay();
  const dayOfMonth = Number(iso.slice(8, 10));
  return tasks.filter((task) => {
    if (!task.isActive) return false;
    // Görev, başlangıç tarihinden önceki günlerde gösterilmez.
    if (iso < task.startDate) return false;
    switch (task.recurrence) {
      case 'daily':
        return true;
      case 'weekly':
        return task.weekdays.includes(dayIndex);
      case 'monthly':
        return Number(task.startDate.slice(8, 10)) === dayOfMonth;
      case 'none':
        return task.startDate === iso;
      default:
        return false;
    }
  });
}

/**
 * Takvim: bu haftanın 7 gününü (Pazartesi başlangıçlı) ve her güne düşen
 * planlı görevleri gösterir. Bir güne dokununca o günün görevleri pop-up'ta
 * açılır ve görev doğrudan puanlanabilir.
 */
export default function CalendarScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const actions = useActions();
  const isParent = useIsParent();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [pickerTask, setPickerTask] = useState<PlannedTask | null>(null);

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

  const today = todayISO();
  const weekStart = startOfWeek();
  const days: DayEntry[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const iso = toISODate(date);
    return {
      date,
      iso,
      dayIndex: date.getDay(),
      tasks: tasksForDay(data.plannedTasks, date, iso),
    };
  });

  const selectedDay = selectedIso ? (days.find((day) => day.iso === selectedIso) ?? null) : null;

  const awardTo = async (task: PlannedTask, memberId: string, dateIso: string) => {
    try {
      await actions.completePlannedTask(task.id, memberId, dateIso);
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

  const handleAwardPress = (task: PlannedTask, dateIso: string) => {
    const assigned = task.assignedMemberId
      ? (data.members.find((item) => item.id === task.assignedMemberId) ?? null)
      : null;
    if (assigned) {
      void awardTo(task, assigned.id, dateIso);
      return;
    }
    setPickerTask(task);
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('calendar.title')}
        subtitle={t('calendar.week')}
        onBack={() => goBack()}
      />

      {days.map((entry) => {
        const isToday = entry.iso === today;
        return (
          <Pressable
            key={entry.iso}
            onPress={() => setSelectedIso(entry.iso)}
            style={({ pressed }) => [
              styles.dayCard,
              isToday && styles.dayCardToday,
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, isToday && { color: colors.primaryDeep }]}>
                {weekdayLong(entry.dayIndex)}
              </Text>
              {isToday ? <Pill label={t('calendar.today')} tone="primary" /> : null}
            </View>

            <View style={styles.dayTop}>
              <Text style={styles.dayNumber}>{entry.date.getDate()}</Text>
              <Pill
                label={t('calendar.taskCount', { count: entry.tasks.length })}
                tone={entry.tasks.length > 0 ? 'gain' : 'default'}
                icon="🗓️"
              />
            </View>

            {entry.tasks.length === 0 ? (
              <Text style={styles.dayEmpty}>{t('calendar.noEvents')}</Text>
            ) : (
              entry.tasks.map((task) => {
                const penalty = task.kind === 'penalty';
                return (
                  <View key={task.id} style={styles.dayTaskRow}>
                    <Text style={styles.dayTaskIcon}>{task.icon}</Text>
                    <Text style={styles.dayTaskTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <Text style={[styles.dayTaskPoints, penalty && { color: colors.penaltyDeep }]}>
                      {penalty ? `−${task.points}` : `+${task.points}`}
                    </Text>
                  </View>
                );
              })
            )}
          </Pressable>
        );
      })}

      {isParent ? (
        <PrimaryButton
          label={t('calendar.addForDay')}
          icon="＋"
          onPress={() => router.push('/planned-tasks/new')}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      <SectionTitle title={t('planned.title')} />
      <ListRow
        icon="🗓️"
        title={t('planned.title')}
        subtitle={t('planned.add')}
        onPress={() => router.push('/planned-tasks')}
      />

      <SheetModal
        visible={!!selectedDay}
        onClose={() => setSelectedIso(null)}
        title={selectedDay ? formatDateTR(selectedDay.iso) : ''}
        subtitle={selectedDay ? weekdayLong(selectedDay.dayIndex) : undefined}
      >
        {selectedDay ? (
          selectedDay.tasks.length === 0 ? (
            <EmptyState icon="📭" title={t('calendar.noEvents')} />
          ) : (
            selectedDay.tasks.map((task) => {
              const assigned = task.assignedMemberId
                ? (data.members.find((item) => item.id === task.assignedMemberId) ?? null)
                : null;
              const penalty = task.kind === 'penalty';
              return (
                <View key={task.id} style={styles.sheetTask}>
                  <View style={styles.sheetTaskTop}>
                    <IconBadge icon={task.icon} tone={penalty ? 'penalty' : 'gain'} />
                    <View style={styles.sheetTaskText}>
                      <Text style={styles.sheetTaskTitle} numberOfLines={2}>
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
                        <Text style={[styles.metaText, penalty && { color: colors.penaltyDeep }]}>
                          {penalty ? `−${task.points}` : `+${task.points}`} {t('common.pt')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <PrimaryButton
                    label={t('planned.markDone')}
                    tone={penalty ? 'penalty' : 'gain'}
                    onPress={() => handleAwardPress(task, selectedDay.iso)}
                    style={{ marginTop: spacing.md, paddingVertical: 12 }}
                  />
                </View>
              );
            })
          )
        ) : null}
      </SheetModal>

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
          await awardTo(pickerTask, member.id, selectedIso ?? today);
        }}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayName: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  dayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dayNumber: {
    fontSize: fontSize.display,
    fontWeight: '900',
    color: colors.text,
  },
  dayEmpty: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  dayTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dayTaskIcon: {
    fontSize: 18,
  },
  dayTaskTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
  },
  dayTaskPoints: {
    fontSize: fontSize.body,
    fontWeight: '900',
    color: colors.gainDeep,
  },
  sheetTask: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTaskTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sheetTaskText: {
    flex: 1,
    gap: spacing.xs,
  },
  sheetTaskTitle: {
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
});
