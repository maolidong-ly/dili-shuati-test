-- Fix: json 类型不支持 ? 运算符，录题（尤其判断/单选）会报 operator does not exist: json ? unknown

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
