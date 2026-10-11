-- Supabase 将 pgcrypto 装在 extensions schema，需显式引用 gen_salt/crypt

create extension if not exists pgcrypto with schema extensions;

create or replace function public._hash_account_password(p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pw text;
begin
  v_pw := public._normalize_account_password(p_password);
  return extensions.crypt(v_pw, extensions.gen_salt('bf'));
end;
$$;

create or replace function public._verify_account_password(p_password text, p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pw text := trim(p_password);
begin
  if p_hash is null or p_hash = '' then
    return v_pw = '';
  end if;
  if v_pw = '' then
    return false;
  end if;
  return extensions.crypt(v_pw, p_hash) = p_hash;
end;
$$;
