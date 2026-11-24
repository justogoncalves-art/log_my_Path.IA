-- MY PATH.IA · Esquema base
-- Personas (ID por documento), organizaciones, clases, roles, módulos y licencias.
-- Todas las tablas tienen RLS. Las escrituras de administración van por el servidor.

-- ─────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────
create type public.org_kind as enum ('colegio', 'profesional', 'particular');
create type public.member_role as enum ('coordinador', 'docente', 'alumno', 'profesional');
create type public.data_layer as enum ('educativa', 'clinica', 'sanitaria');
create type public.region as enum ('latam', 'eu');

-- ─────────────────────────────────────────────────────────────
-- Personas
-- Una persona = un documento (país + tipo + número).
-- El número nunca se guarda en claro: doc_hash (HMAC, para buscar) y
-- doc_cipher (AES-GCM, para mostrar al admin). Las claves viven fuera de la base.
-- ─────────────────────────────────────────────────────────────
create table public.people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  doc_country char(2) not null,
  doc_type text not null,
  doc_hash text not null,
  doc_cipher text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  sex text check (sex in ('hombre', 'mujer', 'otro', 'no_informa')),
  birth_date date,
  province text,
  city text,
  locale text not null default 'es',
  must_change_password boolean not null default true,
  guardian_consent boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (doc_country, doc_type, doc_hash)
);
create unique index people_email_key on public.people (lower(email)) where deleted_at is null;

create table public.platform_admins (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Organizaciones y clases
-- ─────────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.org_kind not null,
  country char(2) not null,
  region public.region not null default 'latam',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  school_year int not null default extract(year from now())::int,
  created_at timestamptz not null default now(),
  unique (organization_id, name, school_year)
);
create index classes_org_idx on public.classes (organization_id);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.member_role not null,
  -- Un alumno pertenece a una sola clase
  class_id uuid references public.classes (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (person_id, organization_id)
);
create index memberships_org_idx on public.memberships (organization_id);
create index memberships_class_idx on public.memberships (class_id);

-- Un docente puede tener varias clases
create table public.class_teachers (
  class_id uuid not null references public.classes (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (class_id, person_id)
);
create index class_teachers_person_idx on public.class_teachers (person_id);

-- ─────────────────────────────────────────────────────────────
-- Módulos y licencias
-- ─────────────────────────────────────────────────────────────
create table public.modules (
  id text primary key,
  name text not null,
  summary_es text not null,
  summary_en text not null,
  layer public.data_layer not null default 'educativa',
  visible_to_students boolean not null default true,
  info_url text,
  sort int not null default 0
);

-- Lo que contrató cada organización
create table public.organization_modules (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  module_id text not null references public.modules (id),
  active boolean not null default true,
  starts_at date,
  ends_at date,
  seats int,
  primary key (organization_id, module_id)
);

-- Asignación a una clase entera o a una persona puntual
create table public.class_modules (
  class_id uuid not null references public.classes (id) on delete cascade,
  module_id text not null references public.modules (id),
  primary key (class_id, module_id)
);

create table public.person_modules (
  person_id uuid not null references public.people (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  module_id text not null references public.modules (id),
  created_at timestamptz not null default now(),
  primary key (person_id, organization_id, module_id)
);

-- ─────────────────────────────────────────────────────────────
-- Auditoría (sin datos personales en meta)
-- ─────────────────────────────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Funciones auxiliares para las políticas (security definer, sin recursión)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where auth_user_id = (select auth.uid()));
$$;

create or replace function public.my_person_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.people where auth_user_id = (select auth.uid()) and deleted_at is null;
$$;

-- Organizaciones donde soy coordinador o profesional (ven a toda su organización)
create or replace function public.my_managed_orgs()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.organization_id from public.memberships m
  where m.person_id = public.my_person_id() and m.active
    and m.role in ('coordinador', 'profesional');
$$;

-- Clases que dicto
create or replace function public.my_taught_classes()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select class_id from public.class_teachers where person_id = public.my_person_id();
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS: lectura según rol. Sin políticas de escritura para clientes.
-- ─────────────────────────────────────────────────────────────
alter table public.people enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.classes enable row level security;
alter table public.memberships enable row level security;
alter table public.class_teachers enable row level security;
alter table public.modules enable row level security;
alter table public.organization_modules enable row level security;
alter table public.class_modules enable row level security;
alter table public.person_modules enable row level security;
alter table public.audit_log enable row level security;

create policy people_select on public.people for select to authenticated using (
  auth_user_id = (select auth.uid())
  or public.is_platform_admin()
  or exists (
    select 1 from public.memberships m
    where m.person_id = people.id
      and (m.organization_id in (select public.my_managed_orgs())
           or m.class_id in (select public.my_taught_classes()))
  )
);

create policy platform_admins_select on public.platform_admins for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy organizations_select on public.organizations for select to authenticated using (
  public.is_platform_admin()
  or id in (select organization_id from public.memberships where person_id = public.my_person_id())
);

create policy classes_select on public.classes for select to authenticated using (
  public.is_platform_admin()
  or organization_id in (select public.my_managed_orgs())
  or id in (select public.my_taught_classes())
  or id in (select class_id from public.memberships where person_id = public.my_person_id())
);

create policy memberships_select on public.memberships for select to authenticated using (
  public.is_platform_admin()
  or person_id = public.my_person_id()
  or organization_id in (select public.my_managed_orgs())
  or class_id in (select public.my_taught_classes())
);

create policy class_teachers_select on public.class_teachers for select to authenticated using (
  public.is_platform_admin()
  or person_id = public.my_person_id()
  or class_id in (select id from public.classes where organization_id in (select public.my_managed_orgs()))
);

create policy modules_select on public.modules for select to authenticated using (true);

create policy organization_modules_select on public.organization_modules for select to authenticated using (
  public.is_platform_admin()
  or organization_id in (select organization_id from public.memberships where person_id = public.my_person_id())
);

create policy class_modules_select on public.class_modules for select to authenticated using (
  public.is_platform_admin()
  or class_id in (select id from public.classes where organization_id in (select public.my_managed_orgs()))
  or class_id in (select public.my_taught_classes())
  or class_id in (select class_id from public.memberships where person_id = public.my_person_id())
);

create policy person_modules_select on public.person_modules for select to authenticated using (
  public.is_platform_admin()
  or person_id = public.my_person_id()
  or organization_id in (select public.my_managed_orgs())
);

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_platform_admin());

