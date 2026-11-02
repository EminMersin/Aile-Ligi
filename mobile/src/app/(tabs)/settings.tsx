import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/Sheet';
import {
  AppHeader,
  Avatar,
  Card,
  ListRow,
  LoadingState,
  Pill,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { isDemoMode, repository } from '@/data';
import { useCurrentMember, useFamilyState, useSessionActions } from '@/data/hooks';
import { t } from '@/i18n';
import { formatDateTR } from '@/lib/utils';
import { APP_VERSION } from '@/constants/config';
import { fontSize, spacing, useColors, type ThemeColors } from '@/theme';

/** Ayarlar: genel, aile, sıfırlama, alışveriş, tercihler, destek, Plus. */
export default function SettingsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { data, isLoading } = useFamilyState();
  const me = useCurrentMember(data);
  const { signOut } = useSessionActions();
  const [signOutSheet, setSignOutSheet] = useState(false);

  if (isLoading || !data) return <LoadingState label={t('common.loading')} />;

  const pendingPenalties = data.penalties.filter((p) => p.status === 'pending').length;
  const isParent = me?.role === 'parent';

  return (
    <Screen>
      <AppHeader title={t('settings.title')} subtitle={data.family.name} />

      <Card tone="primary" style={styles.familyCard}>
        <View style={styles.familyRow}>
          <Avatar emoji="👨‍👩‍👧‍👦" photo={data.family.photoUrl} tone="gold" size={58} />
          <View style={{ flex: 1 }}>
            <Text style={styles.familyName}>{data.family.name}</Text>
            <Text style={styles.familyMeta}>
              {t('settings.createdAt')}: {formatDateTR(data.family.createdAt)}
            </Text>
            <Text style={styles.familyMeta}>
              {t('family.codeTitle')}: <Text style={styles.code}>{data.family.code}</Text>
            </Text>
          </View>
        </View>
        {me ? (
          <View style={styles.meRow}>
            <Avatar emoji={me.avatar} tone={me.role === 'parent' ? 'gold' : 'primary'} size={34} />
            <Text style={styles.meName}>
              {me.name} · {me.role === 'parent' ? t('family.parent') : t('family.child')}
            </Text>
            <Pill label={`${me.points} ${t('common.pt')}`} tone="gain" />
          </View>
        ) : null}
      </Card>

      <ListRow icon="🎁" title={t('rewards.title')} subtitle={t('rewards.redeemDesc')} tone="gain" onPress={() => router.push('/rewards')} />

      {isParent ? (
        <>
          <SectionTitle title={t('settings.general')} />
          <ListRow icon="🏠" title={t('settings.general')} subtitle={t('settings.familyName')} onPress={() => router.push('/settings/general')} />
          <ListRow icon="👥" title={t('settings.familyAndMembers')} onPress={() => router.push('/family/members')} />
          <ListRow icon="🔑" title={t('family.codeTitle')} subtitle={t('family.rotate')} tone="gold" onPress={() => router.push('/family/code')} />
        </>
      ) : null}

      <SectionTitle title={t('settings.preferences')} />
      {isParent ? (
        <ListRow
          icon="🔄"
          title={t('settings.weeklyReset')}
          subtitle={
            data.family.settings.weeklyResetEnabled ? t('settings.autoReset') : t('weekly.resetOff')
          }
          onPress={() => router.push('/settings/weekly-reset')}
        />
      ) : null}
      <ListRow
        icon="🛒"
        title={t('shopping.title')}
        subtitle={`${data.shopping.filter((i) => !i.isDone).length} / ${data.shopping.length}`}
        tone="mint"
        onPress={() => router.push('/shopping')}
      />
      <ListRow
        icon="🎛️"
        title={t('settings.preferences')}
        subtitle={t('settings.sounds')}
        onPress={() => router.push('/settings/preferences')}
      />
      {isParent ? (
        <ListRow
          icon="⭐"
          title={t('settings.plus')}
          subtitle={t('plus.subtitle')}
          tone="plus"
          onPress={() => router.push('/settings/plus')}
          right={
            <View style={styles.rowRight}>
              <Pill label={t('common.soon')} tone="gold" />
              <Text style={styles.chevron}>›</Text>
            </View>
          }
        />
      ) : null}
      <ListRow icon="💬" title={t('settings.support')} onPress={() => router.push('/settings/support')} />

      <SectionTitle title={t('auth.signOut')} />
      <ListRow
        icon="🚪"
        title={t('auth.signOut')}
        subtitle={t('auth.signOutConfirm')}
        destructive
        onPress={() => setSignOutSheet(true)}
      />

      <Card style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>
          {t('auth.appName')} · {t('settings.version')} {APP_VERSION}
        </Text>
        <Text style={styles.aboutMeta}>
          {t('settings.dataMode')}: {isDemoMode ? t('settings.dataModeDemo') : t('settings.dataModeSupabase')}
        </Text>
        <Text style={styles.aboutMeta}>
          {repository.mode === 'demo' ? t('common.demoModeNote') : t('settings.codeSync')}
        </Text>
        <Text style={styles.aboutMeta}>{t('settings.madeWith')} ❤️</Text>
      </Card>

      {pendingPenalties > 0 ? (
        <Text style={styles.pendingNote}>
          {pendingPenalties} {t('penalties.pending').toLowerCase()} → {t('penalties.title')}
        </Text>
      ) : null}

      <ConfirmSheet
        visible={signOutSheet}
        onClose={() => setSignOutSheet(false)}
        title={t('auth.signOut')}
        description={t('auth.signOutConfirm')}
        confirmLabel={t('auth.signOut')}
        tone="penalty"
        onConfirm={async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        }}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  familyCard: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  familyName: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.text,
  },
  familyMeta: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  code: {
    fontWeight: '900',
    color: colors.primaryDeep,
    letterSpacing: 2,
  },
  meRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  meName: {
    flex: 1,
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.text,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  aboutCard: {
    marginTop: spacing.xl,
    gap: 4,
  },
  aboutTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  aboutMeta: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  pendingNote: {
    fontSize: fontSize.caption,
    color: colors.penaltyDeep,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
