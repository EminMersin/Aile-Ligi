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

## Web yayını ve Chrome kurulumu

Web uygulaması kaynak klasörü veya kökteki `index.html` doğrudan yayınlanarak çalışmaz. Alan adında yayınlanması gereken klasör Expo'nun ürettiği `mobile/dist` klasörüdür.

```bash
cd mobile
npm ci
npm run typecheck
npm run build:web
```

Cloudflare Pages kullanılıyorsa:

- Production branch: `main`
- Root directory: `mobile`
- Build command: `npm run typecheck && npm run build:web`
- Build output directory: `dist`
- Build environment: `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` (uygulamanın mevcut Supabase projesinin istemciye açık değerleri)
- Custom domain: `aileligi.narvaai.com`

Workers Static Assets kullanılıyorsa aynı üretim çıktısı statik varlık dizini olarak seçilmelidir. Tüm depo kökünü yayınlamayın.

`npm run build:web` web çıktısını doğrular; manifest, simgeler, uygulama açılışı, giriş yolları veya gizlilik sayfası eksikse başarısız olur. `.env` ve imzalama anahtarları yayın klasörüne kopyalanmamalıdır. Supabase service-role anahtarı hiçbir `EXPO_PUBLIC_*` değişkeninde kullanılmamalıdır.

Yayın sonrasında `/` uygulamayı, `/manifest.json` yükleme tanımını, `/aile-ligi-gizlilik-politikasi.html` gizlilik politikasını açmalıdır. Chrome'da menüden yükleme yapılabilir. Web sürümü internet bağlantısı gerektirir; çevrimdışı kullanım ve yerel Android bildirimleri web sürümünün kapsamına dahil değildir.
