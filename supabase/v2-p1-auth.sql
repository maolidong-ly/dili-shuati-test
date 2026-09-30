-- 产品 2.0 · P1：审核注册 + 单设备会话 + 老师管账号
-- 在已有 schema + cross-device-sync 上执行一次。

alter table public.profiles
  add column if not exists status text not null default 'active';

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'active', 'disabled'));

update public.profiles set status = 'active' where status is null;

create table if not exists public.user_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  device_id text not null,
  session_token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create or replace function public._check_access_passphrase(p_passphrase text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select value into v_secret from public.app_secrets where key = 'access_passphrase';
  if v_secret is null or p_passphrase is distinct from v_secret then
    raise exception 'invalid_passphrase';
  end if;
end;
$$;

create or replace function public._check_admin_passphrase(p_admin_passphrase text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select value into v_secret from public.app_secrets where key = 'admin_passphrase';
  if v_secret is null or p_admin_passphrase is distinct from v_secret then
    raise exception 'forbidden';
  end if;
end;
$$;

create or replace function public._normalize_nickname(p_nickname text)
returns text
language plpgsql
immutable
as $$
declare
  v_nick text;
begin
  v_nick := trim(p_nickname);
  if char_length(v_nick) < 2 or char_length(v_nick) > 16 then
    raise exception 'invalid_nickname';
  end if;
  return v_nick;
end;
$$;

create or replace function public.apply_for_nickname(p_passphrase text, p_nickname text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nick text;
  v_row public.profiles%rowtype;
  v_count int;
begin
  perform public._check_access_passphrase(p_passphrase);
  v_nick := public._normalize_nickname(p_nickname);

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

  insert into public.profiles (nickname, status) values (v_nick, 'pending') returning * into v_row;
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

create or replace function public.enter_with_device(
  p_passphrase text,
  p_nickname text,
  p_device_id text
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

create or replace function public.release_device_session(
  p_user_id uuid,
  p_sync_token uuid,
  p_device_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = p_user_id and sync_token = p_sync_token
  ) then
    raise exception 'forbidden';
  end if;
  delete from public.user_sessions
  where user_id = p_user_id and device_id = trim(p_device_id);
end;
$$;

create or replace function public.admin_list_profiles(p_admin_passphrase text)
returns table (
  id uuid,
  nickname text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  return query
  select p.id, p.nickname, p.status, p.created_at
  from public.profiles p
  order by
    case p.status when 'pending' then 0 when 'active' then 1 else 2 end,
    p.created_at desc;
end;
$$;

create or replace function public.admin_set_profile_status(
  p_admin_passphrase text,
  p_profile_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  if p_status not in ('pending', 'active', 'disabled') then
    raise exception 'invalid_status';
  end if;
  update public.profiles set status = p_status where id = p_profile_id;
  if not found then
    raise exception 'not_found';
  end if;
  if p_status in ('pending', 'disabled') then
    delete from public.user_sessions where user_id = p_profile_id;
  end if;
end;
$$;

create or replace function public.admin_delete_profile(
  p_admin_passphrase text,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  delete from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

-- 兼容：旧客户端仍调用 enter_with_nickname 时走新规则（无 device 则无法防双开）
create or replace function public.enter_with_nickname(p_passphrase text, p_nickname text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nick text;
  v_row public.profiles%rowtype;
  v_count int;
begin
  perform public._check_access_passphrase(p_passphrase);
  v_nick := public._normalize_nickname(p_nickname);

  select * into v_row from public.profiles where nickname = v_nick;
  if found then
    if v_row.status = 'pending' then
      raise exception 'pending_approval';
    end if;
    if v_row.status = 'disabled' then
      raise exception 'account_disabled';
    end if;
    return json_build_object(
      'id', v_row.id,
      'nickname', v_row.nickname,
      'sync_token', v_row.sync_token,
      'restored', true
    );
  end if;

  select count(*) into v_count from public.profiles where status in ('pending', 'active');
  if v_count >= 100 then
    raise exception 'quota_full';
  end if;

  insert into public.profiles (nickname, status) values (v_nick, 'pending') returning * into v_row;
  insert into public.user_saved_state (user_id) values (v_row.id);
  raise exception 'pending_approval';
exception
  when unique_violation then
    raise exception 'nickname_taken';
end;
$$;

grant execute on function public.apply_for_nickname(text, text) to anon, authenticated;
grant execute on function public.enter_with_device(text, text, text) to anon, authenticated;
grant execute on function public.release_device_session(uuid, uuid, text) to anon, authenticated;
grant execute on function public.admin_list_profiles(text) to anon, authenticated;
grant execute on function public.admin_set_profile_status(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_delete_profile(text, uuid) to anon, authenticated;
