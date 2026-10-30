-- ============================================================================
-- AİLE LİGİ — 0010: Haftalık sıfırlamayı güvenilir hale getir (telafi mantığı)
--
-- Sorun: 18 Eylül Cuma 12:00 için ayarlanan otomatik sıfırlama, saat 12:05
-- civarında gerçekleşmedi. 0006 göçündeki gün/saat eşleştirmesi doğruydu
-- (İstanbul saati), ancak iki zayıf nokta vardı:
--
--   1) TETİKLEME KAÇARSA TELAFİ YOKTU: pg_cron işi saat başı :05'te çalışır
--      ve fonksiyon yalnızca "şu an tam olarak ayarlı saat mi?" diye bakar.
--      O dakika kaçarsa (gecikme, bakım penceresi, uzantının kısa süre kapalı
--      kalması) o haftanın sıfırlaması tamamen atlanır.
--   2) 20 SAATLİK KURAL FAZLA KATIYDI: "son 20 saat içinde sıfırlanmışsa
--      atla" kuralı, aynı gün yapılan bir manuel sıfırlama testinden sonra
--      planlı sıfırlamayı engelleyebiliyordu.
--
-- Bu göç fonksiyonu şu mantıkla değiştirir:
--   "Bu haftaki planlanan an son 24 saat içinde geçti mi? Geçtiyse ve o andan
--    sonra sıfırlama yapılmamışsa şimdi sıfırla."
--   → Bir tetikleme kaçsa bile en geç bir sonraki kontrolde (10 dk içinde)
--     sıfırlama telafi edilir; aynı planlanan an için ikinci kez sıfırlama
--     yapılmaz (last_reset_at ile korunur). 24 saatten eski kaçırılmış anlar
--     telafi edilmez (geçmişe dönük toplu sıfırlamayı ve yeni kurulan bir
--     zamanlamanın hemen sıfırlama yapmasını önlemek için).
--
-- Zamanlama saat başı yerine 10 dakikada bire çekilir; böylece kaçırılan bir
-- an en geç 10 dakika içinde telafi edilir. (Günde ~144 hafif kontrol.)
--
-- Not: Türkiye 2016'dan beri yaz saati kullanmadığı için İstanbul saati
-- sabit UTC+3'tür; ek dönüşüm gerekmez.
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyanın tamamını
-- yapıştırıp "Run" deyin. Dosya sonundaki doğrulama sorgularının çıktısını
-- kontrol edin (active=true olmalı; 'aktif' sütunu true değilse uygulamada
-- Ayarlar > Haftalık sıfırlama > "Otomatik sıfırlama" anahtarını açın).
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
  v_now    timestamp := (now() at time zone 'Europe/Istanbul');
  v_target timestamp;
  v_week   date;
begin
  for v_family in
    select f.* from public.families f
    where coalesce((f.settings->>'weeklyResetEnabled')::boolean, false)
  loop
    -- Bu haftaki planlanan sıfırlama anı (İstanbul saatiyle): ayarlı gün ve
    -- saat bugüne denk geliyorsa bugün; geçtiyse geriye doğru en yakın
    -- eşleşme (en fazla 6 gün önce).
    v_target := date_trunc('day', v_now)
                + make_interval(hours => coalesce((v_family.settings->>'weeklyResetHour')::int, 0))
                - make_interval(days => (
                    ((extract(dow from v_now)::int
                      - coalesce((v_family.settings->>'weeklyResetDay')::int, 0)) % 7 + 7) % 7
                  ));

    -- Zamanı henüz gelmediyse bekle.
    if v_target > v_now then
      continue;
    end if;

    -- Planlanan an 24 saatten daha eskiyse telafi etme; bir sonraki haftayı
    -- bekle. Bu, yeni kurulan bir zamanlamanın geriye dönük sıfırlama
    -- yapmasını önler. (Cron 10 dakikada bir çalıştığı için normal koşullarda
    -- bu pencere hiç kullanılmaz; yalnızca gerçekten kaçırılan anları kurtarır.)
    if v_now - v_target > interval '24 hours' then
      continue;
    end if;

    -- Bu planlanan andan sonra zaten sıfırlama yapılmışsa tekrar yapma.
    if v_family.last_reset_at is not null
       and v_family.last_reset_at >= (v_target at time zone 'Europe/Istanbul') then
      continue;
    end if;

    v_rank := 0;
    v_week := date_trunc('week', v_now)::date;

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

-- Zamanlamayı yeniden kur: aynı adlı eski işleri (varsa birden fazlasını da)
-- temizle, sonra 10 dakikada bir çalışacak şekilde kur.
do $$
declare
  r record;
begin
  begin
    for r in select jobid from cron.job where jobname = 'aile-ligi-haftalik-sifirlama' loop
      perform cron.unschedule(r.jobid);
    end loop;
  exception when others then
    null;
  end;

  begin
    perform cron.schedule(
      'aile-ligi-haftalik-sifirlama',
      '*/10 * * * *',
      $cron$select public.run_scheduled_weekly_resets();$cron$
    );
  exception when others then
    raise notice 'pg_cron zamanlaması kurulamadı: Dashboard > Database > Extensions üzerinden pg_cron açık mı kontrol edin, sonra bu dosyayı yeniden çalıştırın.';
  end;
end $$;

-- ============================================================================
-- KURULUM DOĞRULAMASI
-- Aşağıdaki blok özet durumu "notice" olarak yazdırır (hiçbir durumda betiği
-- durdurmaz). Ayrıca isterseniz en altta yorum olarak verilen iki sorguyu
-- SQL Editor'de tek başına çalıştırıp tablo halinde görebilirsiniz.
-- ============================================================================
do $$
declare
  r record;
begin
  begin
    for r in
      select jobid, jobname, schedule, active
      from cron.job where jobname = 'aile-ligi-haftalik-sifirlama'
    loop
      raise notice 'ZAMANLAMA: jobid=% ad=% zamanlama=% aktif=%', r.jobid, r.jobname, r.schedule, r.active;
    end loop;
  exception when others then
    raise notice 'cron.job okunamadı (pg_cron kurulu değil olabilir): %', sqlerrm;
  end;

  for r in
    select f.name,
           coalesce(f.settings->>'weeklyResetEnabled', '(yok)') as aktif,
           coalesce(f.settings->>'weeklyResetDay', '(yok)')     as gun,
           coalesce(f.settings->>'weeklyResetHour', '(yok)')    as saat,
           f.last_reset_at
    from public.families f
  loop
    raise notice 'AİLE %: otomatik=% gün=% saat=% son_sıfırlama=%',
      r.name, r.aktif, r.gun, r.saat, r.last_reset_at;
  end loop;
end $$;

-- Tek başına çalıştırmak isterseniz (tablo halinde görmek için):
--   select jobid, jobname, schedule, active from cron.job
--    where jobname = 'aile-ligi-haftalik-sifirlama';
--
--   select f.name,
--          coalesce(f.settings->>'weeklyResetEnabled', '(yok)') as aktif,
--          coalesce(f.settings->>'weeklyResetDay', '(yok)')     as gun,
--          coalesce(f.settings->>'weeklyResetHour', '(yok)')    as saat,
--          f.last_reset_at
--     from public.families f;
-- Beklenen: active=true, zamanlama='*/10 * * * *', aktif=true, gun=5, saat=12.
-- 'aktif' false/null ise uygulamada Ayarlar > Haftalık sıfırlama ekranından
-- "Otomatik sıfırlama" anahtarını açıp bu dosyayı yeniden çalıştırın.
