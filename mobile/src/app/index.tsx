import { Redirect } from 'expo-router';

import { ErrorState, LoadingState } from '@/components/ui';
import { repository } from '@/data';
import { useSession } from '@/data/hooks';
import { t } from '@/i18n';
import { messageForError } from '@/lib/errors';

/** Açılış yönlendirmesi: oturum varsa sekmelere, yoksa giriş ekranına. */
export default function Index() {
  const session = useSession();

  if (session.isLoading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (session.isError) {
    return (
      <ErrorState
        message={messageForError(session.error)}
        retryLabel={t('auth.signOut')}
        onRetry={() => repository.signOut().finally(() => session.refetch())}
      />
    );
  }

  return <Redirect href={session.data ? '/(tabs)' : '/(auth)/welcome'} />;
}
