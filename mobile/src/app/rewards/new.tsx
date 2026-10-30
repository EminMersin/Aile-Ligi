import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { EmojiPicker, Field, Stepper } from '@/components/forms';
import { useToast } from '@/components/Toast';
import { AppHeader, ErrorState, LoadingState, PrimaryButton, Screen } from '@/components/ui';
import { useActions, useFamilyState, useIsParent } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { fontSize, spacing, useColors, type ThemeColors } from '@/theme';
import type { Reward } from '@/types/models';

/** Ödül ekleme / düzenleme formu. `id` parametresi verilirse düzenleme modunda açılır. */
export default function RewardFormScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const isParent = useIsParent();
  const { data, isLoading, isError, refetch } = useFamilyState();
  const params = useLocalSearchParams();
  const rewardId = typeof params.id === 'string' ? params.id : undefined;

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

  const existing = rewardId ? (data.rewards.find((reward) => reward.id === rewardId) ?? null) : null;

  return (
    <Screen>
      <AppHeader
        title={rewardId ? t('rewards.editTitle') : t('rewards.newTitle')}
        subtitle={data.family.name}
        onBack={() => goBack()}
      />
      <RewardForm key={rewardId ?? 'new'} initial={existing} onSaved={() => goBack()} />
    </Screen>
  );
}

/** Form alanları ve kaydetme işlemi. */
function RewardForm({ initial, onSaved }: { initial: Reward | null; onSaved: () => void }) {
  const styles = createStyles(useColors());
  const toast = useToast();
  const actions = useActions();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [cost, setCost] = useState(initial?.cost ?? 50);
  const [icon, setIcon] = useState(initial?.icon ?? '🎁');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (title.trim().length < 2) {
      setError(t('common.required'));
      return;
    }
    if (cost <= 0) {
      setError(t('rewards.costPositive'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await actions.saveReward({
        id: initial?.id,
        title: title.trim(),
        cost,
        icon,
        description: description.trim() || null,
      });
      toast(t('rewards.saved'), 'success');
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
        label={t('rewards.name')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('rewards.namePlaceholder')}
        autoCapitalize="sentences"
      />
      <Stepper label={t('rewards.cost')} value={cost} onChange={setCost} step={5} min={5} max={99999} />
      <EmojiPicker label={t('rewards.icon')} value={icon} onChange={setIcon} />
      <Field
        label={t('rewards.description')}
        value={description}
        onChangeText={setDescription}
        autoCapitalize="sentences"
        multiline
        hint={t('common.optional')}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={t('common.save')} onPress={handleSave} loading={busy} icon="💾" />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  error: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
