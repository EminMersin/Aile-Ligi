import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, MAX_CONTENT_WIDTH, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';

export type Tone = 'default' | 'primary' | 'gain' | 'penalty' | 'gold' | 'ai' | 'pink' | 'mint' | 'plus';

const getToneBg = (colors: ThemeColors): Record<Tone, string> => ({
  default: colors.surface,
  primary: colors.primarySoft,
  gain: colors.gainSoft,
  penalty: colors.penaltySoft,
  gold: colors.goldSoft,
  ai: colors.aiSoft,
  pink: colors.pinkSoft,
  mint: colors.mintSoft,
  plus: colors.plusSoft,
});

/* ------------------------------------------------------------------ Ekran */

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  edges = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  edges?: boolean;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const contentStyle: StyleProp<ViewStyle> = [
    styles.screenContent,
    padded && { paddingHorizontal: spacing.lg },
    { maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' },
  ];

  if (!scroll) {
    return (
      <View style={[styles.screen, { paddingTop: edges ? insets.top : 0 }]}>
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: edges ? insets.top : 0 }]}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------- Kart */

export function Card({
  children,
  tone = 'default',
  style,
  onPress,
  bordered = false,
}: {
  children: ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  bordered?: boolean;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  const toneBg = getToneBg(colors);
  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: toneBg[tone] },
    bordered && { borderWidth: 1, borderColor: colors.border },
    style,
  ];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------- Başlıklar */

export function AppHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------- Avatar/Puan */

export function Avatar({
  emoji,
  photo,
  size = 48,
  tone = 'primary',
}: {
  emoji: string;
  photo?: string | null;
  size?: number;
  tone?: Tone;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  const toneBg = getToneBg(colors);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: toneBg[tone],
        },
      ]}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      )}
    </View>
  );
}

export function PointsBadge({ points, size = 'md' }: { points: number; size?: 'sm' | 'md' | 'lg' }) {
  const colors = useColors();
  const styles = createStyles(colors);
  const positive = points >= 0;
  const fontStyle: TextStyle =
    size === 'lg' ? { fontSize: fontSize.title } : size === 'sm' ? { fontSize: fontSize.label } : { fontSize: fontSize.section };
  return (
    <View style={styles.pointsRow}>
      <Text style={[styles.pointsValue, fontStyle, { color: positive ? colors.gainDeep : colors.penaltyDeep }]}>
        {points}
      </Text>
      <Text style={[styles.pointsUnit, size === 'lg' && { fontSize: fontSize.body }]}>puan</Text>
    </View>
  );
}

export function Pill({
  label,
  tone = 'default',
  icon,
  style,
}: {
  label: string;
  tone?: Tone;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  const toneBg = getToneBg(colors);
  const textColor =
    tone === 'gain'
      ? colors.gainDeep
      : tone === 'penalty'
        ? colors.penaltyDeep
        : tone === 'ai'
          ? colors.aiDeep
          : tone === 'gold'
            ? colors.goldDeep
            : tone === 'primary'
              ? colors.primaryDeep
              : colors.textSecondary;
  return (
    <View style={[styles.pill, { backgroundColor: toneBg[tone] }, style]}>
      {icon ? <Text style={styles.pillIcon}>{icon}</Text> : null}
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function IconBadge({ icon, tone = 'primary', size = 44 }: { icon: string; tone?: Tone; size?: number }) {
  const colors = useColors();
  const styles = createStyles(colors);
  const toneBg = getToneBg(colors);
  return (
    <View
      style={[
        styles.iconBadge,
        { width: size, height: size, borderRadius: radius.md, backgroundColor: toneBg[tone] },
      ]}
    >
      <Text style={{ fontSize: size * 0.46 }}>{icon}</Text>
    </View>
  );
}

/* -------------------------------------------------------------- Liste satırı */

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  tone = 'primary',
  destructive = false,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  tone?: Tone;
  destructive?: boolean;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  const body = (
    <View style={styles.row}>
      {icon ? <IconBadge icon={icon} tone={tone} /> : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, destructive && { color: colors.penaltyDeep }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </View>
  );

  if (!onPress) return <View style={styles.rowWrapper}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowWrapper, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

export function Divider() {
  const styles = createStyles(useColors());
  return <View style={styles.divider} />;
}

/* ------------------------------------------------------------------ Butonlar */

export function PrimaryButton({
  label,
  onPress,
  icon,
  tone = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  tone?: 'primary' | 'gain' | 'penalty' | 'ai' | 'muted';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  const background =
    tone === 'gain'
      ? colors.gain
      : tone === 'penalty'
        ? colors.penalty
        : tone === 'ai'
          ? colors.ai
          : tone === 'muted'
            ? colors.surfaceAlt
            : colors.primary;
  const textColor = tone === 'muted' ? colors.textSecondary : colors.textOnDark;

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Text style={styles.buttonIcon}>{icon}</Text> : null}
          <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; icon?: string; tone?: Tone }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  const toneBg = getToneBg(colors);
  return (
    <View style={styles.segmented}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={[styles.segment, active && { backgroundColor: toneBg[tab.tone ?? 'primary'] }]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {tab.icon ? `${tab.icon} ` : ''}
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ Durumlar */

export function EmptyState({ icon, title, description }: { icon: string; title: string; description?: string }) {
  const styles = createStyles(useColors());
  return (
    <Card style={styles.emptyCard} bordered>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </Card>
  );
}

export function LoadingState({ label }: { label: string }) {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.loading}>
      <Text style={styles.emptyIcon}>😕</Text>
      <Text style={styles.loadingLabel}>{message}</Text>
      <PrimaryButton label={retryLabel} onPress={onRetry} tone="primary" style={{ marginTop: spacing.lg }} />
    </View>
  );
}

/* --------------------------------------------------------- Izgara yardımcı */

export function Grid({ children, columns = 2 }: { children: ReactNode; columns?: number }) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.grid}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <View
              key={index}
              style={{
                width: columns === 2 ? '48.5%' : columns === 3 ? '31.5%' : '100%',
              }}
            >
              {child}
            </View>
          ))
        : children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenContent: {
    paddingBottom: 120,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  backIcon: {
    fontSize: 26,
    lineHeight: 30,
    color: colors.text,
    marginTop: -3,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.section,
    fontWeight: '800',
    color: colors.text,
  },
  sectionAction: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.primary,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pointsValue: {
    fontWeight: '800',
  },
  pointsUnit: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pillIcon: {
    fontSize: 13,
  },
  pillText: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowWrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    fontSize: 17,
  },
  buttonLabel: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    ...shadow.card,
  },
  segment: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentLabelActive: {
    color: colors.text,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  loadingLabel: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
