-- ============================================================================
-- AİLE LİGİ — 0003: FONKSİYONLAR (puan mantığı ve tüm işlemler)
-- Puan yalnızca bu dosyadaki fonksiyonlar üzerinden değişir:
--   * satır kilidi (for update) → aynı anda iki işlem puanı bozamaz
--   * greatest(...,0)         → puan asla 0'ın altına inmez
--   * activity_log            → her hareket deftere yazılır
-- ============================================================================

-- ---------------------------------------------------- Varsayılan görev listesi
create or replace function app_private.default_task_seed()
returns table (title text, kind text, points integer, icon text, sort_order integer)
language sql
immutable
as $$
  values
    ('Elektrik süpürgesi',    'gain', 20, '🧹', 0),
    ('Bitkileri sula',        'gain', 10, '🪴', 1),
    ('Çamaşır katla',         'gain', 15, '🧺', 2),
    ('Sınavda mükemmel',      'gain', 50, '📝', 3),
    ('Çöpü çıkar',            'gain', 15, '🗑️', 4),
    ('Yemek yapmaya yardım',  'gain', 20, '🍳', 5),
    ('20 dk kitap oku',       'gain', 20, '📚', 6),
    ('Enstrüman çalış',       'gain', 25, '🎸', 7),
    ('Bulaşık yıka',          'gain', 15, '🍽️', 8),
    ('Odanı topla',           'gain', 10, '🛏️', 9),
    ('Dişlerini fırçala',     'gain',  5, '🪥', 10),
    ('Ödevini yap',           'gain', 25, '✏️', 11),
    ('Kardeşine yardım et',   'gain', 15, '🤝', 12),
    ('Spor yap',              'gain', 20, '🏃', 13),
    ('Köpeği gezdir',         'gain', 15, '🐕', 14),
    ('Alışverişe yardım et',  'gain', 10, '🛒', 15),
    ('Bahçe işleri',          'gain', 20, '🌿', 16),
    ('Masayı topla',          'gain', 10, '🍴', 17),
    ('Yer dağınık',           'penalty', 10, '🧦', 18),
    ('Çok fazla TV',          'penalty', 15, '📺', 19),
    ('Kavga',                 'penalty', 25, '🥊', 20),
    ('Yatağını toplamadı',    'penalty',  5, '🛏️', 21),
    ('Dinlememek',            'penalty', 10, '🙉', 22),
    ('Işıklar açık kaldı',    'penalty',  5, '💡', 23),
    ('Sifonu çekmedi',        'penalty', 10, '🚽', 24),
    ('Yemeğe geç kaldı',      'penalty', 15, '⏰', 25),
    ('Bağırmak',              'penalty', 20, '🗣️', 26),
    ('Ters cevap',            'penalty', 15, '😤', 27),
    ('Kaba davranış',         'penalty', 20, '😠', 28),
    ('Ödevi unuttu',          'penalty', 25, '📚', 29),
    ('Yalan söylemek',        'penalty', 30, '🤥', 30),
    ('Kuralları çiğnedi',     'penalty', 30, '🚫', 31);
$$;

-- ------------------------------------------------------------- İç yardımcılar
create or replace function app_private.actor_name()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.name from public.members m where m.id = app_private.current_member_id();
$$;

create or replace function app_private.require_auth()
returns uuid
language plpgsql
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  return v_uid;
end;
$$;

create or replace function app_private.require_parent()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.current_family_id();
begin
  if v_family is null then
    raise exception 'not_authenticated';
  end if;
  if not app_private.is_parent() then
    raise exception 'not_parent';
  end if;
  return v_family;
end;
$$;

