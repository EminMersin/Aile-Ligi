import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';
import type { Member } from '@/types/models';

import { Avatar, Pill, PrimaryButton, PointsBadge } from './ui';

/** Alttan açılan pop-up (bottom sheet). */
export function SheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  scrollable = true,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  scrollable?: boolean;
}) {
  const styles = createStyles(useColors());
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
          {scrollable ? (
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: spacing.md }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
          <Pressable onPress={onClose} style={styles.closeRow} hitSlop={8}>
            <Text style={styles.closeLabel}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Aile ferdi seçme pop-up'ı: puan verilecek / ceza kesilecek / ödül kullanacak kişi. */
export function MemberPickerSheet({
  visible,
  onClose,
  title,
  subtitle,
  members,
  confirmLabel,
  tone = 'primary',
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  members: Member[];
  confirmLabel: string;
  tone?: 'primary' | 'gain' | 'penalty' | 'ai';
  onConfirm: (member: Member) => Promise<void> | void;
}) {
  const styles = createStyles(useColors());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = members.find((m) => m.id === selectedId) ?? null;

  const handleConfirm = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await onConfirm(selected);
      setSelectedId(null);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      {members.map((member) => {
        const active = member.id === selectedId;
        return (
          <Pressable
            key={member.id}
            onPress={() => setSelectedId(member.id)}
            style={[styles.memberRow, active && styles.memberRowActive]}
          >
            <Avatar emoji={member.avatar} tone={member.role === 'parent' ? 'gold' : 'primary'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>
                {member.role === 'parent' ? t('family.parent') : t('family.child')}
              </Text>
            </View>
            <PointsBadge points={member.points} size="sm" />
            {active ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        );
      })}
      <PrimaryButton
        label={confirmLabel}
        onPress={handleConfirm}
        disabled={!selected}
        loading={busy}
        tone={tone === 'gain' ? 'gain' : tone === 'penalty' ? 'penalty' : tone === 'ai' ? 'ai' : 'primary'}
        style={{ marginTop: spacing.md }}
      />
    </SheetModal>
  );
}

/** Onay pop-up'ı (silme, sıfırlama, kod yenileme gibi işlemler için). */
export function ConfirmSheet({
  visible,
  onClose,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: 'primary' | 'gain' | 'penalty';
  onConfirm: () => Promise<void> | void;
}) {
  const styles = createStyles(useColors());
  const [busy, setBusy] = useState(false);

  return (
    <SheetModal visible={visible} onClose={onClose} title={title} subtitle={description} scrollable={false}>
      <PrimaryButton
        label={confirmLabel}
        onPress={async () => {
          setBusy(true);
          try {
            await onConfirm();
            onClose();
          } finally {
            setBusy(false);
          }
        }}
        loading={busy}
        tone={tone}
      />
      <PrimaryButton
        label={t('common.cancel')}
        onPress={onClose}
        tone="muted"
        style={{ marginTop: spacing.sm }}
      />
    </SheetModal>
  );
}

/** Geliştirilmekte olan özellikler için bilgi pop-up'ı (AI Hakem, Plus, FamilyRecap…). */
export function ComingSoonSheet({
  visible,
  onClose,
  title,
  body,
  icon = '🚧',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  icon?: string;
}) {
  const styles = createStyles(useColors());
  return (
    <SheetModal visible={visible} onClose={onClose} title={title} scrollable={false}>
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonIcon}>{icon}</Text>
        <Text style={styles.comingSoonBody}>{body}</Text>
        <Pill label={t('common.soon')} tone="gold" icon="⏳" />
      </View>
      <PrimaryButton label={t('common.understood')} onPress={onClose} style={{ marginTop: spacing.lg }} />
    </SheetModal>
  );
}

/** Basit bilgi pop-up'ı. */
export function InfoSheet({
  visible,
  onClose,
  title,
  body,
  icon,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  icon?: string;
}) {
  const styles = createStyles(useColors());
  return (
    <SheetModal visible={visible} onClose={onClose} title={title} scrollable={false}>
      {icon ? <Text style={styles.infoIcon}>{icon}</Text> : null}
      <Text style={styles.comingSoonBody}>{body}</Text>
      <PrimaryButton label={t('common.ok')} onPress={onClose} style={{ marginTop: spacing.lg }} />
    </SheetModal>
  );
}

export { ActivityIndicator };

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    ...shadow.raised,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: fontSize.section,
    fontWeight: '800',
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  closeRow: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  closeLabel: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  memberRowActive: {
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
    color: colors.primary,
    fontWeight: '800',
  },
  comingSoon: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  comingSoonIcon: {
    fontSize: 44,
  },
  comingSoonBody: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoIcon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
