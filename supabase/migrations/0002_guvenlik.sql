-- ============================================================================
-- AİLE LİGİ — 0002: GÜVENLİK (yardımcı fonksiyonlar, RLS politikaları, yetkiler)
-- Kural: puanı değiştiren HER ŞEY 0003'teki fonksiyonlardan geçer.
--       İstemci, puan kolonunu doğrudan yazamaz.
-- ============================================================================

-- ------------------------------------------------- Yardımcı fonksiyonlar
create or replace function app_private.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.members m
  where m.user_id = auth.uid() and m.is_active
  order by m.created_at
  limit 1;
$$;

create or replace function app_private.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.family_id
  from public.members m
  where m.user_id = auth.uid() and m.is_active
  order by m.created_at
  limit 1;
$$;

create or replace function app_private.is_parent()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.is_active and m.role = 'parent'
  );
$$;

-- Bu fonksiyonlar yalnızca iç kullanım içindir.
revoke all on function app_private.current_member_id() from public, anon, authenticated;
revoke all on function app_private.current_family_id() from public, anon, authenticated;
revoke all on function app_private.is_parent() from public, anon, authenticated;

-- RLS politikaları bu fonksiyonları "authenticated" rolü adına çağırır.
-- SECURITY DEFINER olmaları tablo RLS'ini atlatmalarını sağlar, ama politika
-- içinde çağrılabilmeleri için "authenticated" rolünün EXECUTE izni olmalıdır.
-- Bu izin olmadan tüm SELECT/INSERT/UPDATE sorguları "permission denied" hatası verir.
grant execute on function app_private.current_member_id() to authenticated;
grant execute on function app_private.current_family_id() to authenticated;
grant execute on function app_private.is_parent() to authenticated;

-- ---------------------------------------------------------------- RLS açılışı
alter table public.families            enable row level security;
alter table public.members             enable row level security;
alter table public.tasks               enable row level security;
alter table public.penalty_requests    enable row level security;
alter table public.rewards             enable row level security;
alter table public.reward_redemptions  enable row level security;
alter table public.planned_tasks       enable row level security;
alter table public.activity_log        enable row level security;
alter table public.shopping_items      enable row level security;
alter table public.weekly_snapshots    enable row level security;
alter table public.join_attempts       enable row level security;

-- ------------------------------------------------------------------ Aileler
-- Yalnızca kendi ailesini görür; aile bilgisi yalnızca fonksiyonlar ile güncellenir.
drop policy if exists families_select on public.families;
create policy families_select on public.families
  for select to authenticated
  using (id = app_private.current_family_id());

-- -------------------------------------------------------------------- Üyeler
drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated
  using (family_id = app_private.current_family_id());

-- Üye ekleme/silme yalnızca save_member / delete_member ile yapılır.
revoke insert, update, delete on public.members from anon, authenticated;

-- --------------------------------------------------- Görev ve ceza kataloğu
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (family_id = app_private.current_family_id());

drop policy if exists tasks_parent_write on public.tasks;
create policy tasks_parent_write on public.tasks
  for all to authenticated
  using (family_id = app_private.current_family_id() and app_private.is_parent())
  with check (family_id = app_private.current_family_id() and app_private.is_parent());

-- ------------------------------------------------------------------- Ödüller
drop policy if exists rewards_select on public.rewards;
create policy rewards_select on public.rewards
  for select to authenticated
  using (family_id = app_private.current_family_id());

drop policy if exists rewards_parent_write on public.rewards;
create policy rewards_parent_write on public.rewards
  for all to authenticated
  using (family_id = app_private.current_family_id() and app_private.is_parent())
  with check (family_id = app_private.current_family_id() and app_private.is_parent());

-- -------------------------------------------------------- Planlı görevler
drop policy if exists planned_select on public.planned_tasks;
create policy planned_select on public.planned_tasks
  for select to authenticated
  using (family_id = app_private.current_family_id());

drop policy if exists planned_parent_write on public.planned_tasks;
create policy planned_parent_write on public.planned_tasks
  for all to authenticated
  using (family_id = app_private.current_family_id() and app_private.is_parent())
  with check (family_id = app_private.current_family_id() and app_private.is_parent());

-- ----------------------------------------------------------- Alışveriş listesi
-- Tüm aile fertleri ortak listeye ekleyip işaretleyebilir.
drop policy if exists shopping_select on public.shopping_items;
create policy shopping_select on public.shopping_items
  for select to authenticated
  using (family_id = app_private.current_family_id());

drop policy if exists shopping_insert on public.shopping_items;
create policy shopping_insert on public.shopping_items
  for insert to authenticated
  with check (family_id = app_private.current_family_id());

drop policy if exists shopping_update on public.shopping_items;
create policy shopping_update on public.shopping_items
  for update to authenticated
  using (family_id = app_private.current_family_id())
  with check (family_id = app_private.current_family_id());

drop policy if exists shopping_delete on public.shopping_items;
create policy shopping_delete on public.shopping_items
  for delete to authenticated
  using (family_id = app_private.current_family_id());

-- ---------------------------------------------- Salt okunur defterler (yazma yok)
drop policy if exists activity_select on public.activity_log;
create policy activity_select on public.activity_log
  for select to authenticated
  using (family_id = app_private.current_family_id());

drop policy if exists penalties_select on public.penalty_requests;
create policy penalties_select on public.penalty_requests
  for select to authenticated
  using (family_id = app_private.current_family_id());

drop policy if exists redemptions_select on public.reward_redemptions;
create policy redemptions_select on public.reward_redemptions
  for select to authenticated
  using (family_id = app_private.current_family_id());

drop policy if exists snapshots_select on public.weekly_snapshots;
create policy snapshots_select on public.weekly_snapshots
  for select to authenticated
  using (family_id = app_private.current_family_id());

revoke insert, update, delete on public.activity_log        from anon, authenticated;
revoke insert, update, delete on public.penalty_requests    from anon, authenticated;
revoke insert, update, delete on public.reward_redemptions  from anon, authenticated;
revoke insert, update, delete on public.weekly_snapshots    from anon, authenticated;
revoke insert, update, delete on public.families            from anon, authenticated;

-- Deneme kayıtlarına istemci hiçbir şekilde erişemez (politika tanımlı değil).
revoke all on public.join_attempts from anon, authenticated;

-- ------------------------------------------------------------- Gerçek zamanlı
do $$
begin
  begin
    alter publication supabase_realtime add table public.members;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.rewards;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.penalty_requests;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.activity_log;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.shopping_items;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.planned_tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.families;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.reward_redemptions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.weekly_snapshots;
  exception when duplicate_object then null;
  end;
end $$;
