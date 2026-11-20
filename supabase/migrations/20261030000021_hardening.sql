-- Endurecimiento (defensa en profundidad). Toda escritura pasa por funciones security definer que validan
-- quién llama, así que los roles de la API no necesitan escribir tablas directo.

-- 1. Sin permisos de escritura directa sobre las tablas (ni ahora ni en tablas futuras)
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from authenticated;

-- 2. Las huellas y el cifrado del documento no salen nunca por la API
revoke select on public.people from authenticated;
grant select (id, auth_user_id, first_name, last_name, email, sex, birth_date, province, city, locale,
  must_change_password, guardian_consent, created_at, deleted_at, doc_country, doc_type) on public.people to authenticated;

-- 3. Límite de intentos de login (el servidor llama a Supabase Auth desde la IP de Vercel, así que
--    el límite por IP de Supabase no distingue personas). Solo huellas HMAC, nunca el mail ni la IP.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index login_attempts_email_idx on public.login_attempts (email_hash, at);
create index login_attempts_ip_idx on public.login_attempts (ip_hash, at);
alter table public.login_attempts enable row level security;

-- ¿Puede intentar? 8 fallos por cuenta y 40 por IP en 15 minutos
create or replace function public.login_allowed(p_email_hash text, p_ip_hash text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.login_attempts where email_hash = p_email_hash and not ok and at > now() - interval '15 minutes') < 8
     and (select count(*) from public.login_attempts where ip_hash = p_ip_hash and not ok and at > now() - interval '15 minutes') < 40;
$$;

create or replace function public.login_record(p_email_hash text, p_ip_hash text, p_ok boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.login_attempts (email_hash, ip_hash, ok) values (p_email_hash, p_ip_hash, p_ok);
  -- Un login correcto limpia los fallos de esa cuenta; lo viejo se descarta
  if p_ok then update public.login_attempts set ok = true where email_hash = p_email_hash and not ok; end if;
  delete from public.login_attempts where at < now() - interval '2 days';
end;
$$;

revoke execute on function public.login_allowed(text, text) from public, anon, authenticated;
revoke execute on function public.login_record(text, text, boolean) from public, anon, authenticated;
grant execute on function public.login_allowed(text, text) to service_role;
grant execute on function public.login_record(text, text, boolean) to service_role;
