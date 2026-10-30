import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPicker, ChoiceRow, Field, Stepper } from '@/components/forms';
import { ConfirmSheet, SheetModal } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Avatar,
  ErrorState,
  LoadingState,
  Pill,
  PointsBadge,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';
import type { Member, MemberRole } from '@/types/models';

type SheetState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; member: Member };

/**
 * Aile ve üyeler ekranı: üyeleri listeler. Yönetici üye ekleyip düzenleyebilir,
 * silebilir ve elle puan verebilir. Çocuklar yalnızca listeyi görür.
 */
export default function FamilyMembersScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [manualTarget, setManualTarget] = useState<Member | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<Member | null>(null);

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

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('settings.familyAndMembers')}
        subtitle={data.family.name}
        onBack={() => goBack()}
        right={
          isParent ? (
            <Pressable style={styles.addButton} onPress={() => setSheet({ mode: 'new' })}>
              <Text style={styles.addButtonText}>＋</Text>
            </Pressable>
          ) : null
        }
      />

      <SectionTitle title={t('family.members')} />
      {data.members.map((member) => (
        <Pressable
          key={member.id}
          onPress={isParent ? () => setSheet({ mode: 'edit', member }) : undefined}
          style={({ pressed }) => [styles.memberRow, pressed && isParent && { opacity: 0.88 }]}
        >
          <Avatar emoji={member.avatar} tone={member.role === 'parent' ? 'gold' : 'primary'} size={48} />
          <View style={styles.memberText}>
            <Text style={styles.memberName}>{member.name}</Text>
            <View style={styles.memberMeta}>
              <Text style={styles.memberRole}>
                {member.role === 'parent' ? t('family.parent') : t('family.child')}
              </Text>
              <Pill
                label={member.isLinked ? t('family.linked') : t('family.notLinked')}
                tone={member.isLinked ? 'mint' : 'default'}
                icon={member.isLinked ? '📱' : '🚫'}
              />
              {isParent && member.role !== 'parent' && member.isLinked ? (
                <Pressable onPress={() => setUnlinkTarget(member)} hitSlop={8}>
                  <Text style={styles.unlinkText}>{t('family.unlink')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <PointsBadge points={member.points} size="sm" />
          {isParent ? (
            <Pressable
              onPress={() => setManualTarget(member)}
              style={styles.quickButton}
              hitSlop={8}
            >
              <Text style={styles.quickButtonText}>±</Text>
            </Pressable>
          ) : null}
        </Pressable>
      ))}

      {isParent ? (
        <PrimaryButton
          label={t('family.addMember')}
          icon="＋"
          onPress={() => setSheet({ mode: 'new' })}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      <MemberFormSheet
        state={sheet}
        onClose={() => setSheet({ mode: 'closed' })}
        onDelete={(member) => {
          setSheet({ mode: 'closed' });
          setDeleteTarget(member);
        }}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        description={t('family.deleteConfirm', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('common.delete')}
        tone="penalty"
        onConfirm={async () => {
          try {
            await actions.deleteMember(deleteTarget?.id ?? '');
            toast(t('family.deleted'), 'success');
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />

      <ConfirmSheet
        visible={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        title={t('family.unlink')}
        description={t('family.unlinkConfirm', { name: unlinkTarget?.name ?? '' })}
        confirmLabel={t('family.unlink')}
        tone="penalty"
        onConfirm={async () => {
          try {
            await actions.forceUnlinkMember(unlinkTarget?.id ?? '');
            toast(t('family.unlinked'), 'success');
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />

      <SheetModal
        visible={!!manualTarget}
        onClose={() => setManualTarget(null)}
        title={`${manualTarget?.avatar ?? ''} ${manualTarget?.name ?? ''}`}
        subtitle={t('planned.points')}
      >
        {manualTarget ? (
          <ManualPointsBody
            key={manualTarget.id}
            member={manualTarget}
            onDone={() => setManualTarget(null)}
          />
        ) : null}
      </SheetModal>
    </Screen>
  );
}

/** Üye ekleme / düzenleme pop-up'ının içeriği. */
function MemberFormSheet({
  state,
  onClose,
  onDelete,
}: {
  state: SheetState;
  onClose: () => void;
  onDelete: (member: Member) => void;
}) {
  const editing = state.mode === 'edit' ? state.member : null;

  return (
    <SheetModal
      visible={state.mode !== 'closed'}
      onClose={onClose}
      title={editing ? t('family.editTitle') : t('family.addMember')}
    >
      {state.mode !== 'closed' ? (
        <MemberFormBody
          key={editing?.id ?? 'new'}
          initial={editing}
          onDelete={editing ? () => onDelete(editing) : undefined}
          onSaved={onClose}
        />
      ) : null}
    </SheetModal>
  );
}

function MemberFormBody({
  initial,
  onDelete,
  onSaved,
}: {
  initial: Member | null;
  onDelete?: () => void;
  onSaved: () => void;
}) {
  const styles = createStyles(useColors());
  const toast = useToast();
  const actions = useActions();

  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<MemberRole>(initial?.role ?? 'child');
  const [avatar, setAvatar] = useState(initial?.avatar ?? '🧒');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setError(t('common.required'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await actions.saveMember({ id: initial?.id, name: name.trim(), role, avatar });
      toast(t('family.saved'), 'success');
      onSaved();
    } catch (e) {
      setError(messageForError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field
        label={t('family.memberName')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <ChoiceRow
        label={t('family.role')}
        value={role}
        onChange={setRole}
        options={[
          { value: 'parent', label: t('family.parent') },
          { value: 'child', label: t('family.child') },
        ]}
      />
      <AvatarPicker value={avatar} onChange={setAvatar} />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <PrimaryButton label={t('common.save')} onPress={handleSave} loading={busy} icon="💾" />
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

/** Yönetici için elle puan verme formu. */
function ManualPointsBody({
  member,
  onDone,
}: {
  member: Member;
  onDone: () => void;
}) {
  const toast = useToast();
  const actions = useActions();

  const [points, setPoints] = useState(10);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await actions.adjustPoints(member.id, points, title.trim() || t('tasks.awardBtn'));
      if (points >= 0) {
        toast(t('tasks.awarded', { name: member.name, points }), 'success');
      } else {
        toast(t('penalties.approvedToast', { name: member.name, points: Math.abs(points) }), 'success');
      }
      onDone();
    } catch (e) {
      toast(messageForError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stepper
        label={t('planned.points')}
        value={points}
        onChange={setPoints}
        step={5}
        min={-100}
        max={99999}
      />
      <Field
        label={t('tasks.taskName')}
        value={title}
        onChangeText={setTitle}
        autoCapitalize="sentences"
      />
      <PrimaryButton
        label={t('common.save')}
        tone={points >= 0 ? 'gain' : 'penalty'}
        onPress={handleSave}
        loading={busy}
      />
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  memberText: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  memberRole: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  quickButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkText: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  quickButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDeep,
  },
  formError: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
