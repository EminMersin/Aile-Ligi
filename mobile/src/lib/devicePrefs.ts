import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cihaz seviyesi kullanıcı tercihleri (tema dışında): sesler ve bildirimler.
 * Bunlar aile ayarı DEĞİLDİR; her cihazda/hesapta bağımsız yaşar ve hem
 * ebeveyn hem çocuk kullanıcılar değiştirebilir. (Aile ayarları Supabase'de
 * yalnızca ebeveyn tarafından güncellenebilir.)
 */

const SOUNDS_KEY = 'aile-ligi-sounds-enabled-v1';
const NOTIF_KEY = 'aile-ligi-notifications-enabled-v1';

export async function getSoundsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SOUNDS_KEY);
  return raw === null ? true : raw === '1';
}

export async function setSoundsEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(SOUNDS_KEY, value ? '1' : '0');
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NOTIF_KEY);
  return raw === '1';
}

export async function setNotificationsEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIF_KEY, value ? '1' : '0');
}
