-- Vista del docente y del coordinador.
-- Todo pasa por funciones que verifican el acceso: el docente ve sus clases (class_teachers);
-- el coordinador, todas las clases de su organización; el admin, todo.

create or replace function private.can_see_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_platform_admin()
      or p_class in (select private.my_taught_classes())
      or exists (select 1 from public.classes c where c.id = p_class and c.organization_id in (select private.my_managed_orgs()));
$$;

create or replace function private.can_see_person(p_person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_platform_admin() or exists (
    select 1 from public.memberships m
    where m.person_id = p_person and m.active
      and (m.class_id in (select private.my_taught_classes()) or m.organization_id in (select private.my_managed_orgs())));
$$;

-- Clases que ve el docente o el coordinador, con sus programas
create or replace function public.staff_classes()
returns table (class_id uuid, class_name text, organization_id uuid, organization_name text, country char(2),
               level text, grade int, students int, programs jsonb)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, o.id, o.name, o.country::char(2), c.level::text, c.grade::int,
    (select count(*)::int from public.memberships m where m.class_id = c.id and m.role = 'alumno' and m.active),
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'language', p.language, 'module_id', p.module_id,
                'chapters', (select count(*) from public.chapters ch where ch.program_id = p.id)) order by p.module_id, p.title)
              from public.class_programs cp join public.programs p on p.id = cp.program_id where cp.class_id = c.id), '[]')
  from public.classes c join public.organizations o on o.id = c.organization_id
  where private.can_see_class(c.id)
  order by o.name, c.name;
$$;

