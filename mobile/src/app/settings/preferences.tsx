import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import * as Notifications from 'expo-notifications';

import { ChoiceRow, Stepper, ToggleRow } from '@/components/forms';
import { ComingSoonSheet, InfoSheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import {
  AppHeader,
  Card,
  ErrorState,
  ListRow,
  LoadingState,
  Pill,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { APP_BUILD_VERSION, IS_OTA_RUNNING, RUNNING_UPDATE_ID } from '@/lib/updates';
import { isDemoMode } from '@/data';
import { useActions, useCurrentMember, useFamilyState, useIsParent, useRefresh } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import {
  getNotificationsEnabled,
  getSoundsEnabled,
  setNotificationsEnabled,
  setSoundsEnabled,
} from '@/lib/devicePrefs';
import { ensureNotificationSetup, reschedulePlannedTaskReminders } from '@/lib/notifications';
import { todayISO } from '@/lib/utils';
import { fontSize, spacing, useColors, useTheme, type ThemeColors, type ThemeMode } from '@/theme';
import type { FamilySettings } from '@/types/models';

type SheetKind = 'language' | 'backup' | 'recap' | 'about';

/** Uygulama ve tercihler: dil, tema, sesler, alışveriş puanı, yedekleme ve uygulama bilgisi. */
export default function PreferencesSettingsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const { mode, setMode } = useTheme();
  const toast = useToast();
  const isParent = useIsParent();
  const actions = useActions();
  const { data, isLoading, isError, refetch, isRefetching } = useFamilyState();
  const currentMember = useCurrentMember(data);
  const refresh = useRefresh();

  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [notifPermission, setNotifPermission] = useState<boolean | null>(null);
  const [soundsOn, setSoundsOn] = useState(true);
  const [notifOn, setNotifOn] = useState(false);

  // Cihaz seviyesi tercihleri (sesler, bildirimler) yukle
  useEffect(() => {
    let mounted = true;
    void getSoundsEnabled().then((v) => {
      if (mounted) setSoundsOn(v);
    });
    void getNotificationsEnabled().then((v) => {
      if (mounted) setNotifOn(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Bildirim izni durumunu uygulama öne geldiğinde yenile (cihaz ayarlarından
  // değişmiş olabilir).
  useEffect(() => {
    let mounted = true;
    void ensureNotificationSetup()
      .then((granted) => {
        if (mounted) setNotifPermission(granted);
      })
      .catch(() => {
        if (mounted) setNotifPermission(false);
      });
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void Notifications.getPermissionsAsync().then((perm) => {
          if (mounted) setNotifPermission(perm.status === 'granted');
        });
      }
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

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

  const { settings } = data.family;

  const saveSetting = async (patch: Partial<FamilySettings>) => {
    try {
      await actions.updateFamily({ settings: patch });
      toast(t('settings.prefSaved'), 'success');
    } catch (e) {
      toast(messageForError(e), 'error');
    }
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refresh()}>
      <AppHeader
        title={t('settings.preferences')}
        subtitle={data.family.name}
        onBack={() => goBack()}
      />

      <SectionTitle title={t('settings.language')} />
      <ListRow
        icon="🌐"
        title={t('settings.language')}
        subtitle={t('settings.languageTr')}
        onPress={() => setSheet('language')}
        right={<Pill label={t('common.soon')} tone="gold" />}
      />

      <SectionTitle title={t('settings.theme')} />
      <Card>
        <ChoiceRow<ThemeMode>
          label={t('settings.theme')}
          value={mode}
          onChange={(value) => setMode(value)}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
      </Card>

      <SectionTitle title={t('settings.sounds')} />
      <Card>
        <ToggleRow
          label={t('settings.sounds')}
          description={t('settings.soundsDesc')}
          value={soundsOn}
          onChange={(value) => {
            setSoundsOn(value);
            void setSoundsEnabled(value);
          }}
        />
        <View style={styles.divider} />
        <ToggleRow
          label={t('settings.notifications')}
          description={
            notifPermission === false
              ? t('settings.notificationsDenied')
              : settings.notificationsEnabled
                ? t('settings.notificationsEnabled')
                : t('settings.notificationsAllowedDesc')
          }
          value={notifOn && notifPermission !== false}
          onChange={async (value) => {
            try {
              if (value) {
                const granted = await ensureNotificationSetup();
                setNotifPermission(granted);
                if (!granted) {
                  toast(t('settings.notificationsDenied'), 'error');
                  return;
                }
                setNotifOn(true);
                await setNotificationsEnabled(true);
                await reschedulePlannedTaskReminders(
                  data.plannedTasks,
                  true,
                  todayISO(),
                  currentMember?.id,
                );
                toast(t('settings.notificationsEnabled'), 'success');
              } else {
                try {
                  await reschedulePlannedTaskReminders([], false, todayISO());
                } finally {
                  await setNotificationsEnabled(false);
                  setNotifOn(false);
                }
              }
            } catch (e) {
              toast(messageForError(e), 'error');
            }
          }}
        />
      </Card>

      {isParent ? (
        <>
          <SectionTitle title={t('settings.shoppingPoints')} />
      <Card>
        <ToggleRow
          label={t('settings.shoppingPoints')}
          description={t('settings.shoppingPointsDesc')}
          value={settings.shoppingPointsEnabled}
          onChange={(value) => void saveSetting({ shoppingPointsEnabled: value })}
        />
        {settings.shoppingPointsEnabled ? (
          <>
            <View style={styles.divider} />
            <Stepper
              label={t('settings.shoppingPointsValue')}
              value={settings.shoppingPointsValue}
              onChange={(value) => void saveSetting({ shoppingPointsValue: value })}
              step={5}
              min={5}
              max={100}
            />
          </>
        ) : null}
      </Card>

        </>
      ) : null}

      <SectionTitle title={t('settings.about')} />
      <ListRow
        icon="☁️"
        title={t('settings.backup')}
        tone="plus"
        onPress={() => setSheet('backup')}
        right={<Pill label={t('common.soon')} tone="gold" />}
      />
      <ListRow
        icon="📸"
        title={t('settings.recap')}
        tone="pink"
        onPress={() => setSheet('recap')}
        right={<Pill label={t('common.soon')} tone="gold" />}
      />
      <ListRow
        icon="ℹ️"
        title={t('settings.about')}
        subtitle={t('auth.appName')}
        onPress={() => setSheet('about')}
      />
      <ListRow
        icon="🏷️"
        title={t('settings.version')}
        right={<Text style={styles.valueText}>{APP_BUILD_VERSION}</Text>}
      />
      <ListRow
        icon="🔄"
        title={t('settings.updateStatus')}
        subtitle={
          IS_OTA_RUNNING
            ? t('settings.updateOTA', { id: RUNNING_UPDATE_ID.slice(0, 8) })
            : t('settings.updateEmbedded')
        }
      />
      <ListRow
        icon="🔌"
        title={t('settings.dataMode')}
        subtitle={isDemoMode ? t('settings.dataModeDemo') : t('settings.dataModeSupabase')}
      />

      {isDemoMode ? <Text style={styles.demoNote}>{t('common.demoModeNote')}</Text> : null}

      <ComingSoonSheet
        visible={sheet === 'language'}
        onClose={() => setSheet(null)}
        title={t('settings.language')}
        body={t('settings.languageNote')}
        icon="🌐"
      />
      <ComingSoonSheet
        visible={sheet === 'backup'}
        onClose={() => setSheet(null)}
        title={t('settings.backup')}
        body={t('settings.backupComingSoon')}
        icon="☁️"
      />
      <ComingSoonSheet
        visible={sheet === 'recap'}
        onClose={() => setSheet(null)}
        title={t('settings.recap')}
        body={t('settings.recapComingSoon')}
        icon="📸"
      />
      <InfoSheet
        visible={sheet === 'about'}
        onClose={() => setSheet(null)}
        title={t('settings.about')}
        body={t('settings.aboutBody')}
        icon="ℹ️"
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  valueText: {
    fontSize: fontSize.body,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  demoNote: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
