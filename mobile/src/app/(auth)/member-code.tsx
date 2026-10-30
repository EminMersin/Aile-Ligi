import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader, Card, PrimaryButton, Screen } from '@/components/ui';
import { isDemoMode, repository } from '@/data';
import { joinCache } from '@/data/joinCache';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { normalizeCode } from '@/lib/utils';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/** Aile üyesi girişi 1. adım: 6 haneli aile kodu. */
export default function MemberCodeScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const digits = code.padEnd(6, ' ').split('').slice(0, 6);
  const ready = code.length === 6;

  const handleContinue = async () => {
    if (!ready) {
      setError(t('error.codeRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const lookup = await repository.lookupFamilyByCode(code);
      joinCache.set(code, lookup);
      router.push('/(auth)/member-join');
    } catch (e) {
      setError(messageForError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader title={t('auth.memberEntry')} subtitle={t('auth.memberEntryDesc')} onBack={() => goBack()} />

      <Card style={styles.card}>
        <Text style={styles.label}>{t('auth.codeLabel')}</Text>

        <Pressable style={styles.codeRow} onPress={() => inputRef.current?.focus()}>
          {digits.map((digit, index) => (
            <View key={index} style={[styles.codeBox, digit.trim() && styles.codeBoxFilled]}>
              <Text style={styles.codeDigit}>{digit.trim()}</Text>
            </View>
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(text) => {
            setCode(normalizeCode(text));
            setError(null);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={styles.hiddenInput}
          caretHidden
        />

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.hint}>{isDemoMode ? t('error.demoCodeOnly') : t('auth.codeHint')}</Text>
        )}
      </Card>

      <PrimaryButton label={t('auth.continueBtn')} onPress={handleContinue} disabled={!ready} loading={busy} />

      <Text style={styles.footer}>{t('auth.codeFirst')}</Text>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.section,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeBox: {
    width: 46,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  codeDigit: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.01,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
  error: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontWeight: '700',
  },
  footer: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