-- Alumnos de una clase con su avance en un programa y su conexión
create or replace function public.staff_class_students(p_class uuid, p_program uuid)
returns table (person_id uuid, first_name text, last_name text, email text, birth_date date,
               completed int, total int, next_position int, next_title text, seconds int,
               last_seen timestamptz, active_days_30 int, minutes_30 int, report_status text,
               mid_rating int, final_rating int, finished_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with ch as (select id, position, title from public.chapters where program_id = p_program),
  st as (
    select p.id, p.first_name, p.last_name, p.email, p.birth_date
    from public.memberships m join public.people p on p.id = m.person_id
    where private.can_see_class(p_class) and m.class_id = p_class and m.role = 'alumno' and m.active and p.deleted_at is null
  )
  select st.id, st.first_name, st.last_name, st.email, st.birth_date,
    (select count(*)::int from public.chapter_progress cp join ch on ch.id = cp.chapter_id where cp.person_id = st.id and cp.status = 'completed'),
    (select count(*)::int from ch),
    (select min(ch.position)::int from ch where not exists (select 1 from public.chapter_progress cp where cp.chapter_id = ch.id and cp.person_id = st.id and cp.status = 'completed')),
    (select ch.title from ch where not exists (select 1 from public.chapter_progress cp where cp.chapter_id = ch.id and cp.person_id = st.id and cp.status = 'completed') order by ch.position limit 1),
    (select coalesce(sum(cp.seconds_spent), 0)::int from public.chapter_progress cp join ch on ch.id = cp.chapter_id where cp.person_id = st.id),
    (select max(d.last_seen_at) from public.daily_activity d where d.person_id = st.id),
    (select count(*)::int from public.daily_activity d where d.person_id = st.id and d.day > current_date - 30),
    (select (coalesce(sum(d.seconds), 0) / 60)::int from public.daily_activity d where d.person_id = st.id and d.day > current_date - 30),
    (select r.status from public.program_reports r where r.person_id = st.id and r.program_id = p_program),
    (select f.mid_rating::int from public.program_feedback f where f.person_id = st.id and f.program_id = p_program),
    (select f.rating::int from public.program_feedback f where f.person_id = st.id and f.program_id = p_program),
    (select pc.completed_at from public.program_completions pc where pc.person_id = st.id and pc.program_id = p_program)
  from st
  order by st.last_name, st.first_name;
$$;

-- Avance de un alumno capítulo por capítulo
create or replace function public.staff_student_chapters(p_person uuid, p_program uuid)
returns table (chapter_position int, title text, status text, seconds int, completed_at timestamptz, answered int, questions int)
language sql stable security definer set search_path = '' as $$
  select c.position::int, c.title, coalesce(cp.status, 'pendiente'), coalesce(cp.seconds_spent, 0)::int, cp.completed_at,
    (select count(*)::int from public.responses r join public.questions q on q.id = r.question_id where q.chapter_id = c.id and r.person_id = p_person),
    (select count(*)::int from public.questions q where q.chapter_id = c.id)
  from public.chapters c
  left join public.chapter_progress cp on cp.chapter_id = c.id and cp.person_id = p_person
  where c.program_id = p_program and private.can_see_person(p_person)
  order by c.position;
$$;

-- Reporte de un alumno (para leerlo y compartirlo)
create or replace function public.staff_report(p_person uuid, p_program uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when private.can_see_person(p_person) then jsonb_build_object(
    'status', (select r.status from public.program_reports r where r.person_id = p_person and r.program_id = p_program),
    'content', (select r.content - 'usage' from public.program_reports r where r.person_id = p_person and r.program_id = p_program and r.status = 'listo'),
    'first_name', (select first_name from public.people where id = p_person),
    'last_name', (select last_name from public.people where id = p_person),
    'program', (select jsonb_build_object('title', title, 'language', language) from public.programs where id = p_program)
  ) end;
$$;

-- Estadísticas de la clase en un programa (sin nombres: conteos y promedios)
create or replace function public.staff_class_stats(p_class uuid, p_program uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_students uuid[];
begin
  if not private.can_see_class(p_class) then return null; end if;
  select coalesce(array_agg(m.person_id), '{}') into v_students
  from public.memberships m join public.people p on p.id = m.person_id
  where m.class_id = p_class and m.role = 'alumno' and m.active and p.deleted_at is null;

  return jsonb_build_object(
    'students', cardinality(v_students),
    'chapters', (select coalesce(jsonb_agg(jsonb_build_object(
        'position', c.position, 'title', c.title,
        'completed', (select count(*) from public.chapter_progress cp where cp.chapter_id = c.id and cp.person_id = any(v_students) and cp.status = 'completed'),
        'started', (select count(*) from public.chapter_progress cp where cp.chapter_id = c.id and cp.person_id = any(v_students)),
        'avg_minutes', (select round(avg(cp.seconds_spent) / 60.0, 1) from public.chapter_progress cp where cp.chapter_id = c.id and cp.person_id = any(v_students) and cp.status = 'completed')
      ) order by c.position), '[]') from public.chapters c where c.program_id = p_program),
    'activity', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'students', d.n, 'minutes', d.minutes) order by d.day), '[]')
      from (select g.day::date as day,
                   (select count(distinct a.person_id) from public.daily_activity a where a.day = g.day::date and a.person_id = any(v_students)) as n,
                   (select coalesce(sum(a.seconds), 0) / 60 from public.daily_activity a where a.day = g.day::date and a.person_id = any(v_students)) as minutes
            from generate_series(current_date - 29, current_date, interval '1 day') g(day)) d),
    'finished', (select count(*) from public.program_completions pc where pc.program_id = p_program and pc.person_id = any(v_students)),
    'reports_ready', (select count(*) from public.program_reports r where r.program_id = p_program and r.person_id = any(v_students) and r.status = 'listo'),
    'scores', (select coalesce(jsonb_agg(jsonb_build_object('assessment', g.assessment_id, 'dimension', g.dimension_id, 'name', g.dimension,
                  'avg_t', g.avg_t, 'n', g.n)), '[]')
      from (select s.assessment_id, s.dimension_id, s.dimension, round(avg(s.t_score), 1) as avg_t, count(*) as n
            from (select x.* from unnest(v_students) as u(pid), lateral private.compute_scores(u.pid, p_program) x where x.answered > 0) s
            group by s.assessment_id, s.dimension_id, s.dimension) g),
    'holland', (select coalesce(jsonb_agg(jsonb_build_object('letter', h.letter, 'n', h.n) order by h.n desc), '[]')
      from (select top.letter, count(*) n from (
              select distinct on (u.pid) u.pid,
                case x.dimension_id when 'riasec.realista' then 'R' when 'riasec.investigativo' then 'I' when 'riasec.artistico' then 'A'
                  when 'riasec.social' then 'S' when 'riasec.emprendedor' then 'E' when 'riasec.convencional' then 'C' end as letter
              from unnest(v_students) as u(pid), lateral private.compute_scores(u.pid, p_program) x
              where x.assessment_id = 'riasec' and x.answered > 0
              order by u.pid, x.t_score desc) top group by top.letter) h),
    'ratings', (select jsonb_build_object(
        'mid', (select coalesce(jsonb_object_agg(r::text, n), '{}') from (select f.mid_rating r, count(*) n from public.program_feedback f where f.program_id = p_program and f.person_id = any(v_students) and f.mid_rating is not null group by 1) a),
        'final', (select coalesce(jsonb_object_agg(r::text, n), '{}') from (select f.rating r, count(*) n from public.program_feedback f where f.program_id = p_program and f.person_id = any(v_students) and f.rating is not null group by 1) b),
        'comments', (select count(*) from public.program_feedback f where f.program_id = p_program and f.person_id = any(v_students) and (f.comment is not null or f.mid_comment is not null)))),
    'questions', (select coalesce(jsonb_agg(jsonb_build_object(
        'chapter', c.position, 'position', q.position, 'prompt', q.prompt, 'kind', q.kind,
        'answered', (select count(*) from public.responses r where r.question_id = q.id and r.person_id = any(v_students)),
        'options', case when q.kind = 'simple' then (select coalesce(jsonb_agg(jsonb_build_object('text', o.text,
                      'n', (select count(*) from public.responses r where r.option_id = o.id and r.person_id = any(v_students))) order by o.position), '[]')
                    from public.question_options o where o.question_id = q.id) end
      ) order by c.position, q.position), '[]')
      from public.questions q join public.chapters c on c.id = q.chapter_id where c.program_id = p_program)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Links para compartir un reporte (WhatsApp, mail): se guarda solo la huella del token.
