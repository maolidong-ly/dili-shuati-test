-- 学生按单元拉取每题练习次数（题号选做角标）

create or replace function public.get_user_unit_question_attempts(
  p_user_id uuid,
  p_sync_token uuid,
  p_unit_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and sync_token = p_sync_token and status = 'active'
  ) then
    raise exception 'forbidden';
  end if;

  return coalesce((
    select json_agg(json_build_object(
      'question_id', q.id,
      'attempt_count', coalesce(u.attempt_count, 0)
    ) order by q.sort_order, q.id)
    from public.questions q
    left join public.user_question_state u
      on u.question_id = q.id and u.user_id = p_user_id
    where q.unit_id = p_unit_id
  ), '[]'::json);
end;
$$;

grant execute on function public.get_user_unit_question_attempts(uuid, uuid, text) to anon, authenticated;