/** Puanı uygular. Tek atomik nokta: kilit + 0 sınırı + defter kaydı. */
create or replace function app_private.apply_points(
  p_family_id uuid,
  p_member_id uuid,
  p_delta integer,
  p_reason text,
  p_title text,
  p_icon text,
  p_actor_name text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before integer;
  v_after  integer;
  v_name   text;
begin
  select m.points, m.name
    into v_before, v_name
  from public.members m
  where m.id = p_member_id
    and m.family_id = p_family_id
    and m.is_active
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  -- 0'ın altına inmez kuralı burada uygulanır.
  v_after := greatest(v_before + p_delta, 0);
  if v_after = v_before then
    return v_after;
  end if;

  update public.members set points = v_after where id = p_member_id;

  insert into public.activity_log
    (family_id, member_id, member_name, title, icon, delta, balance_after, reason, actor_name)
  values
    (p_family_id, p_member_id, v_name, p_title, coalesce(nullif(p_icon, ''), '⭐'),
     v_after - v_before, v_after, p_reason, p_actor_name);

  return v_after;
end;
$$;

revoke all on function app_private.apply_points(uuid, uuid, integer, text, text, text, text)
  from public, anon, authenticated;
revoke all on function app_private.actor_name() from public, anon, authenticated;

-- ============================================================================
-- 1) AİLE OLUŞTURMA (aile yöneticisi kaydı)
-- ============================================================================
create or replace function public.create_family(
  p_parent_name text,
  p_family_name text,
  p_avatar text default '👨'
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := app_private.require_auth();
  v_code   text;
  v_family uuid;
  v_member uuid;
  v_tries  integer := 0;
begin
  if char_length(trim(coalesce(p_parent_name, ''))) = 0 then
    raise exception 'name_required';
  end if;
  if char_length(trim(coalesce(p_family_name, ''))) = 0 then
    raise exception 'family_name_required';
  end if;

  -- Aynı cihaz tekrar kayıt olursa mevcut aileyi döndür (çift aile oluşmasın).
  select m.family_id, m.id into v_family, v_member
  from public.members m
  where m.user_id = v_uid
  order by m.created_at
  limit 1;

  if v_family is not null then
    return json_build_object(
      'family_id', v_family,
      'member_id', v_member,
      'code', (select code from public.families where id = v_family)
    );
  end if;

  loop
    v_code := (100000 + floor(random() * 900000))::integer::text;
    exit when not exists (select 1 from public.families f where f.code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 100 then
      raise exception 'code_generation_failed';
    end if;
  end loop;

  insert into public.families (name, code, owner_name)
  values (trim(p_family_name), v_code, trim(p_parent_name))
  returning id into v_family;

  insert into public.members (family_id, user_id, name, role, avatar, is_linked)
  values (v_family, v_uid, trim(p_parent_name), 'parent', coalesce(nullif(p_avatar, ''), '👨'), true)
  returning id into v_member;

  insert into public.tasks (family_id, title, kind, points, icon, sort_order)
  select v_family, s.title, s.kind, s.points, s.icon, s.sort_order
  from app_private.default_task_seed() s
  on conflict do nothing;

  return json_build_object('family_id', v_family, 'member_id', v_member, 'code', v_code);
end;
$$;

-- ============================================================================
-- 2) AİLE KODU İLE AİLEYİ BULMA (üye girişi 1. adım)
-- ============================================================================
-- NOT: Hatalı kod durumunda "raise exception" KULLANILMAZ; çünkü yükseltilen hata
-- aynı işlemdeki deneme kaydını da geri alır ve kaba kuvvet koruması işlemez.
-- Bunun yerine {"ok": false, "error": "invalid_code"} döndürülür.
create or replace function public.lookup_family_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := app_private.require_auth();
  v_attempts integer;
  v_family   public.families;
begin
  select count(*) into v_attempts
  from public.join_attempts a
  where a.user_id = v_uid and a.created_at > now() - interval '15 minutes';

  if v_attempts >= 5 then
    raise exception 'too_many_attempts';
  end if;

  if coalesce(p_code, '') !~ '^[0-9]{6}$' then
    insert into public.join_attempts (code, user_id) values (coalesce(p_code, ''), v_uid);
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select * into v_family from public.families f where f.code = p_code;
  if not found then
    insert into public.join_attempts (code, user_id) values (p_code, v_uid);
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  return json_build_object(
    'ok', true,
    'familyId', v_family.id,
    'familyName', v_family.name,
    'members', coalesce(
      (
        select json_agg(json_build_object(
                 'id', m.id, 'name', m.name, 'avatar', m.avatar, 'role', m.role
               ) order by m.created_at)
        from public.members m
        where m.family_id = v_family.id and m.is_active and not m.is_linked
      ),
      '[]'::json
    )
  );
end;
$$;

-- ============================================================================
-- 3) AİLE KODU İLE KATILMA (üye girişi 2. adım)
-- ============================================================================
create or replace function public.join_family_with_code(
  p_code text,
  p_member_id uuid default null,
  p_new_member_name text default null,
  p_avatar text default '🙂',
  p_as_parent boolean default false
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := app_private.require_auth();
  v_attempts integer;
  v_family   public.families;
  v_member   public.members;
  v_name     text;
begin
  select count(*) into v_attempts
  from public.join_attempts a
  where a.user_id = v_uid and a.created_at > now() - interval '15 minutes';

  if v_attempts >= 5 then
    raise exception 'too_many_attempts';
  end if;

  if coalesce(p_code, '') !~ '^[0-9]{6}$' then
    insert into public.join_attempts (code, user_id) values (coalesce(p_code, ''), v_uid);
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select * into v_family from public.families f where f.code = p_code;
  if not found then
    insert into public.join_attempts (code, user_id) values (p_code, v_uid);
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- Zaten bu aileye bağlıysa tekrar bağlanmasın.
  select * into v_member from public.members m
  where m.family_id = v_family.id and m.user_id = v_uid
  limit 1;
  if found then
    return json_build_object('ok', true, 'memberId', v_member.id);
  end if;

  if p_member_id is not null then
    select * into v_member from public.members m
    where m.id = p_member_id and m.family_id = v_family.id
    for update;
    if not found then
      raise exception 'not_found';
    end if;
    if v_member.is_linked then
      raise exception 'member_linked';
    end if;

    update public.members
       set user_id = v_uid,
           is_linked = true,
           role = case when p_as_parent then 'parent' else role end
     where id = v_member.id;

    -- Doğru kod girildi: önceki hatalı denemeler silinir.
    delete from public.join_attempts where user_id = v_uid;

    return json_build_object('ok', true, 'memberId', v_member.id);
  end if;

  v_name := trim(coalesce(p_new_member_name, ''));
  if char_length(v_name) = 0 then
    raise exception 'name_required';
  end if;
  if exists (
    select 1 from public.members m
    where m.family_id = v_family.id and lower(m.name) = lower(v_name)
  ) then
    raise exception 'name_taken';
  end if;

  insert into public.members (family_id, user_id, name, role, avatar, is_linked)
  values (v_family.id, v_uid, v_name, case when p_as_parent then 'parent' else 'child' end,
          coalesce(nullif(p_avatar, ''), '🙂'), true)
  returning * into v_member;

  delete from public.join_attempts where user_id = v_uid;

  return json_build_object('ok', true, 'memberId', v_member.id);
end;
$$;

-- ============================================================================
-- 4) AİLE KODUNU YENİLE (yalnızca yönetici)
-- ============================================================================
create or replace function public.rotate_family_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.require_parent();
  v_code   text;
  v_tries  integer := 0;
