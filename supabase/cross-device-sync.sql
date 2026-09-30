-- 在已有 schema 上追加执行：昵称续登 + 进度/错题云同步

create table if not exists public.user_saved_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  wrong_book jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_saved_state enable row level security;

create or replace function public.enter_with_nickname(p_passphrase text, p_nickname text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_count int;
  v_row public.profiles%rowtype;
  v_nick text;
begin
  select value into v_secret from public.app_secrets where key = 'access_passphrase';
  if v_secret is null or p_passphrase is distinct from v_secret then
    raise exception 'invalid_passphrase';
  end if;

  v_nick := trim(p_nickname);
  if char_length(v_nick) < 2 or char_length(v_nick) > 16 then
    raise exception 'invalid_nickname';
  end if;

  select * into v_row from public.profiles where nickname = v_nick;
  if found then
    return json_build_object(
      'id', v_row.id,
      'nickname', v_row.nickname,
      'sync_token', v_row.sync_token,
      'restored', true
    );
  end if;

  select count(*) into v_count from public.profiles;
  if v_count >= 100 then
    raise exception 'quota_full';
  end if;

  insert into public.profiles (nickname) values (v_nick) returning * into v_row;

  insert into public.user_saved_state (user_id) values (v_row.id);

  return json_build_object(
    'id', v_row.id,
    'nickname', v_row.nickname,
    'sync_token', v_row.sync_token,
    'restored', false
  );
end;
$$;

create or replace function public.get_user_saved_state(p_user_id uuid, p_sync_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_saved_state%rowtype;
begin
  if not exists (
    select 1 from public.profiles where id = p_user_id and sync_token = p_sync_token
  ) then
    raise exception 'forbidden';
  end if;

  select * into v_row from public.user_saved_state where user_id = p_user_id;
  if not found then
    return json_build_object('progress', '{}'::jsonb, 'wrong_book', '[]'::jsonb);
  end if;

  return json_build_object(
    'progress', v_row.progress,
    'wrong_book', v_row.wrong_book,
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function public.upsert_user_saved_state(
  p_user_id uuid,
  p_sync_token uuid,
  p_progress jsonb,
  p_wrong_book jsonb
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

  insert into public.user_saved_state (user_id, progress, wrong_book, updated_at)
  values (p_user_id, coalesce(p_progress, '{}'::jsonb), coalesce(p_wrong_book, '[]'::jsonb), now())
  on conflict (user_id) do update
  set
    progress = public.user_saved_state.progress || excluded.progress,
    wrong_book = excluded.wrong_book,
    updated_at = now();
end;
$$;

grant execute on function public.enter_with_nickname(text, text) to anon, authenticated;
grant execute on function public.get_user_saved_state(uuid, uuid) to anon, authenticated;
grant execute on function public.upsert_user_saved_state(uuid, uuid, jsonb, jsonb) to anon, authenticated;
