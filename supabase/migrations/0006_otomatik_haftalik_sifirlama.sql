-- ============================================================================
-- AİLE LİGİ — 0006: Otomatik haftalık sıfırlamayı gerçekten çalıştır
--
-- Sorun: "Otomatik sıfırlama" ayarı (gün/saat) sadece families.settings
-- içine kaydediliyordu; bunu okuyup gerçekten tetikleyen hiçbir sunucu
-- tarafı zamanlayıcı yoktu. Mobil uygulama arka planda çalışmadığı için
-- istemci tarafında bir zamanlayıcı kurmak mümkün değil — bu iş mutlaka
-- veritabanı tarafında (pg_cron) yapılmalı.
--
-- Bu göç:
--   1) Ayarlı gün/saat geldiğinde tüm ailelerin sıfırlamasını yapan,
--      kullanıcı kimlik doğrulaması gerektirmeyen bir fonksiyon ekler.
--   2) pg_cron uzantısını etkinleştirmeyi ve bu fonksiyonu her saat başı
--      çalışacak şekilde zamanlamayı DENER. Supabase projelerinde pg_cron
--      bazen yalnızca Dashboard > Database > Extensions üzerinden elle
--      açılabiliyor; bu SQL o adımı otomatik yapamazsa hata vermeden geçer
--      ve aşağıdaki NOT kısmında elle yapılacaklar anlatılır.
-- ============================================================================

create or replace function public.run_scheduled_weekly_resets()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family public.families;
  v_member public.members;
  v_rank   integer;
  v_week   date;
begin
  for v_family in
    select f.* from public.families f
    where coalesce((f.settings->>'weeklyResetEnabled')::boolean, false)
      and coalesce((f.settings->>'weeklyResetDay')::int, 0)
          = extract(dow from (now() at time zone 'Europe/Istanbul'))::int
      and coalesce((f.settings->>'weeklyResetHour')::int, 0)
          = extract(hour from (now() at time zone 'Europe/Istanbul'))::int
      and (f.last_reset_at is null or f.last_reset_at < now() - interval '20 hours')
  loop
    v_rank := 0;
    v_week := date_trunc('week', now())::date;

    for v_member in
      select * from public.members m
      where m.family_id = v_family.id and m.is_active
      order by m.points desc
    loop
      v_rank := v_rank + 1;
      if v_member.points > 0 then
        insert into public.weekly_snapshots
          (family_id, week_start, member_id, member_name, points, rank)
        values
          (v_family.id, v_week, v_member.id, v_member.name, v_member.points, v_rank);
      end if;

      update public.members set points = 0 where id = v_member.id;

      insert into public.activity_log
        (family_id, member_id, member_name, title, icon, delta, balance_after, reason, actor_name)
      values
        (v_family.id, v_member.id, v_member.name, 'Haftalık sıfırlama (otomatik)', '🔄', 0, 0, 'weekly_reset', 'Sistem');
    end loop;

    update public.families set last_reset_at = now() where id = v_family.id;
  end loop;
end;
$$;

revoke all on function public.run_scheduled_weekly_resets() from public, anon, authenticated;

do $$
begin
  begin
    create extension if not exists pg_cron with schema extensions;
  exception when others then
    raise notice 'pg_cron uzantısı otomatik açılamadı, Supabase Dashboard > Database > Extensions üzerinden elle açın.';
  end;

  begin
    perform cron.unschedule('aile-ligi-haftalik-sifirlama');
  exception when others then
    null;
  end;

  begin
    perform cron.schedule(
      'aile-ligi-haftalik-sifirlama',
      '5 * * * *',
      $cron$select public.run_scheduled_weekly_resets();$cron$
    );
  exception when others then
    raise notice 'pg_cron zamanlaması kurulamadı. Bkz. bu dosyanın başındaki NOT.';
  end;
end $$;

-- ============================================================================
-- ELLE YAPILACAKLAR (yukarıdaki otomasyon başarısız olursa):
--   1) Supabase Dashboard > Database > Extensions > "pg_cron" uzantısını açın.
--   2) SQL Editor'de şunu çalıştırın:
--      select cron.schedule(
--        'aile-ligi-haftalik-sifirlama',
--        '5 * * * *',
--        $$select public.run_scheduled_weekly_resets();$$
--      );
--   Bu, her saatin 5. dakikasında tüm aileleri kontrol eder ve o an gün/saat
--   ayarına uyan aileleri sıfırlar (Türkiye saatine göre).
-- ============================================================================
