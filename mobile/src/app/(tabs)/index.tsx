import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pill,
  PointsBadge,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { isDemoMode } from '@/data';
import { useCurrentMember, useFamilyState, useRefresh, useSession } from '@/data/hooks';
import { t } from '@/i18n';
import { formatDelta, relativeTimeTR } from '@/lib/utils';
import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';

/** Ana Sayfa: sıralama, aile fertleri ve son etkinlik. */
export default function HomeScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const me = useCurrentMember(data);
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
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
  const [first, second, third] = members;
  const leader = members[0];

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.familyName}>{data.family.name}</Text>
          <View style={styles.headerMeta}>
            {isDemoMode ? <Pill label={t('common.demoMode')} tone="gold" icon="🧪" /> : null}
            <Text style={styles.metaText}>
              {t('home.familyPoints')}: {totalPoints}
            </Text>
          </View>
        </View>
        {me ? (
          <View style={styles.meCard}>
            <Avatar emoji={me.avatar} tone={me.role === 'parent' ? 'gold' : 'primary'} />
            <PointsBadge points={me.points} size="sm" />
          </View>
        ) : null}
      </View>

      <SectionTitle title={t('home.ranking')} />
      {members.length === 0 ? (
        <EmptyState icon="👨‍👩‍👧" title={t('home.rankingEmpty')} />
      ) : (
        <Card style={styles.podiumCard}>
          <View style={styles.podiumRow}>
            {second ? (
              <PodiumItem member={second} rank={2} tone="mint" router={router} />
            ) : (
              <View style={styles.podiumSlot} />
            )}
            {first ? <PodiumItem member={first} rank={1} tone="gold" router={router} /> : null}
            {third ? (
              <PodiumItem member={third} rank={3} tone="primary" router={router} />
            ) : (
              <View style={styles.podiumSlot} />
            )}
          </View>
          {leader && leader.points > 0 ? (
            <Pill label={`${t('home.leader')}: ${leader.name} · ${leader.points} ${t('common.pt')}`} tone="gold" icon="🏆" />
          ) : (
            <Text style={styles.podiumHint}>{t('weekly.noChampion')}</Text>
          )}
        </Card>
      )}

      <SectionTitle
        title={t('home.members')}
        actionLabel={session.data?.role === 'parent' ? t('family.allMembers') : undefined}
        onAction={() => router.push('/family/members')}
      />
      {members.map((member) => (
        <View key={member.id} style={styles.memberCard}>
          <Avatar emoji={member.avatar} tone={member.role === 'parent' ? 'gold' : 'primary'} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>
              {member.name}
              {me?.id === member.id ? ` (${t('common.you')})` : ''}
            </Text>
            <Text style={styles.memberRole}>
              {member.role === 'parent' ? t('family.parent') : t('family.child')}
              {member.isLinked ? '' : ` · ${t('family.notLinked')}`}
            </Text>
          </View>
          <PointsBadge points={member.points} />
        </View>
      ))}

      <SectionTitle title={t('home.lastActivity')} />
      {data.activity.length === 0 ? (
        <EmptyState icon="📋" title={t('home.noActivity')} />
      ) : (
        data.activity.slice(0, 6).map((entry) => (
          <View key={entry.id} style={styles.activityRow}>
            <Text style={styles.activityIcon}>{entry.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>{entry.title}</Text>
              <Text style={styles.activityMeta}>
                {entry.memberName ? `${entry.memberName} · ` : ''}
                {relativeTimeTR(entry.createdAt)}
              </Text>
            </View>
            <Text
              style={[
                styles.activityDelta,
                { color: entry.delta >= 0 ? colors.gainDeep : colors.penaltyDeep },
              ]}
            >
              {formatDelta(entry.delta)}
            </Text>
          </View>
        ))
      )}

      <Card tone="plus" style={styles.plusCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.plusTitle}>⭐ {t('home.plusCardTitle')}</Text>
          <Text style={styles.plusDesc}>{t('home.plusCardDesc')}</Text>
        </View>
        <PrimaryButton
          label={t('home.plusCardCta')}
          onPress={() => {
            toast(t('plus.soonBody'), 'info');
            router.push('/settings/plus');
          }}
          tone="muted"
        />
      </Card>
    </Screen>
  );
}

function PodiumItem({
  member,
  rank,
  tone,
  router,
}: {
  member: { id: string; name: string; avatar: string; points: number };
  rank: number;
  tone: 'gold' | 'mint' | 'primary';
  router: ReturnType<typeof useRouter>;
}) {
  const styles = createStyles(useColors());
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  return (
    <View style={[styles.podiumItem, rank === 1 && styles.podiumItemFirst]}>
      <Text style={styles.podiumMedal}>{rank === 1 ? '👑' : medal}</Text>
      <Avatar emoji={member.avatar} tone={tone} size={rank === 1 ? 64 : 52} />
      <Text style={styles.podiumName} numberOfLines={1}>
        {member.name}
      </Text>
      <Text style={styles.podiumPoints}>{member.points}</Text>
      <Text style={styles.podiumRank}>{rank}.</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  familyName: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.text,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  meCard: {
    alignItems: 'center',
    gap: 2,
  },
  podiumCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  podiumItem: {
    alignItems: 'center',
    gap: 4,
    width: 104,
  },
  podiumItemFirst: {
    marginBottom: spacing.sm,
  },
  podiumSlot: {
    width: 104,
  },
  podiumMedal: {
    fontSize: 22,
  },
  podiumName: {
    fontSize: fontSize.label,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  podiumPoints: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.goldDeep,
  },
  podiumRank: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  podiumHint: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  memberName: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  activityIcon: {
    fontSize: 22,
  },
  activityTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  activityMeta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityDelta: {
    fontSize: fontSize.cardTitle,
    fontWeight: '900',
  },
  plusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  plusTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  plusDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
