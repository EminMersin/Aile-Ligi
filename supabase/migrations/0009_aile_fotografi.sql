-- ============================================================================
-- AİLE LİGİ — 0009: Aile fotoğrafı
--
-- Amaç: Ayarlar > Genel ekranından aile fotoğrafı yükleme ve kaldırma.
-- Fotoğraf cihazda 512 px genişliğe küçültülüp JPEG olarak sıkıştırılır ve
-- base64 "data URI" metni (harf, sayı, +, / karakterlerinden oluşan metin)
-- olarak public.families.photo_url kolonunda tutulur. Kolon 0001 göçünde
-- zaten mevcut olduğu için yeni kolon eklenmez; tek bir aile fotoğrafı
-- ~20-50 KB yer kaplar.
--
-- Bu göç, update_family() fonksiyonunun gövdesini günceller:
--   * p_photo_url = null   → fotoğrafa dokunma (önceki davranış korunur)
--   * p_photo_url = ''     → fotoğrafı kaldır (yeni)
--   * p_photo_url = '...'  → fotoğrafı ayarla
-- İmza (parametre listesi) değişmediği için drop gerekmez; mevcut yetkiler
-- korunur.
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyanın tamamını
-- yapıştırıp "Run" deyin.
-- ============================================================================

create or replace function public.update_family(
  p_name text default null,
  p_photo_url text default null,
  p_settings jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.require_parent();
begin
  update public.families
     set name = coalesce(nullif(trim(coalesce(p_name, '')), ''), name),
         photo_url = case
                       when p_photo_url is null then photo_url
                       when char_length(p_photo_url) = 0 then null
                       else p_photo_url
                     end,
         settings = case
                      when p_settings is null then settings
                      else settings || p_settings
                    end
   where id = v_family;
end;
$$;
