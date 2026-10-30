import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChoiceRow, EmojiPicker, Field, Stepper, ToggleRow, WeekdayPicker } from '@/components/forms';
import { ConfirmSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { AppHeader, Avatar, ErrorState, LoadingState, PrimaryButton, Screen } from '@/components/ui';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { todayISO } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { Member, PlannedTask, Recurrence, TaskKind } from '@/types/models';

/**
 * Planlı görev ekleme / düzenleme formu.
 * `id` parametresi verilirse mevcut görev düzenlenir.
 */
export default function PlannedTaskFormScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const isParent = useIsParent();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();
  const params = useLocalSearchParams();
  const plannedTaskId = typeof params.id === 'string' ? params.id : undefined;

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

  const existing = plannedTaskId
    ? (data.plannedTasks.find((task) => task.id === plannedTaskId) ?? null)
    : null;

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={existing ? t('planned.editTitle') : t('planned.newTitle')}
        subtitle={data.family.name}
        onBack={() => goBack()}
      />
      <PlannedTaskForm
        key={plannedTaskId ?? 'new'}
        initial={existing}
        members={data.members}
        onDone={() => goBack()}
      />
    </Screen>
  );
}

/** Üye seçici: "Herkes" ya da aileden bir kişi seçilir. */
function MemberSelector({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: string | null;
  onChange: (memberId: string | null) => void;
}) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{t('planned.assignedTo')}</Text>
      <View style={styles.memberList}>
        <Pressable
          onPress={() => onChange(null)}
          style={[styles.memberChip, value === null && styles.memberChipActive]}
        >
          <Avatar emoji="👨‍👩‍👧‍👦" size={40} tone="primary" />
          <Text style={[styles.memberChipText, value === null && styles.memberChipTextActive]} numberOfLines={1}>
            {t('planned.unassigned')}
          </Text>
        </Pressable>
        {members.map((member) => {
          const active = member.id === value;
          return (
            <Pressable
              key={member.id}
              onPress={() => onChange(member.id)}
              style={[styles.memberChip, active && styles.memberChipActive]}
            >
              <Avatar
                emoji={member.avatar}
                size={40}
                tone={member.role === 'parent' ? 'gold' : 'primary'}
              />
              <Text style={[styles.memberChipText, active && styles.memberChipTextActive]} numberOfLines={1}>
                {member.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Form alanları ve kaydetme / silme işlemleri. */
function PlannedTaskForm({
  initial,
  members,
  onDone,
}: {
  initial: PlannedTask | null;
  members: Member[];
  onDone: () => void;
}) {
  const styles = createStyles(useColors());
  const toast = useToast();
  const actions = useActions();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [points, setPoints] = useState(initial?.points ?? 20);
  const [icon, setIcon] = useState(initial?.icon ?? '🧹');
  const [kind, setKind] = useState<TaskKind>(initial?.kind ?? 'gain');
  const [assignedMemberId, setAssignedMemberId] = useState<string | null>(
    initial?.assignedMemberId ?? null,
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence ?? 'none');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? '');
  const [requiresApproval, setRequiresApproval] = useState(initial?.requiresApproval ?? false);
  const [notify, setNotify] = useState(initial?.notify ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSave = async () => {
    if (title.trim().length < 2) {
      setError(t('common.required'));
      return;
    }
    if (points <= 0) {
      setError(t('error.positiveRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await actions.savePlannedTask({
        id: initial?.id,
        title: title.trim(),
        points,
        kind,
        icon,
        assignedMemberId,
        recurrence,
        weekdays: recurrence === 'weekly' ? weekdays : [],
        dueTime: dueTime.trim() || null,
        startDate: initial?.startDate ?? todayISO(),
        requiresApproval,
        notify,
      });
      toast(t('planned.saved'), 'success');
      onDone();
    } catch (e) {
      setError(messageForError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    try {
      await actions.deletePlannedTask(initial?.id ?? '');
      toast(t('planned.deleted'), 'success');
      onDone();
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  return (
    <>
      <Field
        label={t('planned.name')}
        value={title}
        onChangeText={setTitle}
        autoCapitalize="sentences"
      />
      <Stepper label={t('planned.points')} value={points} onChange={setPoints} step={5} min={5} max={99999} />
      <EmojiPicker label={t('tasks.taskIcon')} value={icon} onChange={setIcon} />
      <ChoiceRow
        label={t('tasks.taskKind')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'gain', label: t('tasks.gain') },
          { value: 'penalty', label: t('tasks.penalty') },
        ]}
      />

      <MemberSelector members={members} value={assignedMemberId} onChange={setAssignedMemberId} />

      <ChoiceRow
        label={t('planned.repeat')}
        value={recurrence}
        onChange={setRecurrence}
        options={[
          { value: 'none', label: t('planned.repeatNone') },
          { value: 'daily', label: t('planned.repeatDaily') },
          { value: 'weekly', label: t('planned.repeatWeekly') },
          { value: 'monthly', label: t('planned.repeatMonthly') },
        ]}
      />

      {recurrence === 'weekly' ? (
        <WeekdayPicker label={t('planned.weekdays')} value={weekdays} onChange={setWeekdays} />
      ) : null}

      <Field
        label={t('planned.dueTime')}
        value={dueTime}
        onChangeText={setDueTime}
        placeholder={t('planned.dueTimePlaceholder')}
        keyboardType="default"
        maxLength={5}
        hint={t('common.optional')}
      />

      <ToggleRow label={t('planned.requiresApproval')} value={requiresApproval} onChange={setRequiresApproval} />
      <ToggleRow label={t('planned.notify')} value={notify} onChange={setNotify} />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <PrimaryButton label={t('common.save')} onPress={handleSave} loading={busy} icon="💾" />

      {initial ? (
        <PrimaryButton
          label={t('common.delete')}
          tone="penalty"
          onPress={() => setDeleteOpen(true)}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}

      <ConfirmSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('common.delete')}
        description={t('planned.deleteConfirm', { name: initial?.title ?? title })}
        confirmLabel={t('common.delete')}
        tone="penalty"
        onConfirm={handleDelete}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  fieldWrapper: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  memberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  memberChip: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 76,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  memberChipText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  memberChipTextActive: {
    color: colors.primaryDeep,
  },
  formError: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
