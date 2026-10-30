import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPicker, Field } from '@/components/forms';
import { AppHeader, Card, PrimaryButton, Screen } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useSessionActions } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { isEmailValid } from '@/lib/utils';
import { fontSize, spacing, useColors, type ThemeColors } from '@/theme';

/** Aile yöneticisi kaydı: aile burada oluşturulur ve 6 haneli kod üretilir. */
export default function ParentSignUpScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const toast = useToast();
  const { createFamily } = useSessionActions();

  const [parentName, setParentName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [avatar, setAvatar] = useState('👨');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (parentName.trim().length < 2) {
      setError(t('auth.nameRequired'));
      return;
    }
    if (familyName.trim().length < 2) {
      setError(t('auth.familyNameRequired'));
      return;
    }
    if (!isEmailValid(email)) {
      setError(t('auth.emailInvalid'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordShort'));
      return;
    }
    if (password !== passwordAgain) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createFamily({
        parentName: parentName.trim(),
        familyName: familyName.trim(),
        email: email.trim(),
        password,
        avatar,
      });
      toast(t('auth.familyCreated'), 'success');
      router.replace('/family-code');
    } catch (e) {
      setError(messageForError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title={t('auth.createFamily')}
        subtitle={t('auth.parentEntryDesc')}
        onBack={() => goBack()}
      />

      <Card style={{ marginBottom: spacing.lg }}>
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <Field label={t('auth.parentName')} value={parentName} onChangeText={setParentName} autoCapitalize="words" />
        <Field
          label={t('auth.familyName')}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder={t('auth.familyNamePlaceholder')}
          autoCapitalize="words"
        />
        <Field
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          placeholder="ornek@eposta.com"
          keyboardType="email-address"
        />
        <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />
        <Field
          label={t('auth.passwordAgain')}
          value={passwordAgain}
          onChangeText={setPasswordAgain}
          secureTextEntry
          error={error}
        />
      </Card>

      <PrimaryButton label={t('auth.createFamily')} onPress={handleCreate} loading={busy} icon="🏠" />

      <Pressable onPress={() => router.replace('/(auth)/parent-sign-in')} style={styles.linkWrapper}>
        <Text style={styles.link}>{t('auth.haveAccount')}</Text>
      </Pressable>

      <View style={styles.spacer} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
