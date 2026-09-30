-- 进度 JSON 必须与 user_question_state（真实提交）一致；禁止 upsert 合并脏 progress

create or replace function public._sanitize_progress_for_user(
  p_user_id uuid,
  p_progress jsonb
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  unit_key text;
  unit_val jsonb;
  new_answered jsonb;
  new_correct jsonb;
  qid text;
begin
  if p_progress is null or p_progress = '{}'::jsonb then
    return '{}'::jsonb;
  end if;

  for unit_key, unit_val in select * from jsonb_each(p_progress)
  loop
    new_answered := '[]'::jsonb;
    new_correct := '[]'::jsonb;

    for qid in
      select jsonb_array_elements_text(coalesce(unit_val->'answeredIds', '[]'::jsonb))
    loop
      if exists (
        select 1 from public.user_question_state u
        where u.user_id = p_user_id
          and u.question_id = qid
          and u.attempt_count > 0
      ) then
        new_answered := new_answered || to_jsonb(qid);
      end if;
    end loop;

    for qid in
      select jsonb_array_elements_text(coalesce(unit_val->'correctIds', '[]'::jsonb))
    loop
      if exists (
        select 1 from public.user_question_state u
        where u.user_id = p_user_id
          and u.question_id = qid
          and u.ever_correct
      ) then
        new_correct := new_correct || to_jsonb(qid);
      end if;
    end loop;

    if jsonb_array_length(new_answered) > 0 then
      result := result || jsonb_build_object(
        unit_key,
        jsonb_build_object(
          'answeredIds', new_answered,
          'correctIds', new_correct
        )
      );
    end if;
  end loop;

  return result;
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
  v_progress jsonb;
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

  v_progress := public._sanitize_progress_for_user(p_user_id, v_row.progress);

  if v_progress is distinct from v_row.progress then
    update public.user_saved_state
    set progress = v_progress, updated_at = now()
    where user_id = p_user_id;
  end if;

  return json_build_object(
    'progress', v_progress,
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
declare
  v_progress jsonb;
begin
  if not exists (
    select 1 from public.profiles where id = p_user_id and sync_token = p_sync_token
  ) then
    raise exception 'forbidden';
  end if;

  v_progress := public._sanitize_progress_for_user(
    p_user_id,
    coalesce(p_progress, '{}'::jsonb)
  );

  insert into public.user_saved_state (user_id, progress, wrong_book, updated_at)
  values (p_user_id, v_progress, coalesce(p_wrong_book, '[]'::jsonb), now())
  on conflict (user_id) do update
  set
    progress = excluded.progress,
    wrong_book = excluded.wrong_book,
    updated_at = now();
end;
$$;

create or replace function public.admin_get_student_report(
  p_admin_passphrase text,
  p_profile_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_saved public.user_saved_state%rowtype;
  v_progress jsonb;
  v_attempted int;
  v_ever_correct int;
begin
  perform public._check_admin_passphrase(p_admin_passphrase);

  select * into v_profile from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'not_found';
  end if;

  select * into v_saved from public.user_saved_state where user_id = p_profile_id;
  v_progress := public._sanitize_progress_for_user(
    p_profile_id,
    coalesce(v_saved.progress, '{}'::jsonb)
  );

  select count(*)::int, count(*) filter (where ever_correct)::int
  into v_attempted, v_ever_correct
  from public.user_question_state where user_id = p_profile_id;

  return json_build_object(
    'profile', json_build_object(
      'id', v_profile.id,
      'nickname', v_profile.nickname,
      'status', v_profile.status,
      'created_at', v_profile.created_at
    ),
    'progress', v_progress,
    'wrong_book', coalesce(v_saved.wrong_book, '[]'::jsonb),
    'saved_updated_at', v_saved.updated_at,
    'question_stats', json_build_object(
      'attempted', coalesce(v_attempted, 0),
      'ever_correct', coalesce(v_ever_correct, 0),
      'accuracy', case
        when coalesce(v_attempted, 0) = 0 then 0
        else round((v_ever_correct::numeric / v_attempted::numeric) * 100, 2)
      end
    ),
    'chapter_scores', (
      select coalesce(json_agg(json_build_object(
        'chapter_id', s.chapter_id,
        'score', s.score,
        'completed_at', s.completed_at
      ) order by s.completed_at desc), '[]'::json)
      from public.chapter_leaderboard_scores s
      where s.user_id = p_profile_id
    ),
    'recent_sessions', (
      select coalesce(json_agg(json_build_object(
        'id', ps.id,
        'unit_id', ps.unit_id,
        'started_at', ps.started_at,
        'ended_at', ps.ended_at,
        'session_score', ps.session_score,
        'answered_count', ps.answered_count,
        'correct_count', ps.correct_count
      ) order by ps.started_at desc), '[]'::json)
      from (
        select * from public.practice_sessions
        where user_id = p_profile_id
        order by started_at desc
        limit 10
      ) ps
    )
  );
end;
$$;

-- 清理已有脏 progress
update public.user_saved_state u
set
  progress = public._sanitize_progress_for_user(u.user_id, u.progress),
  updated_at = now()
where public._sanitize_progress_for_user(u.user_id, u.progress) is distinct from u.progress;
