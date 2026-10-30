import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { isDemoMode } from '@/data';
import { useFamilyState, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { weeklyChallenge } from '@/lib/challenge';
import { formatDateTR, weekLabelTR, weekdayLong } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/** Haftalık sekmesi: haftanın şampiyonu, sıralama ve haftanın meydan okuması. */
export default function WeeklyScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

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

  const members = [...data.members].sort((a, b) => b.points - a.points);
  const champion = members[0];
  const runnerUp = members[1];
  const { settings } = data.family;
  const hasPoints = members.some((m) => m.points > 0);
  const bestSnapshot = data.snapshots.length
    ? [...data.snapshots].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))[0]
    : null;
  const challenge = weeklyChallenge(data.family.id, data.members);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('weekly.title')}</Text>
        <Text style={styles.subtitle}>{t('weekly.weekLabel', { month: weekLabelTR().split(' ')[0], day: weekLabelTR().split(' ')[1] })}</Text>
      </View>

      {!champion || !hasPoints ? (
        <EmptyState icon="🏁" title={t('weekly.noChampion')} description={t('home.noActivity')} />
      ) : (
        <>
          <Card style={styles.championCard}>
            <Text style={styles.crown}>👑</Text>
            <Pill label={t('weekly.champion')} tone="gold" />
            <Avatar emoji={champion.avatar} tone="gold" size={86} />
            <Text style={styles.championName}>{champion.name}</Text>
            <Text style={styles.championPoints}>
              {champion.points} <Text style={styles.championUnit}>{t('common.pt')}</Text>
            </Text>
            {bestSnapshot && bestSnapshot.memberId === champion.id && bestSnapshot.points > 0 ? (
              <Text style={styles.championMeta}>
                {t('weekly.champion')} · {formatDateTR(bestSnapshot.weekStart)}
              </Text>
            ) : null}
          </Card>

          <View style={styles.duoRow}>
            <Card tone="mint" style={styles.duoCard}>
              <Text style={styles.duoLabel}>{t('weekly.second')}</Text>
              {runnerUp ? (
                <>
                  <Avatar emoji={runnerUp.avatar} tone="mint" size={54} />
                  <Text style={styles.duoName}>{runnerUp.name}</Text>
                  <Text style={styles.duoPoints}>{runnerUp.points}</Text>
                </>
              ) : (
                <Text style={styles.duoEmpty}>—</Text>
              )}
            </Card>

            <Card tone="pink" style={styles.duoCard}>
              <Text style={styles.duoLabel}>{t('weekly.nextWeek')}</Text>
              <Text style={styles.nextIcon}>🚀</Text>
              <Text style={styles.duoName}>
                {settings.weeklyResetEnabled
                  ? t('weekly.resetInfo', {
                      day: weekdayLong(settings.weeklyResetDay),
                      hour: settings.weeklyResetHour,
                    })
                  : t('weekly.resetOff')}
              </Text>
            </Card>
          </View>
        </>
      )}

      <Card tone="ai" style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiIcon}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>{t('weekly.aiChallengeTitle')}</Text>
            <Text style={styles.aiDesc}>{t('weekly.aiChallengeDesc')}</Text>
          </View>
          <Pill label={t('weekly.challengeBadge')} tone="ai" icon="🤖" />
        </View>

        {challenge ? (
          <>
            <Text style={styles.challengeText}>{challenge.text}</Text>
            <View style={styles.challengeMembers}>
              {challenge.members.map((member) => (
                <View key={member.id} style={styles.challengeChip}>
                  <Avatar
                    emoji={member.avatar}
                    tone={member.role === 'parent' ? 'gold' : 'primary'}
                    size={34}
                  />
                  <Text style={styles.challengeChipName} numberOfLines={1}>
                    {member.name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <SectionTitle title={t('weekly.leaderboard')} />
      {members.map((member, index) => (
        <View key={member.id} style={styles.rankRow}>
          <View style={[styles.rankBadge, index === 0 && { backgroundColor: colors.goldSoft }]}>
            <Text style={styles.rankText}>{index + 1}</Text>
          </View>
          <Avatar emoji={member.avatar} tone={member.role === 'parent' ? 'gold' : 'primary'} size={44} />
          <Text style={styles.rankName} numberOfLines={1}>
            {member.name}
          </Text>
          <Text style={styles.rankPoints}>{member.points}</Text>
        </View>
      ))}

      {data.snapshots.length > 0 ? (
        <>
          <SectionTitle title={t('planned.done')} />
          {data.snapshots.slice(0, 8).map((snapshot) => (
            <View key={snapshot.id} style={styles.snapshotRow}>
              <Text style={styles.snapshotWeek}>{formatDateTR(snapshot.weekStart)}</Text>
              <Text style={styles.snapshotName} numberOfLines={1}>
                {snapshot.rank === 1 ? '🏆 ' : ''}
                {snapshot.memberName}
              </Text>
              <Text style={styles.snapshotPoints}>{snapshot.points}</Text>
            </View>
          ))}
        </>
      ) : null}

      <PrimaryButton
        label={t('nav.admin')}
        onPress={() => router.push('/(tabs)/admin')}
        tone="muted"
        style={{ marginTop: spacing.xl }}
      />

      {isDemoMode ? <Text style={styles.demoNote}>{t('common.demoModeNote')}</Text> : null}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    marginTop: 4,
  },
  championCard: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.championFrom,
    paddingVertical: spacing.xl,
  },
  crown: {
    fontSize: 26,
  },
  championName: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.text,
  },
  championPoints: {
    fontSize: fontSize.display,
    fontWeight: '900',
    color: colors.goldDeep,
  },
  championUnit: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  championMeta: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  duoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  duoCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 168,
    justifyContent: 'center',
  },
  duoLabel: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  duoName: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  duoPoints: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.gainDeep,
  },
  duoEmpty: {
    fontSize: fontSize.title,
    color: colors.textMuted,
  },
  nextIcon: {
    fontSize: 32,
  },
  aiCard: {
    marginTop: spacing.md,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aiIcon: {
    fontSize: 30,
  },
  aiTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  aiDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  challengeText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  challengeMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  challengeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: spacing.md,
  },
  challengeChipName: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.text,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: fontSize.label,
    fontWeight: '900',
    color: colors.text,
  },
  rankName: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  rankPoints: {
    fontSize: fontSize.cardTitle,
    fontWeight: '900',
    color: colors.primaryDeep,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  snapshotWeek: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    width: 96,
  },
  snapshotName: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  snapshotPoints: {
    fontSize: fontSize.body,
    fontWeight: '800',
    color: colors.goldDeep,
  },
  demoNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
