import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPicker, Field, ToggleRow } from '@/components/forms';
import { AppHeader, Avatar, Card, Pill, PrimaryButton, Screen, SectionTitle } from '@/components/ui';
import { isDemoMode, repository } from '@/data';
import { joinCache } from '@/data/joinCache';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/** Aile üyesi girişi 2. adım: bu ailede kim olduğunu seç. */
export default function MemberJoinScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const cached = joinCache.get();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [avatar, setAvatar] = useState('👦');
  const [asParent, setAsParent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!cached) {
    return <Redirect href="/(auth)/member-code" />;
  }

  const { code, lookup } = cached;

  const handleJoin = async () => {
    if (!isNew && !selectedId) {
      setError(t('auth.whoAreYouDesc'));
      return;
    }
    if (isNew && newName.trim().length < 2) {
      setError(t('auth.nameRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await repository.joinFamily({
        code,
        memberId: isNew ? undefined : (selectedId ?? undefined),
        newMemberName: isNew ? newName.trim() : undefined,
        avatar,
        asParent,
      });
      joinCache.clear();
      router.replace('/(tabs)');
    } catch (e) {
      setError(messageForError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader title={t('auth.whoAreYou')} subtitle={lookup.familyName} onBack={() => goBack()} />

      <Card tone="primary" style={styles.familyCard}>
        <Text style={styles.familyLabel}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.familyName}>{lookup.familyName}</Text>
        <Pill label={`${lookup.members.length} ${t('family.notLinked').toLowerCase()}`} tone="primary" icon="👥" />
      </Card>

      {lookup.members.length > 0 ? (
        <>
          <SectionTitle title={t('auth.whoAreYou')} />
          {lookup.members.map((member) => {
            const active = !isNew && member.id === selectedId;
            return (
              <Pressable
                key={member.id}
                onPress={() => {
                  setIsNew(false);
                  setSelectedId(member.id);
                  setAvatar(member.avatar);
                  setError(null);
                }}
                style={[styles.memberCard, active && styles.memberCardActive]}
              >
                <Avatar emoji={member.avatar} tone={member.role === 'parent' ? 'gold' : 'primary'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>
                    {member.role === 'parent' ? t('family.parent') : t('family.child')}
                  </Text>
                </View>
                {active ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </>
      ) : null}

      <SectionTitle title={t('auth.newMember')} />
      <Pressable
        onPress={() => {
          setIsNew(true);
          setSelectedId(null);
          setError(null);
        }}
        style={[styles.memberCard, isNew && styles.memberCardActive]}
      >
        <Avatar emoji="✨" tone="gold" />
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{t('auth.newMember')}</Text>
          <Text style={styles.memberRole}>{t('auth.whoAreYouDesc')}</Text>
        </View>
        {isNew ? <Text style={styles.check}>✓</Text> : null}
      </Pressable>

      {isNew ? (
        <Card style={{ marginTop: spacing.md }}>
          <Field
            label={t('auth.newMemberName')}
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="words"
          />
          <AvatarPicker value={avatar} onChange={setAvatar} />
          <ToggleRow
            label={t('auth.parentJoinTitle')}
            description={t('auth.parentJoinDesc')}
            value={asParent}
            onChange={setAsParent}
          />
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isDemoMode ? <Text style={styles.demoHint}>{t('common.demoModeNote')}</Text> : null}

      <PrimaryButton
        label={t('auth.joinFamily')}
        onPress={handleJoin}
        loading={busy}
        icon="🎉"
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  familyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  familyLabel: {
    fontSize: 32,
  },
  familyName: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.text,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  memberName: {
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  check: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  error: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  demoHint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
