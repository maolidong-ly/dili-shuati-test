-- 学生个人登录密码（申请时设置，审核通过后用于登录）

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists password_hash text;

create or replace function public._normalize_account_password(p_password text)
returns text
language plpgsql
immutable
as $$
declare
  v_pw text := trim(p_password);
begin
  if v_pw is null or length(v_pw) < 4 or length(v_pw) > 32 then
    raise exception 'invalid_password';
  end if;
  return v_pw;
end;
$$;

create or replace function public._hash_account_password(p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pw text;
begin
  v_pw := public._normalize_account_password(p_password);
  return crypt(v_pw, gen_salt('bf'));
end;
$$;

create or replace function public._verify_account_password(p_password text, p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pw text := trim(p_password);
begin
  if p_hash is null or p_hash = '' then
    return v_pw = '';
  end if;
  if v_pw = '' then
    return false;
  end if;
  return crypt(v_pw, p_hash) = p_hash;
end;
$$;

drop function if exists public.apply_for_nickname(text, text);

create or replace function public.apply_for_nickname(
  p_passphrase text,
  p_nickname text,
  p_account_password text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nick text;
  v_row public.profiles%rowtype;
  v_count int;
  v_hash text;
begin
  perform public._check_access_passphrase(p_passphrase);
  v_nick := public._normalize_nickname(p_nickname);
  v_hash := public._hash_account_password(p_account_password);

  select * into v_row from public.profiles where nickname = v_nick;
  if found then
    if v_row.status = 'pending' then
      raise exception 'already_pending';
    end if;
    raise exception 'nickname_taken';
  end if;

  select count(*) into v_count from public.profiles where status in ('pending', 'active');
  if v_count >= 100 then
    raise exception 'quota_full';
  end if;

  insert into public.profiles (nickname, status, password_hash)
  values (v_nick, 'pending', v_hash)
  returning * into v_row;

  insert into public.user_saved_state (user_id) values (v_row.id);

  return json_build_object(
    'id', v_row.id,
    'nickname', v_row.nickname,
    'status', v_row.status
  );
exception
  when unique_violation then
    raise exception 'nickname_taken';
end;
$$;

drop function if exists public.enter_with_device(text, text, text);

create or replace function public.enter_with_device(
  p_passphrase text,
  p_nickname text,
  p_device_id text,
  p_account_password text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nick text;
  v_row public.profiles%rowtype;
  v_sess public.user_sessions%rowtype;
  v_device text;
  v_ttl interval := interval '30 days';
  v_token uuid;
begin
  perform public._check_access_passphrase(p_passphrase);
  v_nick := public._normalize_nickname(p_nickname);
  v_device := nullif(trim(p_device_id), '');
  if v_device is null or char_length(v_device) > 128 then
    raise exception 'invalid_device';
  end if;

  select * into v_row from public.profiles where nickname = v_nick;
  if not found then
    raise exception 'nickname_not_found';
  end if;

  if v_row.status = 'pending' then
    raise exception 'pending_approval';
  end if;
  if v_row.status = 'disabled' then
    raise exception 'account_disabled';
  end if;

  if v_row.password_hash is not null then
    if not public._verify_account_password(p_account_password, v_row.password_hash) then
      raise exception 'wrong_password';
    end if;
  elsif nullif(trim(p_account_password), '') is not null then
    raise exception 'wrong_password';
  end if;

  select * into v_sess from public.user_sessions where user_id = v_row.id;
  if found and v_sess.expires_at > now() and v_sess.device_id is distinct from v_device then
    raise exception 'device_in_use';
  end if;

  v_token := gen_random_uuid();
  insert into public.user_sessions (user_id, device_id, session_token, expires_at, updated_at)
  values (v_row.id, v_device, v_token, now() + v_ttl, now())
  on conflict (user_id) do update
  set
    device_id = excluded.device_id,
    session_token = excluded.session_token,
    expires_at = excluded.expires_at,
    updated_at = now();

  return json_build_object(
    'id', v_row.id,
    'nickname', v_row.nickname,
    'sync_token', v_row.sync_token,
    'session_token', v_token,
    'device_id', v_device,
    'restored', true
  );
end;
$$;

drop function if exists public.admin_list_profiles(text);

create or replace function public.admin_list_profiles(p_admin_passphrase text)
returns table (
  id uuid,
  nickname text,
  status text,
  created_at timestamptz,
  has_login_password boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  return query
  select
    p.id,
    p.nickname,
    p.status,
    p.created_at,
    (p.password_hash is not null and p.password_hash <> '')
  from public.profiles p
  order by
    case p.status when 'pending' then 0 when 'active' then 1 else 2 end,
    p.created_at desc;
end;
$$;

grant execute on function public.apply_for_nickname(text, text, text) to anon, authenticated;
grant execute on function public.enter_with_device(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_profiles(text) to anon, authenticated;
