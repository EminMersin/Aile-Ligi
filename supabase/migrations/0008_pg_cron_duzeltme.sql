-- ============================================================================
-- AİLE LİGİ — 0008: pg_cron zamanlamasını düzelt
--
-- Sorun: 0006 göçündeki "create extension if not exists pg_cron with schema
-- extensions" satırı hatalıydı — pg_cron uzantısı yalnızca "cron" (ya da
-- pg_catalog) şemasına kurulabilir, "extensions" şemasına kurulamaz. Bu satır
-- muhtemelen sessizce başarısız oldu (migration içinde "exception when others"
-- ile yutuluyordu) ve bu yüzden zamanlama hiç kurulmadı — otomatik sıfırlama
-- bu yüzden çalışmadı.
--
-- ÖNCE ŞUNU YAPIN (bu dosyayı çalıştırmadan önce):
--   Supabase Dashboard → Database → Extensions → "pg_cron" uzantısını açın
--   (toggle ile). Bu, en güvenilir etkinleştirme yoludur.
--
-- Sonra bu dosyayı SQL Editor'de çalıştırın.
-- ============================================================================

do $$
begin
  perform cron.unschedule('aile-ligi-haftalik-sifirlama');
exception when others then
  null;
end $$;

select cron.schedule(
  'aile-ligi-haftalik-sifirlama',
  '5 * * * *',
  $cron$select public.run_scheduled_weekly_resets();$cron$
);

-- Kurulumu doğrulamak için: aşağıdaki sorguyu SQL Editor'de ayrıca çalıştırıp
-- sonucunu paylaşabilirsiniz — "aile-ligi-haftalik-sifirlama" adlı bir satır
-- ve active=true görünmesi gerekir.
-- select jobid, jobname, schedule, active from cron.job;
