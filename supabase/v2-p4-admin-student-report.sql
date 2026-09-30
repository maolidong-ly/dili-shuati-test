-- 老师查看学生刷题 / 错题 / 章榜 / 最近练习

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
  v_attempted int;
  v_ever_correct int;
begin
  perform public._check_admin_passphrase(p_admin_passphrase);

  select * into v_profile from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'not_found';
  end if;

  select * into v_saved from public.user_saved_state where user_id = p_profile_id;

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
    'progress', coalesce(v_saved.progress, '{}'::jsonb),
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

grant execute on function public.admin_get_student_report(text, uuid) to anon, authenticated;
