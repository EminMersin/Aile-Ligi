import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { QueryClient, focusManager, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { FamilyState, Member, Session } from '@/types/models';

import { isDemoMode, repository } from './index';
import { REALTIME_TABLES } from './supabaseRepository';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 3000,
      // Uygulama/sekme öne geldiğinde veriyi tazele. Bu olmadan, bir sekmede
      // (ör. Aile ve üyeler) yapılan değişiklikler diğer ekranlarda bayat
      // kalabiliyordu.
      refetchOnWindowFocus: true,
    },
  },
});

/**
 * react-query'nin "odak" sinyalini uygulamaya bağlar:
 *   - Native tarafta: AppState (uygulama arka plandan öne geldiğinde).
 *   - Web'de: tarayıcı zaten window focus olaylarını otomatik dinler.
 * Kök layout'ta bir kez çağrılır; odağa dönüşte bayat sorgular yenilenir.
 */
export function useQueryFocusSync() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);
}

export const SESSION_KEY = ['session'] as const;
export const FAMILY_KEY = ['family'] as const;

/** Cihazdaki oturum. */
export function useSession() {
  return useQuery<Session | null>({
    queryKey: SESSION_KEY,
    queryFn: () => repository.getSession(),
    staleTime: 0,
  });
}

/** Ailenin tüm verisi (üyeler, görevler, cezalar, ödüller, ayarlar…). */
export function useFamilyState() {
  const session = useSession();
  return useQuery<FamilyState>({
    queryKey: FAMILY_KEY,
    queryFn: () => repository.loadState(),
    enabled: !!session.data,
    // Veri her değişimde (ekran geçişi, uygulama öne geliş) arka planda
    // tazelenir; bir ekranda yapılan üyelik değişikliği diğer ekranlarda
    // bayat kalmasın.
    staleTime: 0,
  });
}

/** Oturumdaki kişinin kendi üye kaydı. */
export function useCurrentMember(state?: FamilyState): Member | null {
  const session = useSession();
  return useMemo(() => {
    if (!state || !session.data) return null;
    return state.members.find((m) => m.id === session.data?.memberId) ?? null;
  }, [state, session.data]);
}

/** Oturumdaki kişi aile yöneticisi (ebeveyn) mi? */
export function useIsParent(): boolean {
  const session = useSession();
  return session.data?.role === 'parent';
}

/** Veriyi tazeler (aşağı çekip yenileme). */
export function useRefresh() {
  const client = useQueryClient();
  return async () => {
    await client.invalidateQueries({ queryKey: FAMILY_KEY });
  };
}

function useRunAction() {
  const client = useQueryClient();
  return async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      const result = await fn();
      await client.invalidateQueries({ queryKey: FAMILY_KEY });
      return result;
    } catch (error) {
      throw mapError(error);
    }
  };
}

/** Oturum işlemleri: kayıt, giriş, çıkış. */
export function useSessionActions() {
  const client = useQueryClient();
  const reset = async (session: Session | null) => {
    await client.cancelQueries();
    client.setQueryData(SESSION_KEY, session);
    await client.invalidateQueries({ queryKey: FAMILY_KEY });
  };

  return useMemo(
    () => ({
      createFamily: async (input: Parameters<typeof repository.createFamily>[0]) => {
        const session = await repository.createFamily(input).catch((e) => {
          throw mapError(e);
        });
        await reset(session);
        return session;
      },
      signInParent: async (email: string, password: string) => {
        const session = await repository.signInParent(email, password).catch((e) => {
          throw mapError(e);
        });
        await reset(session);
        return session;
      },
      signOut: async () => {
        await repository.signOut();
        await reset(null);
      },
    }),
    [client],
  );
}

