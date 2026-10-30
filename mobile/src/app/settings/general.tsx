import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/forms';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Avatar,
  Card,
  ErrorState,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { isDemoMode } from '@/data';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { pickFamilyPhoto, PhotoPermissionError } from '@/lib/photo';
import { formatDateTR } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/** Genel ayarlar: aile adı, aile fotoğrafı ve veri bağlantısı. */
export default function GeneralSettingsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  const [draftName, setDraftName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

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

  const { family } = data;
  const nameValue = draftName ?? family.name;

  const handleSave = async () => {
    const trimmed = nameValue.trim();
    if (trimmed.length < 2) {
      setError(t('auth.familyNameRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await actions.updateFamily({ name: trimmed });
      setDraftName(null);
      toast(t('settings.familySaved'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      setPhotoBusy(true);
      const photo = await pickFamilyPhoto();
      if (!photo) return;
      await actions.updateFamily({ photoUrl: photo });
      toast(t('settings.photoSaved'), 'success');
    } catch (e) {
      toast(
        e instanceof PhotoPermissionError ? t('settings.photoPermission') : messageForError(e),
        'error',
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setPhotoBusy(true);
      await actions.updateFamily({ photoUrl: null });
      toast(t('settings.photoRemoved'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader title={t('settings.general')} subtitle={family.name} onBack={() => goBack()} />

      <Card tone="primary" style={styles.heroCard}>
        <Avatar emoji="👨‍👩‍👧‍👦" photo={family.photoUrl} tone="gold" size={58} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.heroName}>{family.name}</Text>
          <Text style={styles.heroMeta}>
            {t('settings.createdAt')}: {formatDateTR(family.createdAt)}
          </Text>
          <Text style={styles.heroMeta}>
            {t('settings.memberCount')}: {data.members.length}
          </Text>
        </View>
      </Card>

      <SectionTitle title={t('settings.familyName')} />
      <Card>
        <Field
          label={t('settings.familyName')}
          value={nameValue}
          onChangeText={setDraftName}
          placeholder={t('auth.familyNamePlaceholder')}
          autoCapitalize="words"
          error={error}
        />
        <PrimaryButton label={t('common.save')} onPress={handleSave} loading={busy} icon="💾" />
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>{t('family.codeTitle')}</Text>
          <Text style={styles.codeValue}>{family.code}</Text>
        </View>
        <Text style={styles.codeHint}>{t('family.codeDesc')}</Text>
      </Card>

      <SectionTitle title={t('settings.familyPhoto')} />
      <Card>
        <View style={styles.photoRow}>
          <Avatar emoji="👨‍👩‍👧‍👦" photo={family.photoUrl} tone="gold" size={72} />
          <View style={styles.photoText}>
            <Text style={styles.photoTitle}>{t('settings.familyPhoto')}</Text>
            <Text style={styles.photoNote}>{t('settings.photoDesc')}</Text>
          </View>
        </View>
        <PrimaryButton
          label={family.photoUrl ? t('settings.photoChange') : t('settings.uploadPhoto')}
          onPress={() => void handlePickPhoto()}
          loading={photoBusy}
          icon="📷"
        />
        {family.photoUrl ? (
          <PrimaryButton
            label={t('settings.photoRemove')}
            onPress={() => void handleRemovePhoto()}
            tone="muted"
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
      </Card>

      <SectionTitle title={t('settings.dataMode')} />
      <Card>
        <View style={styles.modeRow}>
          <Text style={styles.modeTitle}>
            {isDemoMode ? t('settings.dataModeDemo') : t('settings.dataModeSupabase')}
          </Text>
          {isDemoMode ? <Pill label={t('common.demoMode')} tone="gold" icon="🧪" /> : null}
        </View>
        <Text style={styles.modeNote}>{t('common.demoModeNote')}</Text>
      </Card>

    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  heroName: {
    fontSize: fontSize.section,
    fontWeight: '900',
    color: colors.text,
  },
  heroMeta: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  photoText: {
    flex: 1,
    gap: spacing.xs,
  },
  photoTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  photoNote: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  codeLabel: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  codeValue: {
    fontSize: fontSize.body,
    fontWeight: '900',
    color: colors.primaryDeep,
    letterSpacing: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  codeHint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modeTitle: {
    flex: 1,
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    color: colors.text,
  },
  modeNote: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
});
