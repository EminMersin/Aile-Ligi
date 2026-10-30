import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  IconBadge,
  ListRow,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  SegmentedTabs,
} from '@/components/ui';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { relativeTimeTR } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { PenaltyRequest } from '@/types/models';

type Tab = 'pending' | 'history';

/**
 * Bekleyen cezalar ekranı: yönetici, bir aile ferdinin başkasına verdiği cezayı
 * onaylar ya da reddeder. Onaylanınca puan düşer (asla 0'ın altına inmez),
 * reddedilirse puan değişmez.
 */
export default function PenaltyApprovalsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const actions = useActions();
  const isParent = useIsParent();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  const [tab, setTab] = useState<Tab>('pending');
  const [confirmTarget, setConfirmTarget] = useState<PenaltyRequest | null>(null);

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

  const pending = data.penalties.filter((request) => request.status === 'pending');
  const history = data.penalties.filter((request) => request.status !== 'pending');

  const handleApprove = async () => {
    if (!confirmTarget) return;
    const request = confirmTarget;
    try {
      await actions.reviewPenalty(request.id, true);
      const key = request.kind === 'task' ? 'penalties.taskApprovedToast' : 'penalties.approvedToast';
      toast(t(key, { name: request.memberName, points: request.points }), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  const handleReject = async (request: PenaltyRequest) => {
    try {
      await actions.reviewPenalty(request.id, false);
      toast(t(request.kind === 'task' ? 'penalties.taskRejectedToast' : 'penalties.rejectedToast'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('penalties.title')}
        onBack={() => goBack()}
        right={
          <Pill
            label={`${pending.length} ${t('penalties.pending').toLowerCase()}`}
            tone={pending.length > 0 ? 'penalty' : 'mint'}
            icon="🚨"
          />
        }
      />

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: t('penalties.pending'), icon: '⏳', tone: 'penalty' },
          { value: 'history', label: t('penalties.history'), icon: '📜', tone: 'mint' },
        ]}
      />

      {tab === 'pending' ? (
        pending.length === 0 ? (
          <EmptyState icon="✅" title={t('penalties.noPending')} description={t('penalties.zeroLimit')} />
        ) : (
          pending.map((request) => {
            const member = data.members.find((item) => item.id === request.memberId);
            const isTask = request.kind === 'task';
            return (
              <Card
                key={request.id}
                style={[styles.pendingCard, isTask && { borderLeftColor: colors.gain }]}
              >
                <View style={styles.pendingTop}>
                  <IconBadge icon={request.taskIcon} tone={isTask ? 'gain' : 'penalty'} size={54} />
                  <View style={styles.pendingText}>
                    <Text style={styles.pendingTitle} numberOfLines={2}>
                      {request.taskTitle}
                    </Text>
                    <View style={styles.memberRow}>
                      <Avatar
                        emoji={member?.avatar ?? '🧒'}
                        size={24}
                        tone={member?.role === 'parent' ? 'gold' : 'primary'}
                      />
                      <Text style={styles.memberName}>{request.memberName}</Text>
                    </View>
                  </View>
                  <Text style={[styles.pendingPoints, isTask && { color: colors.gainDeep }]}>
                    {isTask ? `+${request.points}` : `−${request.points}`}
                  </Text>
                </View>

                <Text style={styles.meta}>
                  {`${t('penalties.requestedBy', { name: request.requestedByName })} · ${relativeTimeTR(
                    request.createdAt,
                  )}`}
                </Text>

                {isTask ? null : (
                  <View style={styles.warningRow}>
                    <Text style={styles.warningIcon}>🛡️</Text>
                    <Text style={styles.warningText}>{t('penalties.zeroLimit')}</Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <PrimaryButton
                    label={t('common.approve')}
                    tone="gain"
                    onPress={() => setConfirmTarget(request)}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    label={t('common.reject')}
                    tone="muted"
                    onPress={() => void handleReject(request)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            );
          })
        )
      ) : history.length === 0 ? (
        <EmptyState icon="📜" title={t('penalties.historyEmpty')} />
      ) : (
        history.map((request) => {
          const approved = request.status === 'approved';
          const isTask = request.kind === 'task';
          return (
            <ListRow
              key={request.id}
              icon={request.taskIcon}
              tone={approved ? (isTask ? 'gain' : 'penalty') : 'mint'}
              title={request.taskTitle}
              subtitle={`${request.memberName}${
                request.reviewedByName ? ` · ${request.reviewedByName}` : ''
              } · ${relativeTimeTR(request.createdAt)}`}
              right={
                <View style={styles.historyRight}>
                  <Text
                    style={[
                      styles.historyPoints,
                      isTask && approved && { color: colors.gainDeep },
                      !approved && styles.historyPointsMuted,
                    ]}
                  >
                    {isTask ? `+${request.points}` : `−${request.points}`}
                  </Text>
                  <Pill
                    label={approved ? t('penalties.approved') : t('penalties.rejected')}
                    tone={approved ? 'penalty' : 'mint'}
                  />
                </View>
              }
            />
          );
        })
      )}

      <ConfirmSheet
        visible={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={t('common.approve')}
        description={t(
          confirmTarget?.kind === 'task' ? 'penalties.taskApproveConfirm' : 'penalties.approveConfirm',
          {
            task: confirmTarget?.taskTitle ?? '',
            name: confirmTarget?.memberName ?? '',
          },
        )}
        confirmLabel={t('common.approve')}
        tone="gain"
        onConfirm={handleApprove}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  pendingCard: {
    marginTop: spacing.md,
    borderLeftWidth: 5,
    borderLeftColor: colors.penalty,
  },
  pendingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pendingText: {
    flex: 1,
    gap: spacing.xs,
  },
  pendingTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pendingPoints: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.penaltyDeep,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  warningIcon: {
    fontSize: 14,
  },
  warningText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.goldDeep,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  historyPoints: {
    fontSize: fontSize.body,
    fontWeight: '900',
    color: colors.penaltyDeep,
  },
  historyPointsMuted: {
    color: colors.textMuted,
  },
});
