-- "¿Olvidaste tu contraseña?" desde la plataforma: el mail lo manda el servidor (Resend) con un link a nuestro dominio.
-- Freno contra abusos: como máximo 3 pedidos por mail y 10 por conexión por hora.
-- Se guardan solo huellas (HMAC) del mail y de la IP, nunca el dato en claro.
create table public.password_reset_requests (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  at timestamptz not null default now()
);
create index password_reset_requests_email_idx on public.password_reset_requests (email_hash, at);
create index password_reset_requests_ip_idx on public.password_reset_requests (ip_hash, at);
alter table public.password_reset_requests enable row level security;
-- Sin políticas: nadie lo lee desde la API; solo el servidor por la función de abajo.

create or replace function public.password_reset_allowed(p_email_hash text, p_ip_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.password_reset_requests where email_hash = p_email_hash and at > now() - interval '1 hour') >= 3
     or (select count(*) from public.password_reset_requests where ip_hash = p_ip_hash and at > now() - interval '1 hour') >= 10 then
    return false;
  end if;
  insert into public.password_reset_requests (email_hash, ip_hash) values (p_email_hash, p_ip_hash);
  return true;
end;
$$;
revoke execute on function public.password_reset_allowed(text, text) from public, anon, authenticated;
grant execute on function public.password_reset_allowed(text, text) to service_role;
