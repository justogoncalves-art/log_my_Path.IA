-- MY PATH.IA · Programas por año e idioma, progreso, satisfacción, conexión y resellers.

-- ─────────────────────────────────────────────────────────────
-- Nivel y año de cada clase (para asignar el programa que corresponde)
-- ─────────────────────────────────────────────────────────────
create type public.school_level as enum ('primaria', 'secundaria');
alter table public.classes add column level public.school_level;
alter table public.classes add column grade smallint check (grade between 1 and 7);

-- Un módulo puede mostrarse solo a partir de cierto año (Campus, EdFin: últimos años)
alter table public.modules add column min_level public.school_level;
alter table public.modules add column min_grade smallint;

-- ─────────────────────────────────────────────────────────────
-- Catálogo de programas: un programa = módulo + año + idioma + track.
-- Cada idioma es un programa propio porque cada uno tiene sus videos.
-- ─────────────────────────────────────────────────────────────
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules (id),
  code text not null,                       -- ej. "mento-y1"; agrupa las versiones en distintos idiomas
  title text not null,                      -- ej. "Tu Primer Capítulo"
  level public.school_level not null,
  grade smallint not null check (grade between 1 and 7),
  language text not null,                   -- ej. es-AR, es-ES, en-GB
  track text,                               -- ej. ARG, CAM, IB
  version int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code, language, track, version)
);
create index programs_module_idx on public.programs (module_id, level, grade, language);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  position smallint not null,
  title text not null,
  mux_playback_id text,                     -- video en Mux (reproducción firmada)
  duration_seconds int,
  unique (program_id, position)
);

-- Asignación masiva por clase, o individual (profesionales y particulares)
create table public.class_programs (
  class_id uuid not null references public.classes (id) on delete cascade,
  program_id uuid not null references public.programs (id),
  assigned_at timestamptz not null default now(),
  primary key (class_id, program_id)
);

