-- Estado de la plataforma: mediciones cada 5 minutos dentro de la base (pg_cron), alertas con umbrales
-- y aviso por mail. CPU, RAM y disco los agrega el servidor (métricas de Supabase) en cada control.
-- Nada de esto guarda datos personales: solo conteos y huellas.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─────────────────────────────────────────────────────────────
-- Eventos de seguridad (los registra el servidor): link compartido inválido, login bloqueado,
-- recuperación bloqueada, cron sin autorización. Solo la huella HMAC de la IP.
-- ─────────────────────────────────────────────────────────────
create table public.security_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('share_invalido', 'login_bloqueado', 'recuperar_bloqueado', 'cron_no_autorizado', 'ping_no_autorizado')),
  ip_hash text,
  at timestamptz not null default now()
);
create index security_events_at_idx on public.security_events (at);
alter table public.security_events enable row level security;

create or replace function public.security_event(p_kind text, p_ip_hash text)
returns void language sql security definer set search_path = '' as $$
  insert into public.security_events (kind, ip_hash) values (p_kind, left(p_ip_hash, 64));
$$;

-- ─────────────────────────────────────────────────────────────
-- Mediciones y alertas
-- ─────────────────────────────────────────────────────────────
create table public.health_samples (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null check (source in ('db', 'server')),
  metrics jsonb not null
);
create index health_samples_at_idx on public.health_samples (source, at desc);
alter table public.health_samples enable row level security;

