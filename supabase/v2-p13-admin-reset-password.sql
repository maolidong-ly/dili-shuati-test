-- 老师后台重置学生登录密码

create or replace function public.admin_reset_account_password(
  p_admin_passphrase text,
  p_profile_id uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  v_hash := public._hash_account_password(p_new_password);

  update public.profiles
  set password_hash = v_hash
  where id = p_profile_id;

  if not found then
    raise exception 'not_found';
  end if;

  delete from public.user_sessions where user_id = p_profile_id;
end;
$$;

grant execute on function public.admin_reset_account_password(text, uuid, text) to anon, authenticated;
