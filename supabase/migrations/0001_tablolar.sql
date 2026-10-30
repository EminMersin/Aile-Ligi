-- ============================================================================
-- AİLE LİGİ — 0001: ŞEMA (tablolar, tipler, indeksler, tetikleyiciler)
-- Supabase SQL Editor'de bu dosyayı SIRAYLA çalıştırın: 0001 → 0002 → 0003
-- ============================================================================

-- gen_random_uuid() PostgreSQL 13+ ile çekirdekte gelir, ek uzantı gerekmez.

-- Yardımcı fonksiyonların yaşadığı özel şema (istemci tarafından erişilemez).
create schema if not exists app_private;

-- ---------------------------------------------------------------- Aileler
create table if not exists public.families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(trim(name)) between 1 and 60),
  -- 6 haneli, süresiz aile kodu (100000-999999 → baştaki sıfır sorunu yok)
  code          text not null unique check (code ~ '^[1-9][0-9]{5}$'),
  photo_url     text,
  owner_name    text not null default '',
  settings      jsonb not null default jsonb_build_object(
                  'weeklyResetEnabled', false,
                  'weeklyResetDay', 0,
                  'weeklyResetHour', 0,
                  'aiJudgeEnabled', true,
                  'aiJudgeStyle', 'funny',
                  'shoppingPointsEnabled', false,
                  'shoppingPointsValue', 10,
                  'theme', 'system',
                  'soundsEnabled', true,
                  'notificationsEnabled', false,
                  'language', 'tr'
                ),
  last_reset_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- Üyeler
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  -- Telefonu/hesabı olmayan çocuklar null kalabilir; puanları yine de birikir.
  user_id    uuid references auth.users (id) on delete set null,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  role       text not null default 'child' check (role in ('parent', 'child')),
  avatar     text not null default '🙂',
  -- PUAN ASLA 0'IN ALTINA İNEMEZ (veritabanı seviyesinde garanti)
  points     integer not null default 0 check (points >= 0),
  is_active  boolean not null default true,
  is_linked  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists members_family_name_key
  on public.members (family_id, lower(name));
create index if not exists members_family_idx on public.members (family_id);
create index if not exists members_user_idx on public.members (user_id);

-- ------------------------------------------------- Görev ve ceza kataloğu
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 60),
  kind       text not null check (kind in ('gain', 'penalty')),
  -- Cezalarda da mutlak değer yazılır (10 = 10 puan düşer)
  points     integer not null check (points > 0 and points <= 1000),
  icon       text not null default '⭐',
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tasks_family_idx on public.tasks (family_id, kind, sort_order);
create unique index if not exists tasks_family_title_key
  on public.tasks (family_id, kind, lower(title));

-- ------------------------------------------------------ Ceza onay talepleri
create table if not exists public.penalty_requests (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families (id) on delete cascade,
  task_id          uuid references public.tasks (id) on delete set null,
  task_title       text not null,
  task_icon        text not null default '⚠️',
  member_id        uuid not null references public.members (id) on delete cascade,
  member_name      text not null default '',
  points           integer not null check (points > 0),
  note             text,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by     uuid references auth.users (id) on delete set null,
  requested_by_name text not null default '',
  reviewed_by      uuid references auth.users (id) on delete set null,
  reviewed_by_name text,
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

create index if not exists penalties_family_idx
  on public.penalty_requests (family_id, status, created_at desc);

-- ---------------------------------------------------------------- Ödüller
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 60),
  cost        integer not null check (cost > 0 and cost <= 100000),
  icon        text not null default '🎁',
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists rewards_family_idx on public.rewards (family_id);

-- ------------------------------------------------------ Kullanılan ödüller
create table if not exists public.reward_redemptions (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  reward_id    uuid references public.rewards (id) on delete set null,
  reward_title text not null,
  reward_icon  text not null default '🎁',
  member_id    uuid not null references public.members (id) on delete cascade,
  member_name  text not null default '',
  cost         integer not null check (cost > 0),
  created_at   timestamptz not null default now()
);

create index if not exists redemptions_family_idx
  on public.reward_redemptions (family_id, created_at desc);

-- -------------------------------------------------------- Planlı görevler
create table if not exists public.planned_tasks (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families (id) on delete cascade,
  title              text not null check (char_length(trim(title)) between 1 and 60),
  points             integer not null check (points > 0 and points <= 1000),
  kind               text not null default 'gain' check (kind in ('gain', 'penalty')),
  icon               text not null default '📌',
  assigned_member_id uuid references public.members (id) on delete set null,
  recurrence         text not null default 'weekly' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  weekdays           integer[] not null default '{}',
  due_time           time,
  start_date         date not null default current_date,
  requires_approval  boolean not null default false,
  notify             boolean not null default false,
  is_active          boolean not null default true,
  last_completed_date date,
  created_at         timestamptz not null default now()
);

create index if not exists planned_family_idx on public.planned_tasks (family_id, is_active);

-- ------------------------------------------------------- Puan hareket defteri
create table if not exists public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  member_id     uuid references public.members (id) on delete set null,
  member_name   text,
  title         text not null,
  icon          text not null default '⭐',
  delta         integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason        text not null check (reason in ('task', 'penalty', 'reward', 'manual', 'weekly_reset', 'shopping')),
  actor_name    text,
  created_at    timestamptz not null default now()
);

create index if not exists activity_family_idx
  on public.activity_log (family_id, created_at desc);

-- ---------------------------------------------------------- Alışveriş listesi
create table if not exists public.shopping_items (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families (id) on delete cascade,
  title              text not null check (char_length(trim(title)) between 1 and 80),
  quantity           text,
  is_done            boolean not null default false,
  done_by_member_id  uuid references public.members (id) on delete set null,
  done_by_name       text,
  created_at         timestamptz not null default now()
);

create index if not exists shopping_family_idx on public.shopping_items (family_id, is_done);

-- ------------------------------------------------------- Haftalık sonuçlar
create table if not exists public.weekly_snapshots (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  week_start  date not null,
  member_id   uuid references public.members (id) on delete set null,
  member_name text not null default '',
  points      integer not null check (points >= 0),
  rank        integer not null check (rank > 0),
  created_at  timestamptz not null default now()
);

create index if not exists snapshots_family_idx
  on public.weekly_snapshots (family_id, week_start desc);

-- ------------------------------------------- Aile kodu deneme sınırlaması
create table if not exists public.join_attempts (
  id         bigserial primary key,
  code       text not null,
  user_id    uuid,
  created_at timestamptz not null default now()
);

create index if not exists join_attempts_idx on public.join_attempts (user_id, created_at desc);

-- ------------------------------------------------------- updated_at tetikleyici
create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists families_touch on public.families;
create trigger families_touch before update on public.families
  for each row execute function app_private.touch_updated_at();

drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members
  for each row execute function app_private.touch_updated_at();