begin
  loop
    v_code := (100000 + floor(random() * 900000))::integer::text;
    exit when not exists (select 1 from public.families f where f.code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 100 then
      raise exception 'code_generation_failed';
    end if;
  end loop;

  update public.families set code = v_code where id = v_family;
  return v_code;
end;
$$;

-- ============================================================================
-- 5) AİLE BİLGİLERİNİ GÜNCELLE (ad, fotoğraf, ayarlar)
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
         photo_url = coalesce(p_photo_url, photo_url),
         settings = case
                      when p_settings is null then settings
                      else settings || p_settings
                    end
   where id = v_family;
end;
$$;

-- ============================================================================
-- 6) ÜYE EKLE / DÜZENLE (yalnızca yönetici)
-- ============================================================================
create or replace function public.save_member(
  p_id uuid default null,
  p_name text default null,
  p_role text default 'child',
  p_avatar text default '🙂'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.require_parent();
  v_name   text := trim(coalesce(p_name, ''));
  v_member uuid;
begin
  if char_length(v_name) = 0 then
    raise exception 'name_required';
  end if;
  if p_role not in ('parent', 'child') then
    raise exception 'bad_role';
  end if;
  if exists (
    select 1 from public.members m
    where m.family_id = v_family and lower(m.name) = lower(v_name)
      and (p_id is null or m.id <> p_id)
  ) then
    raise exception 'name_taken';
  end if;

  if p_id is null then
    insert into public.members (family_id, name, role, avatar, is_linked)
    values (v_family, v_name, p_role, coalesce(nullif(p_avatar, ''), '🙂'), false)
    returning id into v_member;
  else
    update public.members
       set name = v_name, role = p_role, avatar = coalesce(nullif(p_avatar, ''), avatar)
     where id = p_id and family_id = v_family
     returning id into v_member;
    if v_member is null then
      raise exception 'not_found';
    end if;
  end if;

  return v_member;
end;
$$;

-- ============================================================================
-- 7) ÜYE SİL (yalnızca yönetici, kendini silemez)
-- ============================================================================
create or replace function public.delete_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.require_parent();
begin
  if p_id = app_private.current_member_id() then
    raise exception 'cannot_delete_self';
  end if;
  delete from public.members where id = p_id and family_id = v_family;
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

