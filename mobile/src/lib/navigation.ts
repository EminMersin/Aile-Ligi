import { router, type Href } from 'expo-router';

/**
 * Güvenli geri dönüş.
 *
 * Ekran doğrudan açıldığında (derin bağlantı, web'de sayfa yenileme veya
 * kayıt sonrası yönlendirme) geri gidilecek bir ekran olmayabilir. Bu durumda
 * "GO_BACK was not handled by any navigator" hatası oluşur ve geri butonu
 * çalışmaz. Geçmiş yoksa ana ekrana yönlendiriyoruz.
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