/** Tüm veri değiştirme işlemleri. Her işlem sonrası ekranlar kendini yeniler. */
export function useActions() {
  const run = useRunAction();

  return useMemo(
    () => ({
      // Görevler ve puanlar
      completeTask: (taskId: string, memberId: string) => run(() => repository.completeTask(taskId, memberId)),
      requestPenalty: (taskId: string, memberId: string, note?: string | null) =>
        run(() => repository.requestPenalty(taskId, memberId, note)),
      reviewPenalty: (requestId: string, approve: boolean) =>
        run(() => repository.reviewPenalty(requestId, approve)),
      adjustPoints: (memberId: string, delta: number, title: string) =>
        run(() => repository.adjustPoints(memberId, delta, title)),
      resetWeekly: () => run(() => repository.resetWeekly()),
      // Görev kataloğu
      saveTask: (input: Parameters<typeof repository.saveTask>[0]) => run(() => repository.saveTask(input)),
      deleteTask: (id: string) => run(() => repository.deleteTask(id)),
      // Ödüller
      saveReward: (input: Parameters<typeof repository.saveReward>[0]) => run(() => repository.saveReward(input)),
      deleteReward: (id: string) => run(() => repository.deleteReward(id)),
      redeemReward: (rewardId: string, memberId: string) =>
        run(() => repository.redeemReward(rewardId, memberId)),
      // Üyeler
      saveMember: (input: Parameters<typeof repository.saveMember>[0]) => run(() => repository.saveMember(input)),
      deleteMember: (id: string) => run(() => repository.deleteMember(id)),
      forceUnlinkMember: (id: string) => run(() => repository.forceUnlinkMember(id)),
      // Planlı görevler
      savePlannedTask: (input: Parameters<typeof repository.savePlannedTask>[0]) =>
        run(() => repository.savePlannedTask(input)),
      deletePlannedTask: (id: string) => run(() => repository.deletePlannedTask(id)),
      completePlannedTask: (plannedTaskId: string, memberId: string, date: string) =>
        run(() => repository.completePlannedTask(plannedTaskId, memberId, date)),
      // Aile
      updateFamily: (patch: Parameters<typeof repository.updateFamily>[0]) =>
        run(() => repository.updateFamily(patch)),
      rotateCode: () => run(() => repository.rotateCode()),
      // Alışveriş
      addShoppingItem: (title: string, quantity?: string | null) =>
        run(() => repository.addShoppingItem(title, quantity)),
      toggleShoppingItem: (id: string, isDone: boolean, memberId?: string | null) =>
        run(() => repository.toggleShoppingItem(id, isDone, memberId)),
      deleteShoppingItem: (id: string) => run(() => repository.deleteShoppingItem(id)),
      clearDoneShopping: () => run(() => repository.clearDoneShopping()),
      finishShopping: (memberId: string | null) => run(() => repository.finishShopping(memberId)),
    }),
    [run],
  );
}

/**
 * Supabase modunda: ailedeki herhangi bir cihaz veri değiştirdiğinde
 * ekranlar kendiliğinden güncellenir.
 */
export function useRealtimeSync(familyId?: string) {
  const client = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();
    if (isDemoMode || !supabase || !familyId) return;

    // supabase.channel(topic) aynı isimli bir kanal zaten varsa onu döndürür;
    // önceki kanal henüz kaldırılmadıysa (ör. hızlı ekran geçişleri veya
    // geliştirme modunda çift efekt çalışması) subscribe() sonrası .on()
    // eklemeye çalışıp "cannot add postgres_changes callbacks after
    // subscribe()" hatası fırlatır. Önce varsa temizliyoruz.
    const topic = `aile-${familyId}`;
    const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase.channel(topic);
    for (const table of REALTIME_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` },
        () => {
          void client.invalidateQueries({ queryKey: FAMILY_KEY });
        },
      );
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, familyId]);
}

/** Demo modunda gösterilen bilgi notunu bir kez hatırlamak için. */
const DEMO_NOTICE_KEY = 'aile-ligi-demo-notice-v1';

export async function shouldShowDemoNotice(): Promise<boolean> {
  if (!isDemoMode) return false;
  const seen = await AsyncStorage.getItem(DEMO_NOTICE_KEY);
  return seen !== '1';
}

export async function markDemoNoticeSeen(): Promise<void> {
  await AsyncStorage.setItem(DEMO_NOTICE_KEY, '1');
}
