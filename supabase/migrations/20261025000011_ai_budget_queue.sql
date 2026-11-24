-- IA: tope de gasto mensual, registro de consumo y cola de reportes que nunca se abandona.
-- Un reporte que no se puede generar (sin saldo, tope alcanzado, error de la API) queda en cola
-- y se vuelve a intentar con espera creciente hasta que salga.

-- Configuración única (fila id = 1). Montos en dólares porque Anthropic factura en USD.
create table public.ai_settings (
  id int primary key default 1 check (id = 1),
  reports_enabled boolean not null default true,       -- interruptor general
  monthly_budget_usd numeric(8,2) not null default 32,  -- ≈ 30 €
  daily_max_calls int not null default 100,            -- freno ante un pico anormal
  alert_email text,                                     -- a quién avisar (admin de My Path)
  budget_alert_month text,                              -- mes ya avisado del 80 % (AAAA-MM)
  updated_at timestamptz not null default now()
);
insert into public.ai_settings (id) values (1);
alter table public.ai_settings enable row level security;
create policy ai_settings_select on public.ai_settings for select to authenticated using (public.is_platform_admin());

-- Cada llamada a la IA (salió bien o mal). Sin datos personales: solo el programa.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  purpose text not null default 'reporte',
  program_id uuid references public.programs (id) on delete set null,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10,4) not null default 0,
  ok boolean not null
);
create index ai_usage_at_idx on public.ai_usage (at);
alter table public.ai_usage enable row level security;
create policy ai_usage_select on public.ai_usage for select to authenticated using (public.is_platform_admin());

alter table public.program_reports
  add column next_attempt_at timestamptz,
  add column wait_reason text,            -- pausado | presupuesto | limite_diario | sin_clave
  add column alerted_at timestamptz;

-- Al completar un programa de Mento.IA, el reporte entra en cola (aunque la IA no esté disponible)
create or replace function private.queue_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.programs p where p.id = new.program_id and p.module_id = 'mento') then
    insert into public.program_reports (person_id, program_id) values (new.person_id, new.program_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger program_completions_queue_report after insert on public.program_completions
  for each row execute function private.queue_report();

-- Programas ya completados antes de este cambio
insert into public.program_reports (person_id, program_id)
select pc.person_id, pc.program_id from public.program_completions pc
join public.programs p on p.id = pc.program_id and p.module_id = 'mento'
on conflict do nothing;

-- Gasto del mes en curso
create or replace function private.month_spend() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cost_usd), 0) from public.ai_usage where at >= date_trunc('month', now());
$$;

