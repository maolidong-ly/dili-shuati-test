-- P2：云端题库 + 老师录题（单选 / 多选）

create table if not exists public.questions (
  id text primary key,
  unit_id text not null,
  question_type text not null check (question_type in ('single', 'multiple')),
  stem text not null,
  options jsonb not null,
  correct_single smallint,
  correct_multiple smallint[],
  explanation text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_single_answer check (
    (question_type = 'single' and correct_single is not null and correct_multiple is null)
    or (question_type = 'multiple' and correct_multiple is not null and array_length(correct_multiple, 1) >= 2)
  )
);

create index if not exists questions_unit_id_idx on public.questions (unit_id);

create table if not exists public.chapter_catalog_versions (
  chapter_id text primary key,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.questions enable row level security;
create policy questions_select on public.questions for select using (true);

create or replace function public.list_questions_for_unit(p_unit_id text)
returns setof public.questions
language sql
stable
security definer
set search_path = public
as $$
  select * from public.questions
  where unit_id = p_unit_id
  order by sort_order asc, created_at asc;
$$;

create or replace function public._bump_chapter_for_unit(p_unit_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  null;
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
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  v_unit := p_payload->>'unit_id';
  insert into public.questions (
    id, unit_id, question_type, stem, options,
    correct_single, correct_multiple, explanation, sort_order, updated_at
  )
  values (
    p_payload->>'id',
    v_unit,
    p_payload->>'question_type',
    p_payload->>'stem',
    p_payload->'options',
    (p_payload->>'correct_single')::smallint,
    case when p_payload ? 'correct_multiple' then
      array(select jsonb_array_elements_text(p_payload->'correct_multiple')::smallint)
    else null end,
    nullif(p_payload->>'explanation', ''),
    coalesce((p_payload->>'sort_order')::int, 0),
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
  return v_row;
end;
$$;

create or replace function public.admin_delete_question(
  p_admin_passphrase text,
  p_question_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit text;
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  select unit_id into v_unit from public.questions where id = p_question_id;
  delete from public.questions where id = p_question_id;
  if v_unit is not null then
    perform public._bump_chapter_for_unit(v_unit);
  end if;
end;
$$;

grant execute on function public.list_questions_for_unit(text) to anon, authenticated;
grant execute on function public._bump_chapter_for_unit(text) to anon, authenticated;
grant execute on function public.admin_upsert_question(text, json) to anon, authenticated;
grant execute on function public.admin_delete_question(text, text) to anon, authenticated;
