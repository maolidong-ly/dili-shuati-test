-- 每题分别统计正确次数、错误次数

alter table public.user_question_state
  add column if not exists correct_count int not null default 0;

alter table public.user_question_state
  add column if not exists wrong_count int not null default 0;

update public.user_question_state
set
  correct_count = case when ever_correct then greatest(1, attempt_count) else 0 end,
  wrong_count = case
    when ever_correct then greatest(0, attempt_count - 1)
    else greatest(attempt_count, case when attempted then 1 else 0 end)
  end
where correct_count = 0 and wrong_count = 0 and attempt_count > 0;

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

  insert into public.user_question_state (
    user_id, question_id, attempted, ever_correct, last_answered_at,
    attempt_count, correct_count, wrong_count
  )
  values (
    p_user_id, p_question_id, true, p_correct, now(), 1,
    case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end
  )
  on conflict (user_id, question_id) do update
  set
    attempted = true,
    ever_correct = public.user_question_state.ever_correct or excluded.ever_correct,
    last_answered_at = now(),
    attempt_count = public.user_question_state.attempt_count + 1,
    correct_count = public.user_question_state.correct_count
      + case when p_correct then 1 else 0 end,
    wrong_count = public.user_question_state.wrong_count
      + case when p_correct then 0 else 1 end;

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

create or replace function public.admin_get_student_chapter_attempts(
  p_admin_passphrase text,
  p_profile_id uuid,
  p_chapter_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_passphrase(p_admin_passphrase);

  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'not_found';
  end if;

  return coalesce((
    select json_agg(json_build_object(
      'question_id', q.id,
      'unit_id', q.unit_id,
      'question_type', q.question_type,
      'stem', q.stem,
      'sort_order', q.sort_order,
      'correct_count', coalesce(u.correct_count, 0),
      'wrong_count', coalesce(u.wrong_count, 0),
      'last_answered_at', u.last_answered_at
    ) order by q.unit_id, q.sort_order, q.id)
    from public.questions q
    left join public.user_question_state u
      on u.question_id = q.id and u.user_id = p_profile_id
    where q.unit_id = p_chapter_id
       or q.unit_id like p_chapter_id || '-s%'
  ), '[]'::json);
end;
$$;