-- ─────────────────────────────────────────────────────────────
-- API para la app (la usan la web y la app móvil)
-- ─────────────────────────────────────────────────────────────

-- Datos mínimos del usuario actual
create or replace function public.me()
returns table (
  person_id uuid, first_name text, last_name text, locale text,
  must_change_password boolean, is_admin boolean,
  organization_id uuid, organization_name text, role public.member_role
) language sql stable security definer set search_path = '' as $$
  select p.id, p.first_name, p.last_name, p.locale, p.must_change_password,
         public.is_platform_admin(), o.id, o.name, m.role
  from public.people p
  left join public.memberships m on m.person_id = p.id and m.active
  left join public.organizations o on o.id = m.organization_id and o.active
  where p.auth_user_id = (select auth.uid()) and p.deleted_at is null
  order by m.created_at
  limit 1;
$$;

-- Módulos del usuario en una organización, con estado activo/inactivo.
-- Coordinador, docente y profesional ven todo el catálogo; el alumno solo los visibles para alumnos.
-- Activo = contratado por la organización (vigente) y, para alumnos, asignado a su clase o a él.
create or replace function public.my_modules(p_org uuid)
returns table (
  id text, name text, summary_es text, summary_en text, info_url text, sort int, active boolean
) language sql stable security definer set search_path = '' as $$
  with me as (
    select m.person_id, m.role, m.class_id
    from public.memberships m
    where m.person_id = public.my_person_id() and m.organization_id = p_org and m.active
  ),
  contracted as (
    select om.module_id from public.organization_modules om
    where om.organization_id = p_org and om.active
      and (om.starts_at is null or om.starts_at <= current_date)
      and (om.ends_at is null or om.ends_at >= current_date)
  )
  select md.id, md.name, md.summary_es, md.summary_en, md.info_url, md.sort,
    case
      when (select role from me) = 'alumno' then
        md.id in (select module_id from contracted) and (
          md.id in (select cm.module_id from public.class_modules cm where cm.class_id = (select class_id from me))
          or md.id in (select pm.module_id from public.person_modules pm
                       where pm.person_id = (select person_id from me) and pm.organization_id = p_org)
        )
      else md.id in (select module_id from contracted)
    end as active
  from public.modules md
  where exists (select 1 from me)
    and ((select role from me) <> 'alumno' or md.visible_to_students)
  order by md.sort;
$$;

-- Se llama después de que el usuario cambió su contraseña
create or replace function public.complete_password_change()
returns void language sql security definer set search_path = '' as $$
  update public.people set must_change_password = false
  where auth_user_id = (select auth.uid());
  insert into public.audit_log (actor, action, entity, entity_id)
  select (select auth.uid()), 'password_changed', 'people', public.my_person_id()::text;
$$;

revoke execute on function public.me() from public, anon;
revoke execute on function public.my_modules(uuid) from public, anon;
revoke execute on function public.complete_password_change() from public, anon;
grant execute on function public.me() to authenticated;
grant execute on function public.my_modules(uuid) to authenticated;
grant execute on function public.complete_password_change() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Catálogo de módulos
-- ─────────────────────────────────────────────────────────────
insert into public.modules (id, name, summary_es, summary_en, layer, visible_to_students, info_url, sort) values
  ('mento', 'Mento.IA', 'Orientación vocacional con IA. Vamos a descubrir tu futuro profesional.',
    'AI-powered vocational guidance. Let''s discover your professional future.', 'educativa', true, null, 1),
  ('campus', 'My Campus.IA', 'El buscador académico más potente del mundo en tus manos. Universidades, programas y mucho más.',
    'The world''s most powerful academic search engine, in your hands. Universities, programs and much more.', 'educativa', true, null, 2),
  ('mind', 'My Mind.IA', 'Acompañamiento psicológico y neurológico para niños de 6 a 12 años.',
    'Psychological and neurological support for children aged 6 to 12.', 'clinica', false, 'https://www.mymindia.com', 3),
  ('cognition', 'My Cognition.IA', 'Plataforma de rehabilitación neurocognitiva para niños y adolescentes.',
    'Neurocognitive rehabilitation platform for children and adolescents.', 'sanitaria', false, 'https://www.mycognitionia.com', 4),
  ('linno', 'Linno', 'Encuentra el profesional que buscas.',
    'Find the professional you''re looking for.', 'educativa', true, 'https://www.linno.com', 5),
  ('edfin', 'My.EdFin', 'Educación financiera para la vida real.',
    'Financial education for real life.', 'educativa', true, null, 6);
