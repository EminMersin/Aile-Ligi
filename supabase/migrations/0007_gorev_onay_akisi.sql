-- ============================================================================
-- AİLE LİGİ — 0007: Üyenin kendine puan vermesi artık onay gerektirir
--
-- Sorun: Bir aile ferdi (çocuk), "Puan kazan" listesinden bir görev seçip
-- kendine (veya başka bir üyeye) anında puan verebiliyordu — bu, ceza
-- akışının aksine hiçbir onay içermiyordu ve istismara açıktı.
--
-- Çözüm: penalty_requests tablosuna bir "kind" sütunu eklenir ('penalty'
-- veya 'task'). Yönetici (ebeveyn) bir görevi tamamlattığında puan hâlâ
-- anında eklenir; ama yönetici olmayan biri tamamladığında artık talep
-- olarak kaydedilir ve ebeveyn onayı bekler — tıpkı cezalarda olduğu gibi.
-- ============================================================================

alter table public.penalty_requests
  add column if not exists kind text not null default 'penalty';

alter table public.penalty_requests
  drop constraint if exists penalty_requests_kind_check;

alter table public.penalty_requests
  add constraint penalty_requests_kind_check check (kind in ('penalty', 'task'));

-- complete_task dönüş tipi integer'dan json'a değişti; PostgreSQL "create or
-- replace" ile dönüş tipi değişikliğine izin vermez, önce eski fonksiyon silinmeli.
drop function if exists public.complete_task(uuid, uuid);

create or replace function public.complete_task(p_task_id uuid, p_member_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family  uuid := app_private.current_family_id();
  v_task    public.tasks;
  v_member  public.members;
  v_balance integer;
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

  if app_private.is_parent() then
    v_balance := app_private.apply_points(
      v_family, p_member_id, v_task.points, 'task', v_task.title, v_task.icon, app_private.actor_name()
    );
    return json_build_object('pending', false, 'balance', v_balance);
  end if;

  insert into public.penalty_requests
    (family_id, kind, task_id, task_title, task_icon, member_id, member_name, points,
     status, requested_by, requested_by_name)
  values
    (v_family, 'task', v_task.id, v_task.title, v_task.icon, v_member.id, v_member.name, v_task.points,
     'pending', auth.uid(), coalesce(app_private.actor_name(), 'Bir aile ferdi'));

  return json_build_object('pending', true);
end;
$$;

create or replace function public.review_penalty(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family  uuid := app_private.require_parent();
  v_request public.penalty_requests;
  v_sign    integer;
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
    v_sign := case when v_request.kind = 'task' then 1 else -1 end;
    perform app_private.apply_points(
      v_family, v_request.member_id, v_sign * v_request.points,
      case when v_request.kind = 'task' then 'task' else 'penalty' end,
      v_request.task_title, v_request.task_icon, app_private.actor_name()
    );
  end if;
end;
$$;

-- complete_task fonksiyonu drop edilip yeniden oluşturulduğu için yetkileri
-- de yeniden verilmesi gerekiyor.
revoke all on function public.complete_task(uuid, uuid) from public, anon;
grant execute on function public.complete_task(uuid, uuid) to authenticated;
