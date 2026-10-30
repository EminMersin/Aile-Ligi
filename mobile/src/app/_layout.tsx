import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { ToastProvider } from '@/components/Toast';
import { queryClient, useFamilyState, useQueryFocusSync, useSession } from '@/data/hooks';
import { usePlannedTaskRemindersSync } from '@/lib/notifications';
import { useBackgroundUpdateCheck } from '@/lib/updates';
import { ThemeProvider, useColors, useTheme } from '@/theme';

function RootStack() {
  const colors = useColors();
  const { scheme } = useTheme();
  useQueryFocusSync();
  const family = useFamilyState();
  const session = useSession();
  const currentMemberId = session.data?.memberId ?? null;
  usePlannedTaskRemindersSync(family.data, currentMemberId);
  useBackgroundUpdateCheck();
  return (
    <ToastProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </ToastProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <RootStack />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
