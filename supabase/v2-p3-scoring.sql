-- P3：当次练习分、章榜、总正确率、答题状态

create table if not exists public.user_question_state (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null,
  attempted boolean not null default true,
  ever_correct boolean not null default false,
  last_answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  unit_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  answered_count int not null default 0,
  correct_count int not null default 0,
  session_score numeric(5, 2)
);

create table if not exists public.practice_session_answers (
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  question_id text not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id)
);

create table if not exists public.chapter_leaderboard_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id text not null,
  score numeric(5, 2) not null,
  catalog_version int not null default 1,
  completed_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create or replace function public._chapter_id_for_unit(p_unit_id text)
returns text
language sql
immutable
as $$
  select case
    when p_unit_id ~ '-s[0-9]+$' then regexp_replace(p_unit_id, '-s[0-9]+$', '')
    else p_unit_id
  end;
$$;

create or replace function public.record_question_result(
  p_user_id uuid,
  p_sync_token uuid,
  p_question_id text,
  p_chapter_id text,
  p_correct boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chapter text;
  v_total int;
  v_attempted int;
  v_correct int;
  v_score numeric(5, 2);
  v_version int;
begin
  if not exists (
    select 1 from public.profiles where id = p_user_id and sync_token = p_sync_token and status = 'active'
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.user_question_state (user_id, question_id, attempted, ever_correct, last_answered_at)
  values (p_user_id, p_question_id, true, p_correct, now())
  on conflict (user_id, question_id) do update
  set
    attempted = true,
    ever_correct = public.user_question_state.ever_correct or excluded.ever_correct,
    last_answered_at = now();

  v_chapter := coalesce(nullif(trim(p_chapter_id), ''), public._chapter_id_for_unit(p_question_id));
  if v_chapter is null or v_chapter like 'topic-%' then
    return json_build_object('chapter_completed', false);
  end if;

  select coalesce(version, 1) into v_version
  from public.chapter_catalog_versions where chapter_id = v_chapter;

  select count(*) into v_total
  from public.questions q
  where q.unit_id = v_chapter
     or q.unit_id like v_chapter || '-s%';

  if v_total = 0 then
    return json_build_object('chapter_completed', false, 'chapter_total', 0);
  end if;

  select count(distinct q.id) into v_attempted
  from public.questions q
  join public.user_question_state uqs on uqs.question_id = q.id and uqs.user_id = p_user_id
  where q.unit_id = v_chapter or q.unit_id like v_chapter || '-s%';

  if v_attempted < v_total then
    return json_build_object(
      'chapter_completed', false,
      'chapter_attempted', v_attempted,
      'chapter_total', v_total
    );
  end if;

  select count(distinct q.id) into v_correct
  from public.questions q
  join public.user_question_state uqs on uqs.question_id = q.id and uqs.user_id = p_user_id
  where (q.unit_id = v_chapter or q.unit_id like v_chapter || '-s%')
    and uqs.ever_correct;

  v_score := round((v_correct::numeric / v_total::numeric) * 100, 2);

  insert into public.chapter_leaderboard_scores (user_id, chapter_id, score, catalog_version, completed_at)
  values (p_user_id, v_chapter, v_score, v_version, now())
  on conflict (user_id, chapter_id) do update
  set score = excluded.score,
      catalog_version = excluded.catalog_version,
      completed_at = excluded.completed_at;

  return json_build_object(
    'chapter_completed', true,
    'chapter_score', v_score,
    'chapter_correct', v_correct,
    'chapter_total', v_total
  );
end;
$$;

create or replace function public.start_practice_session(
  p_user_id uuid,
  p_sync_token uuid,
  p_unit_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id = p_user_id and sync_token = p_sync_token and status = 'active'
  ) then
    raise exception 'forbidden';
  end if;
  insert into public.practice_sessions (user_id, unit_id) values (p_user_id, p_unit_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.finish_practice_session(
  p_user_id uuid,
  p_sync_token uuid,
  p_session_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answered int;
  v_correct int;
  v_score numeric(5, 2);
begin
  if not exists (
    select 1 from public.profiles where id = p_user_id and sync_token = p_sync_token
  ) then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1 from public.practice_sessions
    where id = p_session_id and user_id = p_user_id and ended_at is null
  ) then
    raise exception 'not_found';
  end if;

  select count(*)::int, count(*) filter (where correct)::int
  into v_answered, v_correct
  from public.practice_session_answers where session_id = p_session_id;

  v_score := case
    when v_answered = 0 then 0
    else round((v_correct::numeric / v_answered::numeric) * 100, 2)
  end;

  update public.practice_sessions
  set ended_at = now(),
      answered_count = v_answered,
      correct_count = v_correct,
      session_score = v_score
  where id = p_session_id;

  return json_build_object(
    'answered', v_answered,
    'correct', v_correct,
    'session_score', v_score
  );
end;
$$;

create or replace function public.record_session_answer(
  p_user_id uuid,
  p_sync_token uuid,
  p_session_id uuid,
  p_question_id text,
  p_correct boolean,
  p_chapter_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.practice_sessions
    where id = p_session_id and user_id = p_user_id and ended_at is null
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.practice_session_answers (session_id, question_id, correct)
  values (p_session_id, p_question_id, p_correct)
  on conflict (session_id, question_id) do update
  set correct = excluded.correct, answered_at = now();

  return public.record_question_result(
    p_user_id, p_sync_token, p_question_id, coalesce(p_chapter_id, ''), p_correct
  );
end;
$$;

create or replace function public.leaderboard_chapter_scores(p_chapter_id text)
returns table (nickname text, chapter_id text, score numeric, completed_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.nickname, s.chapter_id, s.score, s.completed_at
  from public.chapter_leaderboard_scores s
  join public.profiles p on p.id = s.user_id and p.status = 'active'
  where s.chapter_id = p_chapter_id
  order by s.score desc, s.completed_at asc;
$$;

create or replace function public.leaderboard_global_accuracy()
returns table (nickname text, attempted int, correct int, accuracy numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.nickname,
    count(*)::int as attempted,
    count(*) filter (where u.ever_correct)::int as correct,
    case
      when count(*) = 0 then 0
      else round((count(*) filter (where u.ever_correct)::numeric / count(*)::numeric) * 100, 2)
    end as accuracy
  from public.user_question_state u
  join public.profiles p on p.id = u.user_id and p.status = 'active'
  group by p.nickname
  order by accuracy desc, correct desc;
$$;

grant execute on function public.record_question_result(uuid, uuid, text, text, boolean) to anon, authenticated;
grant execute on function public.start_practice_session(uuid, uuid, text) to anon, authenticated;
grant execute on function public.finish_practice_session(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.record_session_answer(uuid, uuid, uuid, text, boolean, text) to anon, authenticated;
grant execute on function public.leaderboard_chapter_scores(text) to anon, authenticated;
grant execute on function public.leaderboard_global_accuracy() to anon, authenticated;

-- 修正 P2 bump：按章失效章榜
create or replace function public._bump_chapter_for_unit(p_unit_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chapter_id text;
begin
  if p_unit_id like 'topic-%' then
    return;
  end if;
  v_chapter_id := public._chapter_id_for_unit(p_unit_id);
  insert into public.chapter_catalog_versions (chapter_id, version, updated_at)
  values (v_chapter_id, 1, now())
  on conflict (chapter_id) do update
  set version = public.chapter_catalog_versions.version + 1,
      updated_at = now();
  delete from public.chapter_leaderboard_scores where chapter_id = v_chapter_id;
end;
$$;

create or replace function public.admin_upsert_question(
  p_admin_passphrase text,
  p_payload json
)
returns public.questions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.questions%rowtype;
  v_unit text;
  v_old_unit text;
  v_payload jsonb := p_payload::jsonb;
begin
  perform public._check_admin_passphrase(p_admin_passphrase);

  select unit_id into v_old_unit from public.questions where id = v_payload->>'id';
  v_unit := v_payload->>'unit_id';

  insert into public.questions (
    id, unit_id, question_type, stem, options,
    correct_single, correct_multiple, explanation, sort_order, updated_at
  )
  values (
    v_payload->>'id',
    v_unit,
    v_payload->>'question_type',
    v_payload->>'stem',
    v_payload->'options',
    (v_payload->>'correct_single')::smallint,
    case when v_payload ? 'correct_multiple' then
      array(select jsonb_array_elements_text(v_payload->'correct_multiple')::smallint)
    else null end,
    nullif(v_payload->>'explanation', ''),
    coalesce((v_payload->>'sort_order')::int, 0),
    now()
  )
  on conflict (id) do update set
    unit_id = excluded.unit_id,
    question_type = excluded.question_type,
    stem = excluded.stem,
    options = excluded.options,
    correct_single = excluded.correct_single,
    correct_multiple = excluded.correct_multiple,
    explanation = excluded.explanation,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning * into v_row;

  perform public._bump_chapter_for_unit(v_unit);
  if v_old_unit is not null and v_old_unit is distinct from v_unit then
    perform public._bump_chapter_for_unit(v_old_unit);
  end if;
  return v_row;
end;
$$;
