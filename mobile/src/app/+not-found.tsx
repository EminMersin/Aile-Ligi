import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/ui';
import { t } from '@/i18n';
import { fontSize, spacing, useColors, type ThemeColors } from '@/theme';

/** Var olmayan bir yola girildiğinde gösterilen sayfa bulunamadı ekranı. */
export default function NotFoundScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <Text style={styles.icon}>😕</Text>
        <Text style={styles.title}>{t('notFound.title')}</Text>
        <Text style={styles.description}>{t('notFound.description')}</Text>
        <PrimaryButton
          label={t('nav.home')}
          icon="🏠"
          onPress={() => router.replace('/(tabs)')}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
