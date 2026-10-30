import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

/** Ekranın üstünde kısa süre görünen bilgi balonu. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = createStyles(colors);
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() =>
          setToast(null),
        );
      }, 2600);
    },
    [opacity],
  );

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const background =
    toast?.tone === 'success' ? colors.gain : toast?.tone === 'error' ? colors.penalty : colors.text;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity, backgroundColor: background, top: insets.top + spacing.sm }]}
        >
          <Text style={styles.toastText}>
            {toast.tone === 'success' ? '✅ ' : toast.tone === 'error' ? '⚠️ ' : 'ℹ️ '}
            {toast.message}
          </Text>
        </Animated.View>
      ) : (
        <View />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function useToastSafe() {
  return useMemo(() => useContext(ToastContext), []);
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    zIndex: 999,
    ...shadow.raised,
  },
  toastText: {
    color: colors.textOnDark,
    fontSize: fontSize.body,
    fontWeight: '700',
    textAlign: 'center',
  },
});