-- Vencen (por defecto 30 días), se pueden revocar y cuentan las vistas.
-- ─────────────────────────────────────────────────────────────
create table public.report_shares (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  person_id uuid not null references public.people (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  created_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  views int not null default 0,
  last_view_at timestamptz
);
create index report_shares_person_idx on public.report_shares (person_id, program_id);
alter table public.report_shares enable row level security;
create policy report_shares_select on public.report_shares for select to authenticated using (private.can_see_person(person_id));

create or replace function public.staff_create_share(p_person uuid, p_program uuid, p_token_hash text, p_days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_exp timestamptz := now() + make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90));
begin
  if not private.can_see_person(p_person) then raise exception 'sin acceso'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'datos inválidos'; end if;
  if not exists (select 1 from public.program_reports r where r.person_id = p_person and r.program_id = p_program and r.status = 'listo') then
    raise exception 'el reporte todavía no está listo';
  end if;
  if (select count(*) from public.report_shares where created_by = private.my_person_id() and created_at > now() - interval '1 day') >= 200 then
    raise exception 'demasiados links hoy';
  end if;
  insert into public.report_shares (token_hash, person_id, program_id, created_by, expires_at)
  values (p_token_hash, p_person, p_program, private.my_person_id(), v_exp);
  return v_exp;
end;
$$;