-- ============================================================================
-- 8) GÖREV TAMAMLANDI → PUAN KAZAN
-- ============================================================================
create or replace function public.complete_task(p_task_id uuid, p_member_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.current_family_id();
  v_task   public.tasks;
begin
  if v_family is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_task from public.tasks t
  where t.id = p_task_id and t.family_id = v_family and t.is_active;
  if not found then
    raise exception 'not_found';
  end if;

  return app_private.apply_points(
    v_family, p_member_id, v_task.points, 'task', v_task.title, v_task.icon, app_private.actor_name()
  );
end;
$$;

-- ============================================================================
-- 9) CEZA TALEBİ (onaya düşer — puan HEMEN değişmez)
-- ============================================================================
create or replace function public.request_penalty(
  p_task_id uuid,
  p_member_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family  uuid := app_private.current_family_id();
  v_task    public.tasks;
  v_member  public.members;
  v_request uuid;
begin
  if v_family is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_task from public.tasks t
  where t.id = p_task_id and t.family_id = v_family and t.is_active;
  if not found then
    raise exception 'not_found';
  end if;

  select * into v_member from public.members m
  where m.id = p_member_id and m.family_id = v_family and m.is_active;
  if not found then
    raise exception 'not_found';
  end if;

  insert into public.penalty_requests
    (family_id, task_id, task_title, task_icon, member_id, member_name, points, note,
     status, requested_by, requested_by_name)
  values
    (v_family, v_task.id, v_task.title, v_task.icon, v_member.id, v_member.name, v_task.points,
     nullif(trim(coalesce(p_note, '')), ''), 'pending', auth.uid(), coalesce(app_private.actor_name(), 'Bir aile ferdi'))
  returning id into v_request;

  return v_request;
end;
$$;

-- ============================================================================
-- 10) CEZAYI ONAYLA / REDDET (yalnızca yönetici)
-- ============================================================================
create or replace function public.review_penalty(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family  uuid := app_private.require_parent();
  v_request public.penalty_requests;
begin
  select * into v_request from public.penalty_requests p
  where p.id = p_request_id and p.family_id = v_family
  for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'already_reviewed';
  end if;

  update public.penalty_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = auth.uid(),
         reviewed_by_name = app_private.actor_name(),
         reviewed_at = now()
   where id = v_request.id;

  if p_approve then
    perform app_private.apply_points(
      v_family, v_request.member_id, -v_request.points, 'penalty',
      v_request.task_title, v_request.task_icon, app_private.actor_name()
    );
  end if;
end;
$$;

-- ============================================================================
-- 11) ÖDÜL KULLAN (puan düşer, 0'ın altına inmez)
-- ============================================================================
create or replace function public.redeem_reward(p_reward_id uuid, p_member_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.current_family_id();
  v_reward public.rewards;
  v_member public.members;
  v_after  integer;
begin
  if v_family is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_reward from public.rewards r
  where r.id = p_reward_id and r.family_id = v_family and r.is_active;
  if not found then
    raise exception 'not_found';
  end if;

  select * into v_member from public.members m
  where m.id = p_member_id and m.family_id = v_family and m.is_active
  for update;
  if not found then
    raise exception 'not_found';
  end if;

  if v_member.points < v_reward.cost then
    raise exception 'insufficient_points';
  end if;

  insert into public.reward_redemptions
    (family_id, reward_id, reward_title, reward_icon, member_id, member_name, cost)
  values
    (v_family, v_reward.id, v_reward.title, v_reward.icon, v_member.id, v_member.name, v_reward.cost);

  v_after := app_private.apply_points(
    v_family, v_member.id, -v_reward.cost, 'reward', v_reward.title, v_reward.icon,
    app_private.actor_name()
  );

  return v_after;
end;
$$;

-- ============================================================================
-- 12) MANUEL PUAN (yalnızca yönetici)
-- ============================================================================
create or replace function public.adjust_points(p_member_id uuid, p_delta integer, p_title text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.require_parent();
begin
  if p_delta = 0 then
    raise exception 'zero_delta';
  end if;
  return app_private.apply_points(
    v_family, p_member_id, p_delta, 'manual', coalesce(nullif(trim(p_title), ''), 'Manuel puan'),
    '⭐', app_private.actor_name()
  );
end;
$$;

-- ============================================================================
-- 13) HAFTALIK SIFIRLAMA (sonuçlar saklanır, puanlar 0 olur)
-- ============================================================================
create or replace function public.reset_weekly_points()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.require_parent();
  v_member public.members;
  v_rank   integer := 0;
  v_week   date := date_trunc('week', now())::date;
  v_actor  text := app_private.actor_name();
begin
  for v_member in
    select * from public.members m
    where m.family_id = v_family and m.is_active
    order by m.points desc
  loop
    v_rank := v_rank + 1;
    if v_member.points > 0 then
      insert into public.weekly_snapshots
        (family_id, week_start, member_id, member_name, points, rank)
      values
        (v_family, v_week, v_member.id, v_member.name, v_member.points, v_rank);
    end if;

    update public.members set points = 0 where id = v_member.id;

    insert into public.activity_log
      (family_id, member_id, member_name, title, icon, delta, balance_after, reason, actor_name)
    values
      (v_family, v_member.id, v_member.name, 'Haftalık sıfırlama', '🔄', 0, 0, 'weekly_reset', v_actor);
  end loop;

  update public.families set last_reset_at = now() where id = v_family;
end;
$$;

-- ============================================================================
-- 14) PLANLI GÖREVİ TAMAMLA (aynı gün iki kez puan verilmez)
-- ============================================================================
create or replace function public.complete_planned_task(
  p_planned_task_id uuid,
  p_member_id uuid,
  p_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.current_family_id();
  v_task   public.planned_tasks;
  v_after  integer;
begin
  if v_family is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_task from public.planned_tasks t
  where t.id = p_planned_task_id and t.family_id = v_family and t.is_active
  for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_task.last_completed_date = p_date then
    raise exception 'already_done';
  end if;

  v_after := app_private.apply_points(
    v_family, p_member_id, case when v_task.kind = 'penalty' then -v_task.points else v_task.points end,
    case when v_task.kind = 'penalty' then 'penalty' else 'task' end,
    v_task.title, v_task.icon, app_private.actor_name()
  );

  update public.planned_tasks set last_completed_date = p_date where id = v_task.id;

  return v_after;
end;
$$;

-- ============================================================================
-- 15) ALIŞVERİŞİ BİTİR (liste temizlenir, istenirse puan verilir)
-- ============================================================================
create or replace function public.finish_shopping(p_member_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family uuid := app_private.current_family_id();
  v_family_row public.families;
begin
  if v_family is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_family_row from public.families f where f.id = v_family;

  if p_member_id is not null
     and coalesce((v_family_row.settings ->> 'shoppingPointsEnabled')::boolean, false) then
    perform app_private.apply_points(
      v_family, p_member_id,
      coalesce((v_family_row.settings ->> 'shoppingPointsValue')::integer, 10),
      'shopping', 'Alışveriş tamamlandı', '🛒', app_private.actor_name()
    );
  end if;

  delete from public.shopping_items where family_id = v_family;
end;
$$;

-- ============================================================================
-- YETKİLER: yalnızca giriş yapmış kullanıcılar çağırabilir
-- ============================================================================
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.create_family(text, text, text)',
    'public.lookup_family_code(text)',
    'public.join_family_with_code(text, uuid, text, text, boolean)',
    'public.rotate_family_code()',
    'public.update_family(text, text, jsonb)',
    'public.save_member(uuid, text, text, text)',
    'public.delete_member(uuid)',
    'public.complete_task(uuid, uuid)',
    'public.request_penalty(uuid, uuid, text)',
    'public.review_penalty(uuid, boolean)',
    'public.redeem_reward(uuid, uuid)',
    'public.adjust_points(uuid, integer, text)',
    'public.reset_weekly_points()',
    'public.complete_planned_task(uuid, uuid, date)',
    'public.finish_shopping(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
