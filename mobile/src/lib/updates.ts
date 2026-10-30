import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Açık yapılandırma: geliştirme ve OTA'nın gerçekten çalıştığı üretim derlemeleri
 * arasında ayrım yapmak için kullanılır (yalnızca __DEV__ değil; __DEV__ her ikisinde
 * de doğru olabilir çünkü OTA, geliştirme derlemelerinde de çalışır).
 */
const IS_DEV_SERVER = __DEV__ || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Uygulama sürümü (gösterim için; app.json 'version' alanından gelir). */
export const APP_BUILD_VERSION: string = Constants.expoConfig?.version ?? '1.0.0';
/** Yerel olarak çalışan güncellemenin kimliği (yoksa 'gömülü'). */
export const RUNNING_UPDATE_ID: string = Updates.updateId ?? 'gömülü';
/** OTA güncellemesinin yüklü olup olmadığı (embedded vs downloaded). */
export const IS_OTA_RUNNING: boolean = Updates.isEmbeddedLaunch === false;

/** Uygulama güncellemelerini yöneten küçük katman (yalnızca OTA, mağaza sürümleri değil). */
export function useAppUpdateManager() {
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();
  const actionsRef = useRef({ checking, downloading });
  actionsRef.current = { checking, downloading };

  const checkAndApply = useCallback(async () => {
    if (actionsRef.current.checking || actionsRef.current.downloading) return;
    setChecking(true);
    try {
      await Updates.checkForUpdateAsync();
      if (isUpdateAvailable) {
        setChecking(false);
        setDownloading(true);
        await Updates.fetchUpdateAsync();
        if (!isUpdatePending) {
          // fetchUpdateAsync bazen pending durumunu senkron döndürmez; kendimiz
          // kontrol edip gerekirse yeniden başlatıyoruz.
          await Updates.reloadAsync();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Güncelleme kontrolü başarısız:', e);
      return false;
    } finally {
      setChecking(false);
      setDownloading(false);
    }
  }, [isUpdateAvailable, isUpdatePending]);

  // isUpdatePending → downloaded, yeniden başlat
  useEffect(() => {
    if (isUpdatePending && !actionsRef.current.downloading) {
      void Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  return { checking, downloading, checkAndApply, isUpdateAvailable, isUpdatePending };
}

/** Uygulama ilk açılışta arka planda bir kez güncelleme kontrolü yapar (geliştirme sunucusu hariç). */
export function useBackgroundUpdateCheck() {
  const { checking, checkAndApply } = useAppUpdateManager();
  useEffect(() => {
    if (IS_DEV_SERVER) return;
    const t = setTimeout(() => void checkAndApply(), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return checking;
}