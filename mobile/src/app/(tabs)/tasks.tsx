import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmojiPicker, Field, Stepper } from '@/components/forms';
import { ConfirmSheet, InfoSheet, MemberPickerSheet, SheetModal } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  SegmentedTabs,
} from '@/components/ui';
import { useActions, useCurrentMember, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { CatalogTask, TaskKind } from '@/types/models';

type SheetState =
  | { mode: 'closed' }
  | { mode: 'new' }
  | { mode: 'edit'; task: CatalogTask };

/** Görevler: "Puan kazan" ve "Cezalar" listeleri + aile ferdi seçme pop-up'ı. */
export default function TasksScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const actions = useActions();
  const isParent = useIsParent();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const me = useCurrentMember(data);
  const refresh = useRefresh();

  const [kind, setKind] = useState<TaskKind>('gain');
  const [pickerTask, setPickerTask] = useState<CatalogTask | null>(null);
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<CatalogTask | null>(null);
  const [penaltyInfo, setPenaltyInfo] = useState(false);
  const [taskPendingInfo, setTaskPendingInfo] = useState(false);

  const tasks = useMemo(
    () => (data?.tasks ?? []).filter((task) => task.kind === kind && task.isActive),
    [data, kind],
  );

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

  const handleAssign = async (memberId: string) => {
    if (!pickerTask) return;
    const task = pickerTask;
    if (task.kind === 'gain') {
      const result = await actions.completeTask(task.id, memberId);
      setPickerTask(null);
      if (result.pending) {
        setTaskPendingInfo(true);
        return;
      }
      const member = data.members.find((m) => m.id === memberId);
      toast(t('tasks.awarded', { name: member?.name ?? '', points: task.points }), 'success');
      return;
    }
    await actions.requestPenalty(task.id, memberId);
    setPickerTask(null);
    setPenaltyInfo(true);
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('tasks.title')}
        subtitle={`${data.members.length} ${t('family.members').toLowerCase()}`}
        right={
          isParent ? (
            <Pressable style={styles.addButton} onPress={() => setSheet({ mode: 'new' })}>
              <Text style={styles.addButtonText}>＋</Text>
            </Pressable>
          ) : null
        }
      />

      <SegmentedTabs
        value={kind}
        onChange={setKind}
        tabs={[
          { value: 'gain', label: t('tasks.gain'), icon: '💰', tone: 'gain' },
          { value: 'penalty', label: t('tasks.penalty'), icon: '⚠️', tone: 'penalty' },
        ]}
      />

      {tasks.length === 0 ? (
        <EmptyState icon="📝" title={t('tasks.empty')} />
      ) : (
        <View style={styles.grid}>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => setPickerTask(task)}
              onLongPress={() => {
                if (isParent) setSheet({ mode: 'edit', task });
              }}
              style={({ pressed }) => [
                styles.taskCard,
                kind === 'penalty' && styles.taskCardPenalty,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.taskIcon}>{task.icon}</Text>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {task.title}
              </Text>
              <Text style={[styles.taskPoints, kind === 'penalty' && { color: colors.penaltyDeep }]}>
                {kind === 'gain' ? `+${task.points}` : `−${task.points}`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isParent ? <Text style={styles.hint}>{t('tasks.longPressHint')}</Text> : null}

      <MemberPickerSheet
        visible={!!pickerTask}
        onClose={() => setPickerTask(null)}
        title={pickerTask?.kind === 'penalty' ? t('tasks.assignPenaltyTitle') : t('tasks.assignTitle')}
        subtitle={`${pickerTask?.icon ?? ''} ${pickerTask?.title ?? ''} · ${pickerTask?.points ?? 0} ${t('common.pt')}`}
        members={data.members}
        confirmLabel={pickerTask?.kind === 'penalty' ? t('tasks.penaltyBtn') : t('tasks.awardBtn')}
        tone={pickerTask?.kind === 'penalty' ? 'penalty' : 'gain'}
        onConfirm={async (member) => {
          try {
            await handleAssign(member.id);
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />

      <TaskFormSheet
        state={sheet}
        onClose={() => setSheet({ mode: 'closed' })}
        onDelete={(task) => {
          setSheet({ mode: 'closed' });
          setDeleteTarget(task);
        }}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('tasks.deleteTitle')}
        description={t('tasks.deleteConfirm', { name: deleteTarget?.title ?? '' })}
        confirmLabel={t('common.delete')}
        tone="penalty"
        onConfirm={async () => {
          try {
            await actions.deleteTask(deleteTarget?.id ?? '');
            toast(t('tasks.saved'), 'success');
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />

      <InfoSheet
        visible={taskPendingInfo}
        onClose={() => setTaskPendingInfo(false)}
        title={t('tasks.taskPending')}
        body={t('tasks.taskPendingDesc')}
        icon="⏳"
      />

      <InfoSheet
        visible={penaltyInfo}
        onClose={() => setPenaltyInfo(false)}
        title={t('tasks.penaltySent')}
        body={t('tasks.penaltySentDesc')}
        icon="⏳"
      />

      {me && !isParent ? <Text style={styles.footerNote}>{t('penalties.zeroLimit')}</Text> : null}
    </Screen>
  );
}

/** Görev ekleme / düzenleme pop-up'ı. */
function TaskFormSheet({
  state,
  onClose,
  onDelete,
}: {
  state: SheetState;
  onClose: () => void;
  onDelete: (task: CatalogTask) => void;
}) {
  const editing = state.mode === 'edit' ? state.task : null;

  return (
    <SheetModal
      visible={state.mode !== 'closed'}
      onClose={onClose}
      title={editing ? t('tasks.editTitle') : t('tasks.newTitle')}
    >
      {state.mode !== 'closed' ? (
        <TaskFormBody
          key={editing?.id ?? 'new'}
          initial={{
            title: editing?.title ?? '',
            points: editing?.points ?? 20,
            icon: editing?.icon ?? '⭐',
            kind: editing?.kind ?? 'gain',
          }}
          editingId={editing?.id}
          onDelete={editing ? () => onDelete(editing) : undefined}
          onSaved={onClose}
        />
      ) : null}
    </SheetModal>
  );
}

function TaskFormBody({
  initial,
  editingId,
  onDelete,
  onSaved,
}: {
  initial: { title: string; points: number; icon: string; kind: TaskKind };
  editingId?: string;
  onDelete?: () => void;
  onSaved: () => void;
}) {
  const styles = createStyles(useColors());
  const toast = useToast();
  const actions = useActions();

  const [title, setTitle] = useState(initial.title);
  const [points, setPoints] = useState(initial.points);
  const [icon, setIcon] = useState(initial.icon);
  const [kind, setKind] = useState<TaskKind>(initial.kind);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Field label={t('tasks.taskName')} value={title} onChangeText={setTitle} autoCapitalize="sentences" />
      <Stepper label={t('tasks.taskPoints')} value={points} onChange={setPoints} step={5} min={5} max={99999} />
      <EmojiPicker label={t('tasks.taskIcon')} value={icon} onChange={setIcon} />

      <View style={styles.kindRow}>
        <Pressable
          onPress={() => setKind('gain')}
          style={[styles.kindCell, kind === 'gain' && styles.kindCellGain]}
        >
          <Text style={[styles.kindText, kind === 'gain' && styles.kindTextActive]}>💰 {t('tasks.gain')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setKind('penalty')}
          style={[styles.kindCell, kind === 'penalty' && styles.kindCellPenalty]}
        >
          <Text style={[styles.kindText, kind === 'penalty' && styles.kindTextActive]}>
            ⚠️ {t('tasks.penalty')}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <PrimaryButton
        label={t('common.save')}
        loading={busy}
        onPress={async () => {
          if (title.trim().length < 2) {
            setError(t('common.required'));
            return;
          }
          setError(null);
          setBusy(true);
          try {
            await actions.saveTask({ id: editingId, title: title.trim(), kind, points, icon });
            toast(editingId ? t('tasks.saved') : t('tasks.addedOk'), 'success');
            onSaved();
          } catch (e) {
            setError(messageForError(e));
          } finally {
            setBusy(false);
          }
        }}
      />

      {onDelete ? (
        <PrimaryButton
          label={t('common.delete')}
          tone="penalty"
          onPress={onDelete}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}
    </>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  taskCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 4,
    borderBottomColor: colors.gain,
  },
  taskCardPenalty: {
    borderBottomColor: colors.penalty,
  },
  taskIcon: {
    fontSize: 32,
  },
  taskTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    minHeight: 40,
  },
  taskPoints: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.gainDeep,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footerNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kindCell: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindCellGain: {
    backgroundColor: colors.gainSoft,
    borderColor: colors.gain,
  },
  kindCellPenalty: {
    backgroundColor: colors.penaltySoft,
    borderColor: colors.penalty,
  },
  kindText: {
    fontSize: fontSize.label,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  kindTextActive: {
    color: colors.text,
  },
  formError: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