create table public.health_alerts (
  id bigint generated always as identity primary key,
  kind text not null,
  level text not null check (level in ('aviso', 'critico')),
  message text not null,
  value numeric,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create index health_alerts_created_idx on public.health_alerts (created_at desc);
alter table public.health_alerts enable row level security;

-- Configuración: URL pública de la plataforma (para que la base avise al servidor) y token interno
-- generado acá mismo; nadie lo ve ni lo copia.
create table public.health_settings (
  id int primary key default 1 check (id = 1),
  app_url text,
  ping_token text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.health_settings (id) values (1) on conflict do nothing;
alter table public.health_settings enable row level security;

-- Alerta nueva salvo que la misma ya esté abierta en la última hora
create or replace function private.raise_alert(p_kind text, p_level text, p_message text, p_value numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.health_alerts where kind = p_kind and created_at > now() - interval '1 hour') then return; end if;
  insert into public.health_alerts (kind, level, message, value) values (p_kind, p_level, p_message, p_value);
end;
$$;

-- Medición de la base (cada 5 minutos)
create or replace function private.health_snapshot()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m jsonb; v_max int := current_setting('max_connections')::int; v_top_ip int;
begin
  select max(n) into v_top_ip from (select count(*) n from public.login_attempts where not ok and at > now() - interval '15 minutes' group by ip_hash) x;
  m := jsonb_build_object(
    'conn_total', (select count(*) from pg_stat_activity where backend_type = 'client backend'),
    'conn_active', (select count(*) from pg_stat_activity where backend_type = 'client backend' and state = 'active'),
    'conn_max', v_max,
    'db_bytes', pg_database_size(current_database()),
    'cache_hit', (select round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) from pg_stat_database where datname = current_database()),
    'long_query_s', (select coalesce(max(extract(epoch from now() - query_start))::int, 0) from pg_stat_activity
                     where state = 'active' and backend_type = 'client backend' and pid <> pg_backend_pid()),
    'lock_waits', (select count(*) from pg_stat_activity where wait_event_type = 'Lock'),
    'users_5m', (select count(distinct person_id) from public.daily_activity where last_seen_at > now() - interval '5 minutes'),
    'users_today', (select count(distinct person_id) from public.daily_activity where day = current_date),
    'login_ok_15m', (select count(*) from public.login_attempts where ok and at > now() - interval '15 minutes'),
    'login_fail_15m', (select count(*) from public.login_attempts where not ok and at > now() - interval '15 minutes'),
    'login_top_ip_15m', coalesce(v_top_ip, 0),
    'resets_1h', (select count(*) from public.password_reset_requests where at > now() - interval '1 hour'),
    'security_15m', (select count(*) from public.security_events where at > now() - interval '15 minutes'),
    'reports_queue', (select count(*) from public.program_reports where status in ('pendiente', 'error', 'generando')),
    'reports_error', (select count(*) from public.program_reports where status = 'error'),
    'reports_waiting', (select count(*) from public.program_reports where wait_reason is not null and status <> 'listo'),
    'class_queue', (select count(*) from public.class_reports where status in ('pendiente', 'error', 'generando')),
    'ai_month_usd', round(private.month_spend(), 2),
    'ai_budget_usd', (select monthly_budget_usd from public.ai_settings where id = 1),
    'ai_calls_24h', (select count(*) from public.ai_usage where at > now() - interval '24 hours'),
    'ai_fail_24h', (select count(*) from public.ai_usage where at > now() - interval '24 hours' and not ok),
    'welcome_error_24h', (select count(*) from public.welcome_deliveries where status = 'error' and sent_at > now() - interval '24 hours')
  );
  insert into public.health_samples (source, metrics) values ('db', m);

  -- Umbrales
  if (m->>'conn_total')::int > v_max * 0.8 then
    perform private.raise_alert('conexiones', 'critico', format('Conexiones a la base: %s de %s', m->>'conn_total', v_max), (m->>'conn_total')::numeric);
  end if;
  if (m->>'login_fail_15m')::int >= 60 or coalesce(v_top_ip, 0) >= 30 then
    perform private.raise_alert('ataque_login', 'critico', format('Posible ataque al login: %s intentos fallidos en 15 min (máx. %s desde una misma IP)', m->>'login_fail_15m', coalesce(v_top_ip, 0)), (m->>'login_fail_15m')::numeric);
  end if;
  if (m->>'resets_1h')::int >= 40 then
    perform private.raise_alert('ataque_recuperar', 'aviso', format('Muchos pedidos de recuperar contraseña: %s en 1 hora', m->>'resets_1h'), (m->>'resets_1h')::numeric);
  end if;
  if (m->>'security_15m')::int >= 30 then
    perform private.raise_alert('eventos_seguridad', 'critico', format('%s eventos de seguridad en 15 min (links inválidos, bloqueos, accesos sin autorización)', m->>'security_15m'), (m->>'security_15m')::numeric);
  end if;
  if (m->>'long_query_s')::int >= 120 then
    perform private.raise_alert('consulta_lenta', 'aviso', format('Una consulta lleva %s s en la base', m->>'long_query_s'), (m->>'long_query_s')::numeric);
  end if;
  if (m->>'lock_waits')::int >= 10 then
    perform private.raise_alert('bloqueos', 'aviso', format('%s consultas esperando bloqueos', m->>'lock_waits'), (m->>'lock_waits')::numeric);
  end if;
  if (m->>'cache_hit')::numeric < 95 then
    perform private.raise_alert('cache', 'aviso', format('La caché de la base acierta %s %% (ideal > 99 %%): puede faltar memoria', m->>'cache_hit'), (m->>'cache_hit')::numeric);
  end if;
  if (m->>'db_bytes')::bigint > 6.5e9 then
    perform private.raise_alert('tamano_base', 'aviso', format('La base ocupa %s (el plan Pro incluye 8 GB)', pg_size_pretty((m->>'db_bytes')::bigint)), (m->>'db_bytes')::numeric);
  end if;
  if (m->>'reports_error')::int >= 10 or (m->>'reports_queue')::int >= 100 then
    perform private.raise_alert('cola_reportes', 'aviso', format('Reportes en cola: %s (%s con error)', m->>'reports_queue', m->>'reports_error'), (m->>'reports_queue')::numeric);
  end if;
  if (m->>'welcome_error_24h')::int >= 10 then
    perform private.raise_alert('mails_bienvenida', 'aviso', format('%s mails de bienvenida fallaron en 24 h', m->>'welcome_error_24h'), (m->>'welcome_error_24h')::numeric);
  end if;
  if (m->>'ai_fail_24h')::int >= 5 then
    perform private.raise_alert('ia_fallos', 'aviso', format('%s llamadas a la IA fallaron en 24 h', m->>'ai_fail_24h'), (m->>'ai_fail_24h')::numeric);
  end if;

  return m;
end;
$$;

-- Cada 5 minutos: medir y, si hay URL configurada, avisar al servidor (que suma CPU/RAM y manda los mails)
create or replace function private.health_tick()
returns void language plpgsql security definer set search_path = '' as $$
declare s public.health_settings;
begin
  perform private.health_snapshot();
  select * into s from public.health_settings where id = 1;
  if s.app_url is not null then
    perform net.http_post(
      url := s.app_url || '/api/health/ping',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-health-token', s.ping_token),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000);
  end if;
end;
$$;

select cron.schedule('mypath-health', '*/5 * * * *', 'select private.health_tick()');

-- ─────────────────────────────────────────────────────────────
-- Funciones del servidor (service_role)
-- ─────────────────────────────────────────────────────────────
create or replace function public.health_ping_valid(p_token text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.health_settings where id = 1 and ping_token = p_token and length(p_token) = 64);
$$;

-- Medición del servidor: CPU, RAM, disco y tiempos de respuesta; evalúa sus umbrales
create or replace function public.health_record_server(p_metrics jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v numeric;
begin
  insert into public.health_samples (source, metrics) values ('server', p_metrics);
  v := (p_metrics->>'cpu_pct')::numeric;
  if v >= 85 then perform private.raise_alert('cpu', 'critico', format('CPU de la base al %s %%', round(v)), v); end if;
  v := (p_metrics->>'mem_pct')::numeric;
  if v >= 90 then perform private.raise_alert('ram', 'critico', format('RAM de la base al %s %%', round(v)), v); end if;
  v := (p_metrics->>'disk_pct')::numeric;
  if v >= 85 then perform private.raise_alert('disco', 'critico', format('Disco de la base al %s %%', round(v)), v); end if;
  v := (p_metrics->>'db_ms')::numeric;
  if v >= 1500 then perform private.raise_alert('lentitud', 'aviso', format('La base tardó %s ms en responder', round(v)), v); end if;
  if (p_metrics->>'db_ok') = 'false' then perform private.raise_alert('base_caida', 'critico', 'La base no respondió al control', null); end if;
  if (p_metrics->>'auth_ok') = 'false' then perform private.raise_alert('auth_caido', 'critico', 'El servicio de login (Supabase Auth) no respondió', null); end if;
end;
$$;

create or replace function public.health_pending_alerts()
returns table (id bigint, kind text, level text, message text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.kind, a.level, a.message, a.created_at from public.health_alerts a
  where a.notified_at is null and (select alerts_enabled from public.health_settings where id = 1)
  order by a.created_at limit 50;
$$;

create or replace function public.health_mark_notified(p_ids bigint[])
returns void language sql security definer set search_path = '' as $$
  update public.health_alerts set notified_at = now() where id = any(p_ids);
$$;

-- Última medición del servidor (para calcular el % de CPU entre dos lecturas)
create or replace function public.health_last_server()
returns jsonb language sql stable security definer set search_path = '' as $$
  select metrics || jsonb_build_object('at', at) from public.health_samples where source = 'server' order by at desc limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- Panel del admin
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_health(p_hours int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hours int := least(greatest(coalesce(p_hours, 24), 1), 720);
begin
  perform private.assert_admin();
  return jsonb_build_object(
    'db', (select metrics || jsonb_build_object('at', at) from public.health_samples where source = 'db' order by at desc limit 1),
    'server', (select metrics || jsonb_build_object('at', at) from public.health_samples where source = 'server' order by at desc limit 1),
    'series', (select coalesce(jsonb_agg(jsonb_build_object('at', s.at, 'source', s.source, 'm', s.metrics) order by s.at), '[]')
               from public.health_samples s where s.at > now() - make_interval(hours => v_hours)),
    'alerts', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]')
               from (select id, kind, level, message, created_at, notified_at from public.health_alerts order by created_at desc limit 40) a),
    'security', (select coalesce(jsonb_object_agg(kind, n), '{}') from (select kind, count(*) n from public.security_events where at > now() - interval '24 hours' group by kind) x),
    'slow_queries', (select coalesce(jsonb_agg(q), '[]') from (
        select left(regexp_replace(s.query, '\s+', ' ', 'g'), 160) as query, s.calls, round(s.mean_exec_time::numeric, 1) as mean_ms,
               round(s.total_exec_time::numeric / 1000, 1) as total_s
        from extensions.pg_stat_statements s join pg_roles r on r.oid = s.userid
        where r.rolname in ('authenticated', 'service_role', 'anon', 'authenticator') and s.calls > 5
        order by s.mean_exec_time desc limit 8) q),
    'settings', (select jsonb_build_object('app_url', app_url, 'alerts_enabled', alerts_enabled) from public.health_settings where id = 1),
    'cron_ok', (select bool_and(status = 'succeeded') from (select status from cron.job_run_details d join cron.job j on j.jobid = d.jobid
                where j.jobname = 'mypath-health' order by d.start_time desc limit 3) c)
  );
end;
$$;

create or replace function public.admin_set_health_settings(p_app_url text, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if p_app_url is not null and p_app_url <> '' and p_app_url !~ '^https://[a-z0-9.-]+(:[0-9]+)?$' then raise exception 'datos inválidos'; end if;
  update public.health_settings set app_url = nullif(p_app_url, ''), alerts_enabled = coalesce(p_enabled, true), updated_at = now() where id = 1;
  perform private.audit('set_health_settings', 'health_settings', '1', jsonb_build_object('app_url', p_app_url, 'enabled', p_enabled));
end;
$$;

-- Permisos: nada para anon; el admin solo por sus funciones; el resto, solo el servidor
revoke execute on function private.raise_alert(text, text, text, numeric) from public, anon, authenticated;
revoke execute on function private.health_snapshot() from public, anon, authenticated;
revoke execute on function private.health_tick() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['public.security_event(text, text)', 'public.health_ping_valid(text)', 'public.health_record_server(jsonb)',
    'public.health_pending_alerts()', 'public.health_mark_notified(bigint[])', 'public.health_last_server()'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['public.admin_health(int)', 'public.admin_set_health_settings(text, boolean)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
