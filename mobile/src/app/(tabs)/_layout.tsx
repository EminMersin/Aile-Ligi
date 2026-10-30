import { Redirect, Tabs, useSegments } from 'expo-router';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { ErrorState, LoadingState } from '@/components/ui';
import { repository } from '@/data';
import { useFamilyState, useRealtimeSync, useRefresh, useSession } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';
import { useColors } from '@/theme';
import { useEffect } from 'react';

/** Alt menü (sekmeler). Yönetici olmayan üyeler "Aile Yöneticisi" sekmesini görmez. */
export default function TabsLayout() {
  const colors = useColors();
  const session = useSession();
  const family = useFamilyState();
  const refresh = useRefresh();
  const segments = useSegments();
  useRealtimeSync(family.data?.family.id);

  // Sekme değiştiğinde veriyi arka planda tazele: bir ekranda yapılan
  // değişiklik (ör. üye adı düzenleme) diğer sekmelerde bayat kalmasın.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.join('/')]);

  if (session.isLoading) return <LoadingState label={t('common.loading')} />;
  if (session.isError) {
    return (
      <ErrorState
        message={messageForError(session.error)}
        retryLabel={t('auth.signOut')}
        onRetry={() => repository.signOut().finally(() => session.refetch())}
      />
    );
  }
  if (!session.data) return <Redirect href="/(auth)/welcome" />;
  if (family.isError) {
    return (
      <ErrorState
        message={messageForError(family.error)}
        retryLabel={t('auth.signOut')}
        onRetry={() => repository.signOut().finally(() => session.refetch())}
      />
    );
  }

  const isParent = session.data.role === 'parent';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
      tabBar={(props) => (
        <FloatingTabBar
          state={props.state}
          navigation={props.navigation}
          hidden={isParent ? [] : ['admin']}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="weekly" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="admin" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
