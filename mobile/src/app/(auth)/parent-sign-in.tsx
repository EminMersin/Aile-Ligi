import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/forms';
import { AppHeader, PrimaryButton, Screen } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { isDemoMode } from '@/data';
import { useSessionActions } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { isEmailValid } from '@/lib/utils';
import { fontSize, spacing, useColors, type ThemeColors } from '@/theme';

/** Aile yöneticisi girişi (e-posta + şifre). */
export default function ParentSignInScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const { signInParent } = useSessionActions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!isEmailValid(email)) {
      setError(t('auth.emailInvalid'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordShort'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signInParent(email.trim(), password);
      toast(t('auth.parentEntry'), 'success');
    } catch (e) {
      setError(messageForError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader title={t('auth.parentEntry')} subtitle={t('auth.parentEntryDesc')} onBack={() => goBack()} />

      <Field
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@eposta.com"
        keyboardType="email-address"
      />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />

      {isDemoMode ? <Text style={styles.demoHint}>{t('auth.demoSignInNote')}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={t('auth.signIn')} onPress={handleSignIn} loading={busy} tone="primary" />

      <Pressable onPress={() => router.replace('/(auth)/parent-sign-up')} style={styles.linkWrapper}>
        <Text style={styles.link}>{t('auth.noAccount')}</Text>
      </Pressable>

      <View style={styles.spacer} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  demoHint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  error: {
    fontSize: fontSize.label,
    color: colors.penaltyDeep,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  linkWrapper: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  link: {
    fontSize: fontSize.body,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
  spacer: {
    height: spacing.xxl,
  },
});
