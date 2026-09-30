-- 【已弃用】请改用「学生申请 + 老师后台审核」，不要批量预占昵称。
-- 若误跑过本脚本，可用 scripts/delete-preset-profiles.mjs 清理 学生001-100。
--
-- 默认昵称：学生001 … 学生100（可改下面 v_prefix / 循环范围）
-- 执行前如有测试号可删： delete from public.profiles where nickname = 'test01';

do $$
declare
  i int;
  v_nick text;
  v_id uuid;
  v_prefix text := '学生';
begin
  for i in 1..100 loop
    v_nick := v_prefix || lpad(i::text, 3, '0');
    if exists (select 1 from public.profiles where nickname = v_nick) then
      continue;
    end if;
    insert into public.profiles (nickname) values (v_nick) returning id into v_id;
    insert into public.user_saved_state (user_id) values (v_id);
  end loop;
end $$;

select count(*) as profile_count from public.profiles;