-- Toma el turno de generar. Devuelve 'ok' o el motivo por el que espera:
-- incompleto | listo | ocupado | espera | pausado | presupuesto | limite_diario
create or replace function public.report_take(p_person uuid, p_program uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  s public.ai_settings;
  r public.program_reports;
  v_reason text;
begin
  if exists (
    select 1 from public.chapters c
    left join public.chapter_progress pr on pr.chapter_id = c.id and pr.person_id = p_person and pr.status = 'completed'
    where c.program_id = p_program and pr.chapter_id is null
  ) then return 'incompleto'; end if;

  insert into public.program_reports (person_id, program_id) values (p_person, p_program) on conflict do nothing;
  select * into r from public.program_reports where person_id = p_person and program_id = p_program for update;

  if r.status = 'listo' then return 'listo'; end if;
  if r.status = 'generando' and r.started_at > now() - interval '10 minutes' then return 'ocupado'; end if;
  if r.status in ('error', 'pendiente') and r.next_attempt_at > now() then return 'espera'; end if;

  select * into s from public.ai_settings where id = 1;
  v_reason := case
    when not s.reports_enabled then 'pausado'
    -- reserva de 1 USD: ningún reporte empieza si podría pasar el tope
    when private.month_spend() + 1 > s.monthly_budget_usd then 'presupuesto'
    when (select count(*) from public.ai_usage where at >= now() - interval '24 hours') >= s.daily_max_calls then 'limite_diario'
  end;
  if v_reason is not null then
    update public.program_reports set wait_reason = v_reason,
      status = case when status = 'generando' then 'pendiente' else status end
    where person_id = p_person and program_id = p_program;
    return v_reason;
  end if;

  update public.program_reports set status = 'generando', started_at = now(), attempts = attempts + 1,
    error_code = null, wait_reason = null
  where person_id = p_person and program_id = p_program;
  return 'ok';
end;
$$;

-- Guarda el resultado. Si falló, programa el próximo intento: 5 min, 10, 20… hasta 12 h entre intentos.
create or replace function public.report_save(p_person uuid, p_program uuid, p_status text, p_content jsonb, p_model text, p_error text)
returns void language sql security definer set search_path = '' as $$
  update public.program_reports set
    status = p_status, content = coalesce(p_content, content), model = coalesce(p_model, model),
    error_code = p_error, generated_at = case when p_status = 'listo' then now() else generated_at end,
    next_attempt_at = case when p_status = 'error'
      then now() + least(interval '12 hours', interval '5 minutes' * power(2, least(greatest(attempts - 1, 0), 8))) end,
    wait_reason = case when p_status = 'listo' then null else wait_reason end
  where person_id = p_person and program_id = p_program;
$$;

-- Si el error se debe a la clave o al saldo de Anthropic, queda esperando (sin gastar intentos de más)
create or replace function public.report_wait(p_person uuid, p_program uuid, p_reason text)
returns void language sql security definer set search_path = '' as $$
  update public.program_reports set status = 'pendiente', wait_reason = p_reason, next_attempt_at = now() + interval '1 hour'
  where person_id = p_person and program_id = p_program;
$$;

-- Registra el consumo y avisa si el mes pasó el 80 % del tope (una vez por mes)
create or replace function public.ai_log_usage(p_program uuid, p_model text, p_in int, p_out int, p_cost numeric, p_ok boolean)
returns table (spend numeric, budget numeric, alert_80 boolean, alert_email text)
language plpgsql security definer set search_path = '' as $$
declare v_month text := to_char(now(), 'YYYY-MM'); v_alert boolean := false;
begin
  insert into public.ai_usage (program_id, model, input_tokens, output_tokens, cost_usd, ok)
  values (p_program, p_model, greatest(p_in, 0), greatest(p_out, 0), greatest(p_cost, 0), p_ok);
  update public.ai_settings set budget_alert_month = v_month
  where id = 1 and private.month_spend() >= monthly_budget_usd * 0.8 and budget_alert_month is distinct from v_month
  returning true into v_alert;
  return query select private.month_spend(), s.monthly_budget_usd, coalesce(v_alert, false), s.alert_email
    from public.ai_settings s where s.id = 1;
end;
$$;

-- Reportes a procesar por el cron: pendientes, con error cuyo turno llegó, o colgados
create or replace function public.report_queue(p_limit int)
returns table (person_id uuid, program_id uuid)
language sql stable security definer set search_path = '' as $$
  select r.person_id, r.program_id from public.program_reports r
  where (r.status = 'pendiente' and (r.next_attempt_at is null or r.next_attempt_at <= now()))
     or (r.status = 'error' and r.next_attempt_at <= now())
     or (r.status = 'generando' and r.started_at < now() - interval '10 minutes')
  order by coalesce(r.next_attempt_at, r.started_at, now())
  limit least(greatest(p_limit, 1), 20);
$$;

-- Marca el aviso al admin de un reporte que no sale (una vez por reporte)
create or replace function public.report_mark_alerted(p_person uuid, p_program uuid)
returns boolean language sql security definer set search_path = '' as $$
  update public.program_reports set alerted_at = now()
  where person_id = p_person and program_id = p_program and alerted_at is null
  returning true;
$$;

revoke execute on function public.report_claim(uuid, uuid) from service_role;
do $$
declare f text;
begin
  foreach f in array array[
    'public.report_take(uuid, uuid)', 'public.report_wait(uuid, uuid, text)',
    'public.ai_log_usage(uuid, text, int, int, numeric, boolean)', 'public.report_queue(int)',
    'public.report_mark_alerted(uuid, uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
revoke execute on function private.queue_report() from public, anon, authenticated;
revoke execute on function private.month_spend() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Admin
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_ai_overview()
returns table (reports_enabled boolean, monthly_budget_usd numeric, daily_max_calls int, alert_email text,
               month_spend numeric, month_reports int, last24h_calls int,
               queued int, generating int, failing int, ready int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
  select s.reports_enabled, s.monthly_budget_usd, s.daily_max_calls, s.alert_email,
    private.month_spend(),
    (select count(*)::int from public.ai_usage u where u.ok and u.at >= date_trunc('month', now())),
    (select count(*)::int from public.ai_usage u where u.at >= now() - interval '24 hours'),
    (select count(*)::int from public.program_reports r where r.status = 'pendiente'),
    (select count(*)::int from public.program_reports r where r.status = 'generando'),
    (select count(*)::int from public.program_reports r where r.status = 'error'),
    (select count(*)::int from public.program_reports r where r.status = 'listo')
  from public.ai_settings s where s.id = 1;
end;
$$;

create or replace function public.admin_set_ai_settings(p_enabled boolean, p_budget numeric, p_daily int, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if p_budget is null or p_budget < 0 or p_budget > 1000 then raise exception 'tope inválido'; end if;
  if p_daily is null or p_daily < 0 or p_daily > 5000 then raise exception 'límite diario inválido'; end if;
  if p_email is not null and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'mail inválido'; end if;
  update public.ai_settings set reports_enabled = p_enabled, monthly_budget_usd = p_budget,
    daily_max_calls = p_daily, alert_email = nullif(trim(p_email), ''), updated_at = now()
  where id = 1;
  perform private.audit('set_ai_settings', 'ai_settings', '1', jsonb_build_object('enabled', p_enabled, 'budget', p_budget, 'daily', p_daily));
end;
$$;
revoke execute on function public.admin_ai_overview() from public, anon;
revoke execute on function public.admin_set_ai_settings(boolean, numeric, int, text) from public, anon;
grant execute on function public.admin_ai_overview() to authenticated;
grant execute on function public.admin_set_ai_settings(boolean, numeric, int, text) to authenticated;
