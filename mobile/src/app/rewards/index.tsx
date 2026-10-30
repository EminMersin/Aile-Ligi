import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmojiPicker, Field, Stepper } from '@/components/forms';
import { ConfirmSheet, MemberPickerSheet, SheetModal } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { useActions, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { relativeTimeTR } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';
import type { Reward } from '@/types/models';

/**
 * Ödüller ekranı: ödülleri kart ızgarasında gösterir, herkes ödül kullanabilir.
 * Yönetici uzun basarak ödülü düzenleyebilir veya silebilir.
 */
export default function RewardsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const refresh = useRefresh();

  const [pickerReward, setPickerReward] = useState<Reward | null>(null);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);

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

  const rewards = data.rewards.filter((reward) => reward.isActive);
  const recent = data.redemptions.slice(0, 5);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('rewards.title')}
        onBack={() => goBack()}
        right={
          isParent ? (
            <Pressable style={styles.addButton} onPress={() => router.push('/rewards/new')}>
              <Text style={styles.addButtonText}>＋</Text>
            </Pressable>
          ) : null
        }
      />

      {rewards.length === 0 ? (
        <EmptyState icon="🎁" title={t('rewards.empty')} />
      ) : (
        <View style={styles.grid}>
          {rewards.map((reward) => (
            <Pressable
              key={reward.id}
              onLongPress={() => {
                if (isParent) setEditReward(reward);
              }}
              delayLongPress={350}
              style={({ pressed }) => [styles.rewardCard, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.rewardIcon}>{reward.icon}</Text>
              <Text style={styles.rewardTitle} numberOfLines={2}>
                {reward.title}
              </Text>
              {reward.description ? (
                <Text style={styles.rewardDescription} numberOfLines={2}>
                  {reward.description}
                </Text>
              ) : null}
              <Pill label={`${reward.cost} ${t('common.pt')}`} tone="gold" icon="⭐" />
              <PrimaryButton
                label={t('rewards.redeem')}
                tone="gain"
                onPress={() => setPickerReward(reward)}
                style={styles.redeemButton}
              />
            </Pressable>
          ))}
        </View>
      )}

      {isParent && rewards.length > 0 ? (
        <Text style={styles.hint}>{t('rewards.longPressHint')}</Text>
      ) : null}

      {recent.length > 0 ? (
        <>
          <SectionTitle title={t('rewards.recent')} />
          {recent.map((redemption) => (
            <ListRow
              key={redemption.id}
              icon={redemption.rewardIcon}
              title={redemption.rewardTitle}
              subtitle={`${redemption.memberName} · ${relativeTimeTR(redemption.createdAt)}`}
              tone="gold"
              right={
                <Text style={styles.recentCost}>
                  −{redemption.cost} {t('common.pt')}
                </Text>
              }
            />
          ))}
        </>
      ) : null}

      <MemberPickerSheet
        visible={!!pickerReward}
        onClose={() => setPickerReward(null)}
        title={t('rewards.redeemTitle')}
        subtitle={`${pickerReward?.icon ?? ''} ${pickerReward?.title ?? ''} · ${pickerReward?.cost ?? 0} ${t(
          'common.pt',
        )}`}
        members={data.members}
        confirmLabel={t('rewards.redeem')}
        tone="gain"
        onConfirm={async (member) => {
          if (!pickerReward) return;
          try {
            await actions.redeemReward(pickerReward.id, member.id);
            toast(
              t('rewards.redeemed', { name: member.name, reward: pickerReward.title }),
              'success',
            );
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />

      <SheetModal
        visible={!!editReward}
        onClose={() => setEditReward(null)}
        title={t('rewards.editTitle')}
        subtitle={`${editReward?.icon ?? ''} ${editReward?.title ?? ''}`}
      >
        {editReward ? (
          <RewardFormBody
            key={editReward.id}
            initial={editReward}
            onDelete={() => {
              const target = editReward;
              setEditReward(null);
              setDeleteTarget(target);
            }}
            onSaved={() => setEditReward(null)}
          />
        ) : null}
      </SheetModal>

      <ConfirmSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        description={t('rewards.deleteConfirm', { name: deleteTarget?.title ?? '' })}
        confirmLabel={t('common.delete')}
        tone="penalty"
        onConfirm={async () => {
          try {
            await actions.deleteReward(deleteTarget?.id ?? '');
            toast(t('rewards.deleted'), 'success');
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />
    </Screen>
  );
}

/** Ödül düzenleme formu (pop-up içinde). */
function RewardFormBody({
  initial,
  onDelete,
  onSaved,
}: {
  initial: Reward;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const styles = createStyles(useColors());
  const toast = useToast();
  const actions = useActions();

  const [title, setTitle] = useState(initial.title);
  const [cost, setCost] = useState(initial.cost);
  const [icon, setIcon] = useState(initial.icon);
  const [description, setDescription] = useState(initial.description ?? '');
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
        id: initial.id,
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

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <PrimaryButton label={t('common.save')} onPress={handleSave} loading={busy} icon="💾" />
      <PrimaryButton
        label={t('common.delete')}
        tone="penalty"
        onPress={onDelete}
        style={{ marginTop: spacing.sm }}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rewardCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 4,
    borderBottomColor: colors.gold,
  },
  rewardIcon: {
    fontSize: 34,
  },
  rewardTitle: {
    fontSize: fontSize.body,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    minHeight: 38,
  },
  rewardDescription: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  redeemButton: {
    alignSelf: 'stretch',
    paddingVertical: 12,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  recentCost: {
    fontSize: fontSize.body,
    fontWeight: '900',
    color: colors.penaltyDeep,
  },
  formError: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
