-- ============================================================================
-- AİLE LİGİ — 0005: Ebeveyn, sıkışmış bir üyenin bağlantısını elle kaldırabilsin
--
-- Sorun: 0004 numaralı göç yalnızca BUNDAN SONRAKİ çıkışlarda devreye girer.
-- Migration çalıştırılmadan ÖNCE zaten "bağlı" (is_linked = true) hale gelmiş
-- ve o oturumdan çıkılmış üyeler kalıcı olarak kilitli kalır: eski anonim
-- oturumun kimliğine artık erişim yoktur, bu yüzden unlink_member() bu
-- üyeler için hiçbir zaman çağrılamaz. Bu fonksiyon, aynı ailedeki bir
-- ebeveynin böyle sıkışmış bir üyeyi elle serbest bırakmasına izin verir.
-- ============================================================================
create or replace function public.force_unlink_member(p_member_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family_id uuid := app_private.current_family_id();
begin
  if v_family_id is null or not app_private.is_parent() then
    raise exception 'not_authorized';
  end if;

  update public.members
     set is_linked = false,
         user_id = null
   where id = p_member_id
     and family_id = v_family_id
     and role <> 'parent';

  if not found then
    raise exception 'not_found';
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.force_unlink_member(uuid) from public, anon;
grant execute on function public.force_unlink_member(uuid) to authenticated;
