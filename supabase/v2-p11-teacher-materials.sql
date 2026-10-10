-- 教师资料上传 · 学生分类/搜索下载

create table if not exists public.teacher_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (
    category in ('exam_gaokao', 'exam_mock', 'map', 'knowledge_list')
  ),
  storage_path text not null unique,
  byte_size bigint not null default 0,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists teacher_materials_category_idx
  on public.teacher_materials (category, created_at desc);

create index if not exists teacher_materials_title_idx
  on public.teacher_materials (title);

create or replace function public.list_teacher_materials(
  p_category text default null,
  p_search text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search text;
begin
  v_search := nullif(trim(p_search), '');

  return coalesce((
    select json_agg(json_build_object(
      'id', m.id,
      'title', m.title,
      'category', m.category,
      'storage_path', m.storage_path,
      'byte_size', m.byte_size,
      'content_type', m.content_type,
      'created_at', m.created_at
    ) order by m.created_at desc)
    from public.teacher_materials m
    where (p_category is null or p_category = '' or m.category = p_category)
      and (
        v_search is null
        or m.title ilike '%' || v_search || '%'
      )
  ), '[]'::json);
end;
$$;

create or replace function public.admin_register_material(
  p_admin_passphrase text,
  p_title text,
  p_category text,
  p_storage_path text,
  p_byte_size bigint,
  p_content_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public._check_admin_passphrase(p_admin_passphrase);

  if p_category not in ('exam_gaokao', 'exam_mock', 'map', 'knowledge_list') then
    raise exception 'invalid_category';
  end if;

  if length(trim(p_title)) < 1 or length(trim(p_title)) > 120 then
    raise exception 'invalid_title';
  end if;

  if length(trim(p_storage_path)) < 3 then
    raise exception 'invalid_path';
  end if;

  insert into public.teacher_materials (
    title, category, storage_path, byte_size, content_type
  )
  values (
    trim(p_title),
    p_category,
    trim(p_storage_path),
    coalesce(p_byte_size, 0),
    nullif(trim(p_content_type), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_delete_material(
  p_admin_passphrase text,
  p_material_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  perform public._check_admin_passphrase(p_admin_passphrase);

  delete from public.teacher_materials
  where id = p_material_id
  returning storage_path into v_path;

  if v_path is null then
    raise exception 'not_found';
  end if;

  return v_path;
end;
$$;

create or replace function public.admin_list_materials(p_admin_passphrase text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_passphrase(p_admin_passphrase);
  return public.list_teacher_materials(null, null);
end;
$$;

grant execute on function public.list_teacher_materials(text, text) to anon, authenticated;
grant execute on function public.admin_register_material(text, text, text, text, bigint, text) to anon, authenticated;
grant execute on function public.admin_delete_material(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_materials(text) to anon, authenticated;

-- Storage 桶（在 Supabase Dashboard → Storage 也可手动创建同名 public 桶）
insert into storage.buckets (id, name, public, file_size_limit)
values ('teacher-materials', 'teacher-materials', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "teacher materials public read" on storage.objects;
create policy "teacher materials public read"
on storage.objects for select
using (bucket_id = 'teacher-materials');

drop policy if exists "teacher materials anon insert" on storage.objects;
create policy "teacher materials anon insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'teacher-materials');

drop policy if exists "teacher materials anon update" on storage.objects;
create policy "teacher materials anon update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'teacher-materials');

drop policy if exists "teacher materials anon delete" on storage.objects;
create policy "teacher materials anon delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'teacher-materials');