create or replace function public.staff_revoke_share(p_share uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.report_shares set revoked_at = now()
  where id = p_share and revoked_at is null and private.can_see_person(person_id);
end;
$$;

-- Lectura pública del link (solo el servidor, con la huella del token)
create or replace function public.share_read(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.report_shares;
begin
  select * into s from public.report_shares where token_hash = p_token_hash and revoked_at is null and expires_at > now();
  if s.id is null then return null; end if;
  update public.report_shares set views = views + 1, last_view_at = now() where id = s.id;
  return jsonb_build_object(
    'content', (select r.content - 'usage' from public.program_reports r where r.person_id = s.person_id and r.program_id = s.program_id and r.status = 'listo'),
    'first_name', (select first_name from public.people where id = s.person_id),
    'last_name', (select last_name from public.people where id = s.person_id),
    'program', (select jsonb_build_object('title', title, 'language', language) from public.programs where id = s.program_id),
    'expires_at', s.expires_at);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Documentos del programa (guía didáctica, actividades de clase): PDF que sube el admin.
-- Van atados al código del programa (sobreviven a las versiones nuevas) y opcionalmente a un idioma.
-- ─────────────────────────────────────────────────────────────
create table public.program_documents (
  id uuid primary key default gen_random_uuid(),
  program_code text not null,
  language text references public.languages (code),
  kind text not null check (kind in ('guia', 'actividad')),
  title text not null check (char_length(title) between 2 and 200),
  position int not null default 1,
  storage_path text not null unique,
  size_bytes int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index program_documents_code_idx on public.program_documents (program_code, active);
alter table public.program_documents enable row level security;
create policy program_documents_select on public.program_documents for select to authenticated using (private.is_platform_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('program-docs', 'program-docs', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create or replace function public.admin_add_document(p_code text, p_language text, p_kind text, p_title text, p_position int, p_path text, p_size int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.assert_admin();
  if p_path !~ '^[a-z0-9-]{3,60}/[0-9a-f-]{36}\.pdf$' then raise exception 'datos inválidos'; end if;
  insert into public.program_documents (program_code, language, kind, title, position, storage_path, size_bytes)
  values (p_code, nullif(p_language, ''), p_kind, left(trim(p_title), 200), coalesce(p_position, 1), p_path, coalesce(p_size, 0))
  returning id into v_id;
  perform private.audit('add_document', 'program_document', v_id::text, jsonb_build_object('code', p_code, 'kind', p_kind));
  return v_id;
end;
$$;

create or replace function public.admin_set_document_active(p_doc uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.program_documents set active = p_active where id = p_doc;
  perform private.audit('set_document_active', 'program_document', p_doc::text, jsonb_build_object('active', p_active));
end;
$$;

-- Documentos que ve el docente para un programa asignado a alguna de sus clases
create or replace function public.staff_documents(p_program uuid)
returns table (id uuid, kind text, title text, sort int, size_bytes int)
language sql stable security definer set search_path = '' as $$
  select d.id, d.kind, d.title, d.position, d.size_bytes
  from public.program_documents d join public.programs p on p.id = p_program
  where d.active and d.program_code = p.code and (d.language is null or d.language = p.language)
    and (private.is_platform_admin() or exists (
      select 1 from public.class_programs cp where cp.program_id = p_program and private.can_see_class(cp.class_id)))
  order by d.kind, d.position, d.title;
$$;

-- Ruta del archivo si quien pide puede verlo (el servidor firma la descarga)
create or replace function public.document_path(p_doc uuid)
returns text language sql stable security definer set search_path = '' as $$
  select d.storage_path from public.program_documents d
  where d.id = p_doc and d.active and (private.is_platform_admin() or exists (
    select 1 from public.programs p join public.class_programs cp on cp.program_id = p.id
    where p.code = d.program_code and (d.language is null or p.language = d.language) and private.can_see_class(cp.class_id)));
$$;

-- ─────────────────────────────────────────────────────────────
-- Resumen IA de la clase: se genera cuando toda la clase terminó el programa.
-- ─────────────────────────────────────────────────────────────
create table public.class_reports (
  class_id uuid not null references public.classes (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  status text not null default 'pendiente' check (status in ('pendiente', 'generando', 'listo', 'error')),
  content jsonb,
  model text,
  error_code text,
  attempts int not null default 0,
  started_at timestamptz,
  generated_at timestamptz,
  next_attempt_at timestamptz,
  students int,
  primary key (class_id, program_id)
);
alter table public.class_reports enable row level security;
create policy class_reports_select on public.class_reports for select to authenticated using (private.can_see_class(class_id));

-- Motivo por el que la IA no puede trabajar ahora (o null si puede)
create or replace function private.ai_block_reason() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not s.reports_enabled then 'pausado'
    when private.month_spend() + 1 > s.monthly_budget_usd then 'presupuesto'
    when (select count(*) from public.ai_usage where at >= now() - interval '24 hours') >= s.daily_max_calls then 'limite_diario'
  end from public.ai_settings s where s.id = 1;
$$;

create or replace function public.class_report_take(p_class uuid, p_program uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.class_reports; v_students int; v_done int; v_reason text;
begin
  select count(*) into v_students from public.memberships m join public.people p on p.id = m.person_id
  where m.class_id = p_class and m.role = 'alumno' and m.active and p.deleted_at is null;
  select count(*) into v_done from public.program_completions pc join public.memberships m on m.person_id = pc.person_id
  where pc.program_id = p_program and m.class_id = p_class and m.role = 'alumno' and m.active;
  if v_students = 0 or v_done < v_students then return 'incompleto'; end if;

  insert into public.class_reports (class_id, program_id) values (p_class, p_program) on conflict do nothing;
  select * into r from public.class_reports where class_id = p_class and program_id = p_program for update;
  if r.status = 'listo' and r.students = v_students then return 'listo'; end if;
  if r.status = 'generando' and r.started_at > now() - interval '10 minutes' then return 'ocupado'; end if;
  if r.next_attempt_at > now() then return 'espera'; end if;
  v_reason := private.ai_block_reason();
  if v_reason is not null then return v_reason; end if;
  update public.class_reports set status = 'generando', started_at = now(), attempts = attempts + 1, error_code = null, students = v_students
  where class_id = p_class and program_id = p_program;
  return 'ok';
end;
$$;

create or replace function public.class_report_save(p_class uuid, p_program uuid, p_status text, p_content jsonb, p_model text, p_error text)
returns void language sql security definer set search_path = '' as $$
  update public.class_reports set status = p_status, content = coalesce(p_content, content), model = coalesce(p_model, model),
    error_code = p_error, generated_at = case when p_status = 'listo' then now() else generated_at end,
    next_attempt_at = case when p_status = 'error'
      then now() + least(interval '12 hours', interval '5 minutes' * power(2, least(greatest(attempts - 1, 0), 8))) end
  where class_id = p_class and program_id = p_program;
$$;

-- Datos para la IA: estadísticas agregadas y respuestas abiertas sin nombres (orden al azar)
create or replace function public.class_report_input(p_class uuid, p_program uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_students uuid[];
begin
  select coalesce(array_agg(m.person_id), '{}') into v_students from public.memberships m
  where m.class_id = p_class and m.role = 'alumno' and m.active;
  return jsonb_build_object(
    'program', (select jsonb_build_object('title', p.title, 'grade', p.grade, 'level', p.level, 'language', p.language) from public.programs p where p.id = p_program),
    'country', (select o.country from public.classes c join public.organizations o on o.id = c.organization_id where c.id = p_class),
    'class', (select jsonb_build_object('level', c.level, 'grade', c.grade) from public.classes c where c.id = p_class),
    'students', cardinality(v_students),
    'scores', (select coalesce(jsonb_agg(jsonb_build_object('assessment', g.assessment_id, 'name', g.dimension, 'avg_t', g.avg_t,
                  'high', g.high, 'low', g.low)), '[]')
      from (select s.assessment_id, s.dimension, round(avg(s.t_score), 1) as avg_t,
                   count(*) filter (where s.t_score > 60) as high, count(*) filter (where s.t_score < 40) as low
            from (select x.* from unnest(v_students) as u(pid), lateral private.compute_scores(u.pid, p_program) x where x.answered > 0) s
            group by s.assessment_id, s.dimension) g),
    'open_answers', (select coalesce(jsonb_agg(jsonb_build_object('question', a.prompt, 'answer', left(a.text_answer, 400))), '[]') from (
        select q.prompt, r.text_answer from public.responses r join public.questions q on q.id = r.question_id
        join public.chapters c on c.id = q.chapter_id
        where c.program_id = p_program and q.kind = 'abierta' and r.person_id = any(v_students) and r.text_answer is not null
        order by random() limit 120) a),
    'ratings', (select jsonb_build_object('avg_final', round(avg(f.rating), 2), 'avg_mid', round(avg(f.mid_rating), 2))
      from public.program_feedback f where f.program_id = p_program and f.person_id = any(v_students)),
    'avg_minutes_total', (select round(avg(t) / 60.0) from (select sum(cp.seconds_spent) t from public.chapter_progress cp
      join public.chapters c on c.id = cp.chapter_id where c.program_id = p_program and cp.person_id = any(v_students) group by cp.person_id) x)
  );
end;
$$;

-- Resumen de la clase para el docente
create or replace function public.staff_class_report(p_class uuid, p_program uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when private.can_see_class(p_class) then
    (select jsonb_build_object('status', r.status, 'content', r.content - 'usage', 'generated_at', r.generated_at)
     from public.class_reports r where r.class_id = p_class and r.program_id = p_program) end;
$$;

-- Cola del cron: resúmenes de clase pendientes o con error cuyo turno llegó
create or replace function public.class_report_queue(p_limit int)
returns table (class_id uuid, program_id uuid)
language sql stable security definer set search_path = '' as $$
  select r.class_id, r.program_id from public.class_reports r
  where (r.status = 'pendiente') or (r.status = 'error' and r.next_attempt_at <= now())
     or (r.status = 'generando' and r.started_at < now() - interval '10 minutes')
  limit least(greatest(p_limit, 1), 10);
$$;

-- ─────────────────────────────────────────────────────────────
-- Interés en módulos no contratados ("Quiero saber más")
-- ─────────────────────────────────────────────────────────────
create table public.module_interest (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  module_id text not null references public.modules (id),
  created_at timestamptz not null default now(),
  unique (organization_id, person_id, module_id)
);
alter table public.module_interest enable row level security;
create policy module_interest_select on public.module_interest for select to authenticated using (private.is_platform_admin());

create or replace function public.register_module_interest(p_org uuid, p_module text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_new boolean := false;
begin
  if not exists (select 1 from public.memberships m where m.person_id = private.my_person_id() and m.organization_id = p_org and m.active and m.role <> 'alumno') then
    raise exception 'sin acceso';
  end if;
  insert into public.module_interest (organization_id, person_id, module_id) values (p_org, private.my_person_id(), p_module)
  on conflict do nothing returning true into v_new;
  return coalesce(v_new, false);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────
revoke execute on function private.can_see_class(uuid) from public, anon;
revoke execute on function private.can_see_person(uuid) from public, anon;
grant execute on function private.can_see_class(uuid) to authenticated;
grant execute on function private.can_see_person(uuid) to authenticated;
revoke execute on function private.ai_block_reason() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.staff_classes()', 'public.staff_class_students(uuid, uuid)', 'public.staff_student_chapters(uuid, uuid)',
    'public.staff_report(uuid, uuid)', 'public.staff_class_stats(uuid, uuid)', 'public.staff_create_share(uuid, uuid, text, int)',
    'public.staff_revoke_share(uuid)', 'public.admin_add_document(text, text, text, text, int, text, int)',
    'public.admin_set_document_active(uuid, boolean)', 'public.staff_documents(uuid)', 'public.document_path(uuid)',
    'public.staff_class_report(uuid, uuid)', 'public.register_module_interest(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'public.share_read(text)', 'public.class_report_take(uuid, uuid)', 'public.class_report_save(uuid, uuid, text, jsonb, text, text)',
    'public.class_report_input(uuid, uuid)', 'public.class_report_queue(int)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
