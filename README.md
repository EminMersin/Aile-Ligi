# aile-ligi-gizlilik-politikasi
Aile Ligi gizlilik politikası

## Uygulama kaynak kodu

- `mobile/`: Expo / React Native mobil uygulaması ve görselleri.
- `supabase/migrations/`: Veritabanı tabloları, güvenlik kuralları ve fonksiyonlar.
- `docs/referans-ekranlar/`: Tasarım referansları.
- Kök klasördeki PNG dosyaları: Uygulama ekran görüntüleri ve mağaza görselleri.
- `index.html` ve `aile-ligi-gizlilik-politikasi.html`: Gizlilik politikası sayfaları.

## Yerel çalıştırma

```bash
cd mobile
npm ci
cp .env.example .env
npm start
```

Supabase kullanmak için `.env` içindeki URL ve istemciye açık anonim anahtarı kendi projenizin değerleriyle doldurun. Bu değerler boşsa uygulama demo modunda çalışır. Supabase kurulumunda `supabase/migrations/` dosyalarını numara sırasıyla uygulayın.

Tür kontrolü: `cd mobile && npm run typecheck`.

Android derlemesi için `mobile/build-android.sh` kullanılabilir. EAS profilleri yerel imzalama bilgileri bekler; `credentials.json` ve imzalama anahtarı güvenli yedekten ayrıca sağlanmalıdır. Ortam dosyaları, imzalama anahtarları, bağımlılıklar ve derleme çıktıları depoya dahil değildir.