create table public.person_programs (
  person_id uuid not null references public.people (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid not null references public.programs (id),
  assigned_at timestamptz not null default now(),
  primary key (person_id, organization_id, program_id)
);

-- ─────────────────────────────────────────────────────────────
-- Actividad del alumno
-- ─────────────────────────────────────────────────────────────
create table public.chapter_progress (
  person_id uuid not null references public.people (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  seconds_spent int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (person_id, chapter_id)
);
create index chapter_progress_chapter_idx on public.chapter_progress (chapter_id);

-- Encuesta de satisfacción al terminar un programa
create table public.program_feedback (
  person_id uuid not null references public.people (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  primary key (person_id, program_id)
);

-- Tiempo de conexión: un registro por día y persona, sumado por latidos de la app
create table public.daily_activity (
  person_id uuid not null references public.people (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  day date not null default current_date,
  seconds int not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (person_id, organization_id, day)
);
create index daily_activity_org_day_idx on public.daily_activity (organization_id, day);

-- ─────────────────────────────────────────────────────────────
-- Resellers: venden la plataforma y ven SOLO estadísticas agregadas
-- de sus organizaciones. No dan de alta ni modifican nada.
-- ─────────────────────────────────────────────────────────────
create table public.resellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country char(2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reseller_users (
  reseller_id uuid not null references public.resellers (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  primary key (reseller_id, auth_user_id)
);

alter table public.organizations add column reseller_id uuid references public.resellers (id) on delete set null;
create index organizations_reseller_idx on public.organizations (reseller_id);

create or replace function private.my_resellers()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select reseller_id from public.reseller_users where auth_user_id = (select auth.uid());
$$;
revoke execute on function private.my_resellers() from public, anon;
grant execute on function private.my_resellers() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.programs enable row level security;
alter table public.chapters enable row level security;
alter table public.class_programs enable row level security;
alter table public.person_programs enable row level security;
alter table public.chapter_progress enable row level security;
alter table public.program_feedback enable row level security;
alter table public.daily_activity enable row level security;
alter table public.resellers enable row level security;
alter table public.reseller_users enable row level security;

-- El catálogo no es dato personal
create policy programs_select on public.programs for select to authenticated using (true);
create policy chapters_select on public.chapters for select to authenticated using (true);

create policy class_programs_select on public.class_programs for select to authenticated using (
  private.is_platform_admin()
  or class_id in (select id from public.classes where organization_id in (select private.my_managed_orgs()))
  or class_id in (select private.my_taught_classes())
  or class_id in (select class_id from public.memberships where person_id = private.my_person_id())
);

create policy person_programs_select on public.person_programs for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or organization_id in (select private.my_managed_orgs())
);

-- Progreso, satisfacción y conexión: la persona, su docente, su coordinador y el admin
create policy chapter_progress_select on public.chapter_progress for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or exists (
    select 1 from public.memberships m
    where m.person_id = chapter_progress.person_id
      and (m.organization_id in (select private.my_managed_orgs())
           or m.class_id in (select private.my_taught_classes()))
  )
);

create policy program_feedback_select on public.program_feedback for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or exists (
    select 1 from public.memberships m
    where m.person_id = program_feedback.person_id
      and m.organization_id in (select private.my_managed_orgs())
  )
);

create policy daily_activity_select on public.daily_activity for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or organization_id in (select private.my_managed_orgs())
);

create policy resellers_select on public.resellers for select to authenticated using (
  private.is_platform_admin() or id in (select private.my_resellers())
);

create policy reseller_users_select on public.reseller_users for select to authenticated using (
  private.is_platform_admin() or auth_user_id = (select auth.uid())
);

-- ─────────────────────────────────────────────────────────────
-- Escrituras del alumno (solo por funciones que validan)
-- ─────────────────────────────────────────────────────────────

-- Programas que tiene asignados el usuario actual (por su clase o individualmente)
create or replace function private.my_program_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select cp.program_id from public.class_programs cp
  join public.memberships m on m.class_id = cp.class_id and m.active
  where m.person_id = private.my_person_id()
  union
  select pp.program_id from public.person_programs pp
  where pp.person_id = private.my_person_id();
$$;
revoke execute on function private.my_program_ids() from public, anon;
grant execute on function private.my_program_ids() to authenticated;

create or replace function public.record_chapter_progress(p_chapter uuid, p_completed boolean, p_seconds int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := private.my_person_id();
begin
  if v_person is null then raise exception 'sin perfil'; end if;
  if not exists (
    select 1 from public.chapters c where c.id = p_chapter and c.program_id in (select private.my_program_ids())
  ) then
    raise exception 'capítulo no asignado';
  end if;
  insert into public.chapter_progress (person_id, chapter_id, status, seconds_spent, completed_at)
  values (v_person, p_chapter, case when p_completed then 'completed' else 'started' end,
          greatest(0, least(p_seconds, 3600)), case when p_completed then now() end)
  on conflict (person_id, chapter_id) do update set
    status = case when public.chapter_progress.status = 'completed' or p_completed then 'completed' else 'started' end,
    seconds_spent = public.chapter_progress.seconds_spent + greatest(0, least(p_seconds, 3600)),
    completed_at = coalesce(public.chapter_progress.completed_at, case when p_completed then now() end);
end;
$$;

create or replace function public.submit_program_feedback(p_program uuid, p_rating int, p_comment text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := private.my_person_id();
begin
  if v_person is null then raise exception 'sin perfil'; end if;
  if p_program not in (select private.my_program_ids()) then raise exception 'programa no asignado'; end if;
  insert into public.program_feedback (person_id, program_id, rating, comment)
  values (v_person, p_program, p_rating, nullif(left(p_comment, 2000), ''))
  on conflict (person_id, program_id) do update set rating = excluded.rating, comment = excluded.comment, created_at = now();
end;
$$;

-- Latido de la app: suma como máximo 2 minutos por llamada
create or replace function public.heartbeat(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := private.my_person_id();
begin
  if v_person is null then return; end if;
  if not exists (select 1 from public.memberships where person_id = v_person and organization_id = p_org and active) then
    return;
  end if;
  insert into public.daily_activity (person_id, organization_id)
  values (v_person, p_org)
  on conflict (person_id, organization_id, day) do update set
    seconds = public.daily_activity.seconds
      + least(120, greatest(0, extract(epoch from now() - public.daily_activity.last_seen_at)::int)),
    last_seen_at = now();
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Estadísticas agregadas por organización (sin datos personales).
-- Las ven: admin, el reseller de la organización y sus coordinadores.
-- ─────────────────────────────────────────────────────────────
create or replace function public.org_stats(p_org uuid)
returns table (
  organization_id uuid, organization_name text, students int, students_active_ever int,
  students_active_7d int, avg_minutes_per_student numeric, chapters_assigned int,
  chapters_completed int, students_completed_all int, satisfaction_avg numeric, satisfaction_count int
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (
    private.is_platform_admin()
    or p_org in (select private.my_managed_orgs())
    or exists (select 1 from public.organizations o where o.id = p_org and o.reseller_id in (select private.my_resellers()))
  ) then
    raise exception 'sin acceso';
  end if;

  return query
  with st as (
    select m.person_id, m.class_id from public.memberships m
    where m.organization_id = p_org and m.role = 'alumno' and m.active
  ),
  assigned as (
    select st.person_id, c.id as chapter_id
    from st
    join public.class_programs cp on cp.class_id = st.class_id
    join public.chapters c on c.program_id = cp.program_id
    union
    select pp.person_id, c.id
    from public.person_programs pp
    join public.chapters c on c.program_id = pp.program_id
    where pp.organization_id = p_org and pp.person_id in (select person_id from st)
  ),
  done as (
    select a.person_id, a.chapter_id from assigned a
    join public.chapter_progress pr on pr.person_id = a.person_id and pr.chapter_id = a.chapter_id and pr.status = 'completed'
  ),
  act as (
    select da.person_id, sum(da.seconds) as secs, max(da.day) as last_day
    from public.daily_activity da where da.organization_id = p_org group by da.person_id
  ),
  fb as (
    select f.rating from public.program_feedback f where f.person_id in (select person_id from st)
  ),
  per_student as (
    select a.person_id, count(*) as total, count(d.chapter_id) as completed
    from assigned a left join done d on d.person_id = a.person_id and d.chapter_id = a.chapter_id
    group by a.person_id
  )
  select
    p_org,
    (select o.name from public.organizations o where o.id = p_org),
    (select count(*)::int from st),
    (select count(*)::int from act),
    (select count(*)::int from act where last_day >= current_date - 6),
    round(coalesce((select sum(secs) from act), 0) / 60.0 / nullif((select count(*) from st), 0), 1),
    (select count(*)::int from assigned),
    (select count(*)::int from done),
    (select count(*)::int from per_student where total > 0 and completed = total),
    round((select avg(rating) from fb), 2),
    (select count(*)::int from fb);
end;
$$;

-- Vista del reseller: sus organizaciones con estadísticas. El admin puede pedir la de cualquier reseller.
create or replace function public.reseller_overview(p_reseller uuid default null)
returns table (
  organization_id uuid, organization_name text, students int, students_active_ever int,
  students_active_7d int, avg_minutes_per_student numeric, chapters_assigned int,
  chapters_completed int, students_completed_all int, satisfaction_avg numeric, satisfaction_count int
) language plpgsql stable security definer set search_path = '' as $$
declare
  v_reseller uuid;
  r record;
begin
  if p_reseller is not null and private.is_platform_admin() then
    v_reseller := p_reseller;
  else
    select ru.reseller_id into v_reseller from public.reseller_users ru where ru.auth_user_id = (select auth.uid()) limit 1;
  end if;
  if v_reseller is null then raise exception 'sin acceso'; end if;

  for r in select o.id from public.organizations o where o.reseller_id = v_reseller and o.active order by o.name loop
    return query select * from public.org_stats(r.id);
  end loop;
end;
$$;

revoke execute on function public.record_chapter_progress(uuid, boolean, int) from public, anon;
revoke execute on function public.submit_program_feedback(uuid, int, text) from public, anon;
revoke execute on function public.heartbeat(uuid) from public, anon;
revoke execute on function public.org_stats(uuid) from public, anon;
revoke execute on function public.reseller_overview(uuid) from public, anon;
grant execute on function public.record_chapter_progress(uuid, boolean, int) to authenticated;
grant execute on function public.submit_program_feedback(uuid, int, text) to authenticated;
grant execute on function public.heartbeat(uuid) to authenticated;
grant execute on function public.org_stats(uuid) to authenticated;
grant execute on function public.reseller_overview(uuid) to authenticated;
