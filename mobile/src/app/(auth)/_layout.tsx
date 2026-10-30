import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/data/hooks';
import { useColors } from '@/theme';

/** Giriş ekranları: oturum açılmışsa doğrudan sekmelere gider. */
export default function AuthLayout() {
  const session = useSession();
  const colors = useColors();

  if (session.data) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
