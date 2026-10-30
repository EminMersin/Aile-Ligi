-- ============================================================================
-- AİLE LİGİ — 0004: Anonim üye çıkış yaptığında profilini serbest bırak
--
-- Sorun: "Ben Üyeyim" akışında giriş yapan üyeler anonim Supabase hesabı
-- kullanır. Çıkış yapıldığında bu anonim kimlik tamamen silinir; bir dahaki
-- girişte YENİ bir anonim kullanıcı oluşur ve members.user_id eşleşmediği
-- için üye artık "bağlı" (is_linked) sayılan eski profiline dönemez, sadece
-- "yeni üye ekle" seçeneğini görür. Bu fonksiyon, üye çıkış yapmadan hemen
-- önce çağrılır ve profilini tekrar seçilebilir hale getirir.
-- ============================================================================
create or replace function public.unlink_member()
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := app_private.require_auth();
begin
  update public.members
     set is_linked = false,
         user_id = null
   where user_id = v_uid;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.unlink_member() from public, anon;
grant execute on function public.unlink_member() to authenticated;
