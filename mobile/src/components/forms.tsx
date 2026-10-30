import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { AVATAR_CHOICES, ICON_CHOICES, WEEKDAY_SHORT } from '@/constants/config';
import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  multiline = false,
  error,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  error?: string | null;
  hint?: string;
  maxLength?: number;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        maxLength={maxLength}
        style={[styles.input, multiline && styles.inputMultiline, !!error && styles.inputError]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function EmojiPicker({
  label,
  value,
  onChange,
  options = ICON_CHOICES,
}: {
  label: string;
  value: string;
  onChange: (emoji: string) => void;
  options?: readonly string[];
}) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.emojiGrid}>
        {options.map((emoji) => {
          const active = emoji === value;
          return (
            <Pressable
              key={emoji}
              onPress={() => onChange(emoji)}
              style={[styles.emojiCell, active && styles.emojiCellActive]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return <EmojiPicker label="Avatar seç" value={value} onChange={onChange} options={AVATAR_CHOICES} />;
}

export function WeekdayPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.weekdayRow}>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const active = value.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() =>
                onChange(active ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b))
              }
              style={[styles.weekdayCell, active && styles.weekdayCellActive]}
            >
              <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>{WEEKDAY_SHORT[day]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const styles = createStyles(useColors());
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.choiceCell, active && styles.choiceCellActive]}
            >
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
  badge,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.toggleLabelRow}>
          <Text style={styles.toggleLabel}>{label}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  step = 5,
  min = 0,
  max = 1000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const styles = createStyles(useColors());
  const clamp = (next: number) => Math.min(Math.max(next, min), max);
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
    const next = Number.isFinite(parsed) ? clamp(parsed) : value;
    onChange(next);
    setText(String(next));
  };

  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperButton} onPress={() => onChange(clamp(value - step))}>
          <Text style={styles.stepperSign}>−</Text>
        </Pressable>
        <TextInput
          style={styles.stepperValue}
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Pressable style={styles.stepperButton} onPress={() => onChange(clamp(value + step))}>
          <Text style={styles.stepperSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  fieldWrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fontSize.body,
    color: colors.text,
    ...shadow.card,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.penalty,
  },
  error: {
    fontSize: fontSize.caption,
    color: colors.penaltyDeep,
    marginTop: 6,
    fontWeight: '600',
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiCell: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiCellActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  emojiText: {
    fontSize: 22,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekdayCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayText: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  weekdayTextActive: {
    color: colors.textOnDark,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  choiceCell: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    fontSize: fontSize.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  choiceTextActive: {
    color: colors.textOnDark,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: colors.text,
  },
  toggleDescription: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.goldDeep,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  stepperButton: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 28,
  },
  stepperValue: {
    fontSize: fontSize.section,
    fontWeight: '800',
    color: colors.text,
    minWidth: 64,
    textAlign: 'center',
  },
});
