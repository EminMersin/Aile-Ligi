import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/forms';
import { SheetModal } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { AppHeader, Card, ListRow, PrimaryButton, Screen, SectionTitle } from '@/components/ui';
import { APP_VERSION } from '@/constants/config';
import { isDemoMode } from '@/data';
import { t, type TranslationKey } from '@/i18n';
import { goBack } from '@/lib/navigation';
import { fontSize, radius, spacing, useColors, type ThemeColors } from '@/theme';

/** Sık sorulan sorular: soru ve cevap anahtarları. */
const FAQ: { question: TranslationKey; answer: TranslationKey }[] = [
  { question: 'support.faq1Q', answer: 'support.faq1A' },
  { question: 'support.faq2Q', answer: 'support.faq2A' },
  { question: 'support.faq3Q', answer: 'support.faq3A' },
  { question: 'support.faq4Q', answer: 'support.faq4A' },
  { question: 'support.faq5Q', answer: 'support.faq5A' },
  { question: 'support.faq6Q', answer: 'support.faq6A' },
];

/** Destek: yardım ve S.S.S. (açılır-kapanır sorular), geri bildirim ve uygulama bilgisi. */
export default function SupportScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const toast = useToast();

  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSend = () => {
    if (feedback.trim().length < 5) {
      setError(t('support.feedbackEmpty'));
      return;
    }
    setError(null);
    setFeedback('');
    setFeedbackOpen(false);
    toast(t('settings.feedbackSent'), 'success');
  };

  return (
    <Screen>
      <AppHeader title={t('settings.support')} onBack={() => goBack()} />

      <SectionTitle title={t('settings.help')} />
      {FAQ.map((item, index) => {
        const open = openIndex === index;
        return (
          <Card
            key={item.question}
            style={styles.faqCard}
            onPress={() => setOpenIndex(open ? null : index)}
          >
            <View style={styles.faqHeader}>
              <View style={styles.faqBadge}>
                <Text style={styles.faqBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.faqQuestion}>{t(item.question)}</Text>
              <Text style={styles.faqToggle}>{open ? '−' : '+'}</Text>
            </View>
            {open ? <Text style={styles.faqAnswer}>{t(item.answer)}</Text> : null}
          </Card>
        );
      })}

      <SectionTitle title={t('settings.feedback')} />
      <ListRow
        icon="💬"
        title={t('settings.feedback')}
        subtitle={t('support.feedbackPlaceholder')}
        tone="mint"
        onPress={() => {
          setError(null);
          setFeedbackOpen(true);
        }}
      />

      <Card style={styles.appCard}>
        <Text style={styles.appTitle}>{t('auth.appName')}</Text>
        <Text style={styles.appMeta}>
          {t('settings.version')} {APP_VERSION} · {isDemoMode ? t('common.demoMode') : t('settings.dataModeSupabase')}
        </Text>
        <Text style={styles.appMeta}>{t('auth.tagline')}</Text>
        <Text style={styles.appNote}>
          {t('settings.madeWith')} ❤️
        </Text>
      </Card>

      <SheetModal
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title={t('settings.feedback')}
        subtitle={t('support.feedbackNote')}
      >
        <Field
          label={t('support.feedbackLabel')}
          value={feedback}
          onChangeText={setFeedback}
          placeholder={t('support.feedbackPlaceholder')}
          autoCapitalize="sentences"
          multiline
          error={error}
        />
        <PrimaryButton label={t('settings.feedback')} icon="📨" onPress={handleSend} />
      </SheetModal>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  faqCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  faqBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: '900',
    color: colors.primaryDeep,
  },
  faqQuestion: {
    flex: 1,
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: colors.text,
  },
  faqToggle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    width: 20,
    textAlign: 'center',
  },
  faqAnswer: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  appCard: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: 4,
  },
  appTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '900',
    color: colors.text,
  },
  appMeta: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  appNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
