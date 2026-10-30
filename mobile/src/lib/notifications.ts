import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { t } from '@/i18n';
import { getNotificationsEnabled } from '@/lib/devicePrefs';
import { todayISO } from '@/lib/utils';
import type { PlannedTask } from '@/types/models';

const CHANNEL_ID = 'aile-ligi-hatirlatmalar';

// Ön plan bildirimleri: uygulama açıkken de bildirimlerin görünmesi için
// handler zorunludur. Bu olmadan Android'de bildirimler yalnızca uygulama
// arka plandayken gösterilir (kullanıcı 'bildirim gelmiyor' derdi).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android bildirim kanalı + izin isteme. true = izin verildi. */
export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Görev hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

/** "18:30" biçimindeki saati bugünün Date nesnesine çevirir; geçersizse null. */
function dueDateForToday(dueTime: string, todayISO: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(dueTime.trim());
  if (!match) return null;
  const [year, month, day] = todayISO.split('-').map(Number);
  const date = new Date(year, month - 1, day, Number(match[1]), Number(match[2]), 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Planlı görevlerin bugünkü hatırlatmalarını zamanlar.
 * Önce tüm zamanlanmış bildirimler temizlenir, sonra uygun olanlar yeniden
 * kurulur — böylece görev ekleme/silme/düzenleme sonrası liste hep günceldir.
 */
export async function reschedulePlannedTaskReminders(
  tasks: PlannedTask[],
  enabled: boolean,
  todayISO: string,
  currentMemberId?: string | null,
): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Bildirimleri temizleyememek kapatmayı engellemesin; yeni zamanlamalar
    // yine de kurulacak (ve kullanıcı kapatınca ayar kaydedilecek).
  }
  if (!enabled) return;

  const now = new Date();
  const today = new Date(`${todayISO}T00:00:00`);
  const todayDow = today.getDay(); // 0 = Pazar

  for (const task of tasks) {
    if (!task.isActive || !task.notify || !task.dueTime) continue;
    // Belirli bir üyeye atanmış görevin bildirimi yalnızca o üyenin cihazında
    // kurulsun (herkese atanmışsa her cihazda kurulur).
    if (currentMemberId && task.assignedMemberId && task.assignedMemberId !== currentMemberId) {
      continue;
    }
    // Haftalık tekrar: weekdays boşsa her gün; doluysa yalnızca seçili günler.
    if (task.weekdays.length > 0 && !task.weekdays.includes(todayDow)) continue;
    // Bugün zaten tamamlandıysa tekrar hatırlatma.
    if (task.lastCompletedDate === todayISO) continue;

    const due = dueDateForToday(task.dueTime, todayISO);
    if (!due || due <= now) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.taskReminderTitle'),
          body: `${task.icon ?? '✅'} ${task.title} · ${task.points} ${t('common.pt')}`,
          sound: true,
          data: { taskId: task.id, kind: 'plannedTask' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: due,
          channelId: CHANNEL_ID,
        },
      });
    } catch (e) {
      // Zamanlama başarısız olursa atla ama sessiz kalma (geliştirme sırasında
      // gerçek nedeni görmek için konsola yaz).
      console.warn('Bildirim zamanlanamadı:', task.title, e);
    }
  }
}

import { useEffect } from 'react';
import type { FamilyState } from '@/types/models';

/**
 * Uygulama öne her geldiğinde planlı görev hatırlatıcılarını yeniden zamanlar.
 * Böylece görevler değiştiğinde, gün değiştiğinde veya bildirimler kapatılıp
 * açıldığında zamanlanmış bildirimler her zaman güncel olur.
 */
export function usePlannedTaskRemindersSync(state?: FamilyState | null, currentMemberId?: string | null) {
  useEffect(() => {
    if (!state) return;
    const sync = () => {
      void getNotificationsEnabled().then((enabled) =>
        reschedulePlannedTaskReminders(state.plannedTasks, enabled, todayISO(), currentMemberId),
      ).catch((e) => console.warn('Bildirim senkronu başarısız:', e));
    };
    sync();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') sync();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
