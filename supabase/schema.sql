-- 在 Supabase SQL Editor 中执行一次。
-- 将下方访问口令改为你自己的（仅服务端校验，不要写进前端仓库）。

create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);

insert into public.app_secrets (key, value)
values ('access_passphrase', '请改成你的口令')
on conflict (key) do update set value = excluded.value;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  sync_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.chapter_stats (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id text not null,
  answered int not null default 0 check (answered >= 0),
  correct int not null default 0 check (correct >= 0 and correct <= answered),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

alter table public.profiles enable row level security;
alter table public.chapter_stats enable row level security;
alter table public.app_secrets enable row level security;

create policy profiles_select on public.profiles for select using (true);
create policy stats_select on public.chapter_stats for select using (true);

revoke all on public.app_secrets from anon, authenticated;

create or replace function public.register_nickname(p_passphrase text, p_nickname text)
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

  return json_build_object(
    'id', v_row.id,
    'nickname', v_row.nickname,
    'sync_token', v_row.sync_token,
    'restored', false
  );
exception
  when unique_violation then
    raise exception 'nickname_taken';
end;
$$;

create or replace function public.upsert_chapter_stats(
  p_user_id uuid,
  p_sync_token uuid,
  p_chapter_id text,
  p_answered int,
  p_correct int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and sync_token = p_sync_token
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.chapter_stats (user_id, chapter_id, answered, correct, updated_at)
  values (p_user_id, p_chapter_id, p_answered, p_correct, now())
  on conflict (user_id, chapter_id) do update
  set
    answered = greatest(public.chapter_stats.answered, excluded.answered),
    correct = greatest(public.chapter_stats.correct, excluded.correct),
    updated_at = now();
end;
$$;

create or replace function public.leaderboard_stats(p_chapter_id text)
returns table (
  nickname text,
  chapter_id text,
  answered int,
  correct int
)
language sql
stable
security definer
set search_path = public
as $$
  select p.nickname, cs.chapter_id, cs.answered, cs.correct
  from public.chapter_stats cs
  join public.profiles p on p.id = cs.user_id
  where p_chapter_id is null or cs.chapter_id = p_chapter_id
  order by cs.answered desc;
$$;

grant execute on function public.register_nickname(text, text) to anon, authenticated;
grant execute on function public.upsert_chapter_stats(uuid, uuid, text, int, int) to anon, authenticated;
grant execute on function public.leaderboard_stats(text) to anon, authenticated;

-- 题目星级（老师后台维护，question_id 与题库 JSON 中 id 一致）
create table if not exists public.question_meta (
  question_id text primary key,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now()
);

alter table public.question_meta enable row level security;
create policy question_meta_select on public.question_meta for select using (true);

insert into public.app_secrets (key, value)
values ('admin_passphrase', '请改成老师后台口令')
on conflict (key) do update set value = excluded.value;

create or replace function public.set_question_stars(
  p_admin_passphrase text,
  p_question_id text,
  p_stars int
)
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
  if p_stars < 1 or p_stars > 5 then
    raise exception 'invalid_stars';
  end if;
  insert into public.question_meta (question_id, stars, updated_at)
  values (trim(p_question_id), p_stars, now())
  on conflict (question_id) do update
  set stars = excluded.stars, updated_at = now();
end;
$$;

grant execute on function public.set_question_stars(text, text, int) to anon, authenticated;
