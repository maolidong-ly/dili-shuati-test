-- 录题配图 · 公开读、老师端上传（与 teacher-materials 相同策略）

insert into storage.buckets (id, name, public, file_size_limit)
values ('question-images', 'question-images', true, 10485760)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "question images public read" on storage.objects;
create policy "question images public read"
on storage.objects for select
using (bucket_id = 'question-images');

drop policy if exists "question images anon insert" on storage.objects;
create policy "question images anon insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'question-images');

drop policy if exists "question images anon update" on storage.objects;
create policy "question images anon update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'question-images');

drop policy if exists "question images anon delete" on storage.objects;
create policy "question images anon delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'question-images');
