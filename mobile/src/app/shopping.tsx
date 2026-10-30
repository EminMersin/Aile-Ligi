import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/forms';
import { ConfirmSheet, MemberPickerSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { useActions, useCurrentMember, useFamilyState, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';
import type { ShoppingItem } from '@/types/models';

/**
 * Alışveriş listesi: ürün ekleme, işaretleme, silme ve alışverişi bitirme.
 * Alınmayan ürünler üstte, alınanlar altta gösterilir.
 */
export default function ShoppingScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const me = useCurrentMember(data);
  const refresh = useRefresh();

  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoppingItem | null>(null);

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

  const pending = data.shopping.filter((item) => !item.isDone);
  const done = data.shopping.filter((item) => item.isDone);
  const pointsEnabled = data.family.settings.shoppingPointsEnabled;

  const handleAdd = async () => {
    if (!title.trim()) {
      toast(t('common.required'), 'error');
      return;
    }
    setAddBusy(true);
    try {
      await actions.addShoppingItem(title.trim(), quantity.trim() || null);
      setTitle('');
      setQuantity('');
      toast(t('shopping.itemAdded'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    } finally {
      setAddBusy(false);
    }
  };

  const handleToggle = async (item: ShoppingItem) => {
    try {
      await actions.toggleShoppingItem(item.id, !item.isDone, me?.id ?? null);
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  const handleClearDone = async () => {
    try {
      await actions.clearDoneShopping();
      toast(t('shopping.cleared'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  const handleFinish = () => {
    if (pointsEnabled) {
      setFinishOpen(true);
      return;
    }
    void finishWithoutPoints();
  };

  const finishWithoutPoints = async () => {
    try {
      await actions.finishShopping(null);
      toast(t('shopping.finished'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  const renderItem = (item: ShoppingItem) => {
    const metaParts: string[] = [];
    if (item.quantity) metaParts.push(item.quantity);
    if (item.isDone && item.doneByName) metaParts.push(`${t('shopping.done')}: ${item.doneByName}`);

    return (
      <Pressable
        key={item.id}
        onLongPress={() => setDeleteTarget(item)}
        delayLongPress={350}
        style={({ pressed }) => [styles.itemRow, item.isDone && styles.itemRowDone, pressed && { opacity: 0.9 }]}
      >
        <Pressable
          onPress={() => void handleToggle(item)}
          hitSlop={6}
          style={[styles.checkbox, item.isDone && styles.checkboxDone]}
        >
          {item.isDone ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </Pressable>
        <View style={styles.itemText}>
          <Text style={[styles.itemTitle, item.isDone && styles.itemTitleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          {metaParts.length > 0 ? (
            <Text style={styles.itemMeta}>{metaParts.join(' · ')}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader title={t('shopping.title')} subtitle={data.family.name} onBack={() => goBack()} />

      <Card>
        <Field
          label={t('shopping.itemName')}
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />
        <Field
          label={t('shopping.quantity')}
          value={quantity}
          onChangeText={setQuantity}
          placeholder={t('common.optional')}
          autoCapitalize="sentences"
        />
        <PrimaryButton label={t('shopping.addItem')} onPress={handleAdd} loading={addBusy} icon="＋" />
      </Card>

      {data.shopping.length === 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <EmptyState icon="🛒" title={t('shopping.empty')} />
        </View>
      ) : (
        <>
          <View style={{ marginTop: spacing.lg }}>{pending.map(renderItem)}</View>

          {done.length > 0 ? (
            <>
              <SectionTitle title={`${t('shopping.done')} (${done.length})`} />
              {done.map(renderItem)}
            </>
          ) : null}
        </>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          label={t('shopping.clearDone')}
          onPress={handleClearDone}
          tone="muted"
          icon="🧹"
          disabled={done.length === 0}
        />
        <PrimaryButton label={t('shopping.finish')} onPress={handleFinish} tone="gain" icon="🏁" />
      </View>

      {!pointsEnabled ? (
        <Text style={styles.note}>{t('shopping.pointsSettingOff')}</Text>
      ) : null}

      <MemberPickerSheet
        visible={finishOpen}
        onClose={() => setFinishOpen(false)}
        title={t('shopping.finish')}
        subtitle={t('shopping.finishDesc')}
        members={data.members}
        confirmLabel={t('planned.markDone')}
        tone="gain"
        onConfirm={async (member) => {
          try {
            await actions.finishShopping(member.id);
            toast(
              t('shopping.pointsAwarded', {
                name: member.name,
                points: data.family.settings.shoppingPointsValue,
              }),
              'success',
            );
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        description={`${t('common.delete')}: ${deleteTarget?.title ?? ''}`}
        confirmLabel={t('common.delete')}
        tone="penalty"
        onConfirm={async () => {
          try {
            await actions.deleteShoppingItem(deleteTarget?.id ?? '');
          } catch (e) {
            toast(messageForError(e), 'error');
          }
        }}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  itemRowDone: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.7,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.gain,
    borderColor: colors.gain,
  },
  checkboxMark: {
    color: colors.textOnDark,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: colors.text,
  },
  itemTitleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  note: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 17,
  },
});
