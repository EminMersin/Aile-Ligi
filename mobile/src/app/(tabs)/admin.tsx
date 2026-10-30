import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, Stepper } from '@/components/forms';
import { ConfirmSheet, MemberPickerSheet, SheetModal } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Avatar,
  Card,
  ListRow,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { isDemoMode } from '@/data';
import { useActions, useFamilyState, useIsParent } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { todayISO, weekdayShort } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { Member } from '@/types/models';

/** Aile Yöneticisi sayfası: üyeler, planlama, ödüller, ceza onayları. */
export default function AdminScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading } = useFamilyState();

  const [codeSheet, setCodeSheet] = useState(false);
  const [rotateSheet, setRotateSheet] = useState(false);
  const [manualTarget, setManualTarget] = useState<Member | null>(null);
  const [manualPoints, setManualPoints] = useState(10);
  const [manualTitle, setManualTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!isParent) return <Redirect href="/(tabs)" />;
  if (isLoading || !data) return <LoadingState label={t('common.loading')} />;

  const pendingPenalties = data.penalties.filter((p) => p.status === 'pending');
  const today = todayISO();
  const weekDays = [1, 2, 3, 4, 5, 6, 0];

  const handleRotate = async () => {
    setBusy(true);
    try {
      const newCode = await actions.rotateCode();
      toast(`${t('family.rotated')}: ${newCode}`, 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader title={t('nav.admin')} subtitle={data.family.name} />

      <Card tone="primary" style={styles.codeCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.codeLabel}>{t('family.codeTitle')}</Text>
          <Text style={styles.codeValue}>{data.family.code}</Text>
        </View>
        <Pill label={t('auth.codeHint')} tone="primary" />
      </Card>

      <View style={styles.codeActions}>
        <PrimaryButton label={t('family.codeTitle')} onPress={() => setCodeSheet(true)} icon="🔑" tone="muted" style={{ flex: 1 }} />
        <PrimaryButton label={t('family.rotate')} onPress={() => setRotateSheet(true)} icon="🔄" style={{ flex: 1 }} />
      </View>

      <SectionTitle
        title={t('family.members')}
        actionLabel={t('family.addMember')}
        onAction={() => router.push('/family/members')}
      />
      {data.members.map((member) => (
        <View key={member.id} style={styles.memberRow}>
          <Avatar emoji={member.avatar} tone={member.role === 'parent' ? 'gold' : 'primary'} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberRole}>
              {member.role === 'parent' ? t('family.parent') : t('family.child')} ·{' '}
              {member.isLinked ? t('family.linked') : t('family.notLinked')}
            </Text>
          </View>
          <Text style={styles.memberPoints}>{member.points}</Text>
          <Pressable
            onPress={() => {
              setManualTarget(member);
              setManualPoints(10);
              setManualTitle('');
            }}
            style={styles.quickButton}
          >
            <Text style={styles.quickButtonText}>±</Text>
          </Pressable>
        </View>
      ))}

      <SectionTitle title={t('calendar.title')} actionLabel={t('calendar.week')} onAction={() => router.push('/calendar')} />
      <View style={styles.weekStrip}>
        {weekDays.map((day) => {
          const count = data.plannedTasks.filter(
            (task) => task.recurrence !== 'none' && (task.weekdays.includes(day) || task.recurrence === 'daily'),
          ).length;
          return (
            <Pressable key={day} onPress={() => router.push('/calendar')} style={styles.dayCell}>
              <Text style={styles.dayLabel}>{weekdayShort(day)}</Text>
              <View style={[styles.dayDot, count > 0 && styles.dayDotActive]}>
                <Text style={styles.dayCount}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title={t('planned.title')} />
      <ListRow
        icon="🗓️"
        title={t('planned.title')}
        subtitle={t('planned.add')}
        onPress={() => router.push('/planned-tasks')}
      />
      <ListRow
        icon="🎁"
        title={t('rewards.title')}
        subtitle={t('rewards.add')}
        tone="gold"
        onPress={() => router.push('/rewards')}
      />
      <ListRow
        icon="🚨"
        title={t('penalties.title')}
        subtitle={
          pendingPenalties.length > 0
            ? `${pendingPenalties.length} ${t('penalties.pending').toLowerCase()}`
            : t('penalties.noPending')
        }
        tone="penalty"
        onPress={() => router.push('/penalties/approvals')}
        right={
          pendingPenalties.length > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingPenalties.length}</Text>
            </View>
          ) : undefined
        }
      />
      <ListRow
        icon="🛒"
        title={t('shopping.title')}
        subtitle={`${data.shopping.filter((i) => !i.isDone).length} / ${data.shopping.length}`}
        tone="mint"
        onPress={() => router.push('/shopping')}
      />
      <ListRow
        icon="💪"
        title={t('planned.points')}
        subtitle={t('tasks.awardBtn')}
        tone="gain"
        onPress={() => setPickerOpen(true)}
      />

      <SectionTitle title={t('settings.title')} />
      <ListRow icon="🔄" title={t('settings.weeklyReset')} onPress={() => router.push('/settings/weekly-reset')} />
      <ListRow icon="⭐" title={t('settings.plus')} tone="plus" onPress={() => router.push('/settings/plus')} />

      {isDemoMode ? <Text style={styles.demoNote}>{t('common.demoModeNote')}</Text> : null}
      <Text style={styles.todayNote}>{t('calendar.today')}: {today}</Text>

      <ConfirmSheet
        visible={rotateSheet}
        onClose={() => setRotateSheet(false)}
        title={t('family.rotate')}
        description={t('family.rotateConfirm')}
        confirmLabel={t('family.rotate')}
        onConfirm={handleRotate}
      />

      <SheetModal
        visible={codeSheet}
        onClose={() => setCodeSheet(false)}
        title={t('family.codeTitle')}
        subtitle={t('family.codeDesc')}
      >
        <View style={styles.bigCodeRow}>
          {data.family.code.split('').map((digit, index) => (
            <View key={index} style={styles.bigCodeBox}>
              <Text style={styles.bigCodeDigit}>{digit}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton
          label={t('auth.continueBtn')}
          onPress={() => {
            setCodeSheet(false);
            router.push('/family/code');
          }}
          style={{ marginTop: spacing.md }}
        />
      </SheetModal>

      <MemberPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('planned.whoTitle')}
        subtitle={t('tasks.awardBtn')}
        members={data.members}
        confirmLabel={t('auth.continueBtn')}
        tone="gain"
        onConfirm={(member) => {
          setManualTarget(member);
          setManualPoints(10);
          setManualTitle('');
        }}
      />

      <SheetModal
        visible={!!manualTarget}
        onClose={() => setManualTarget(null)}
        title={`${manualTarget?.avatar ?? ''} ${manualTarget?.name ?? ''}`}
        subtitle={t('tasks.awardBtn')}
      >
        <Stepper label={t('planned.points')} value={manualPoints} onChange={setManualPoints} step={5} min={-100} max={99999} />
        <Field label={t('tasks.taskName')} value={manualTitle} onChangeText={setManualTitle} autoCapitalize="sentences" />
        <PrimaryButton
          label={t('common.save')}
          loading={busy}
          tone={manualPoints >= 0 ? 'gain' : 'penalty'}
          onPress={async () => {
            if (!manualTarget) return;
            setBusy(true);
            try {
              await actions.adjustPoints(
                manualTarget.id,
                manualPoints,
                manualTitle.trim() || t('tasks.awardBtn'),
              );
              toast(
                t('tasks.awarded', { name: manualTarget.name, points: manualPoints }),
                'success',
              );
              setManualTarget(null);
            } catch (e) {
              toast(messageForError(e), 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      </SheetModal>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  codeLabel: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  codeValue: {
    fontSize: fontSize.display,
    fontWeight: '900',
    color: colors.primaryDeep,
    letterSpacing: 4,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberName: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  memberPoints: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.gainDeep,
  },
  quickButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDeep,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  dayCell: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: colors.primarySoft,
  },
  dayCount: {
    fontSize: fontSize.label,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.penalty,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.textOnDark,
    fontSize: fontSize.caption,
    fontWeight: '900',
  },
  bigCodeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  bigCodeBox: {
    width: 44,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigCodeDigit: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.primaryDeep,
  },
  demoNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.xl,
    lineHeight: 18,
  },
  todayNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
