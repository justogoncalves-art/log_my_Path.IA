-- Acciones del admin: organizaciones, módulos contratados, clases, programas,
-- personas (mover de clase, módulos, baja, eliminar, mail) y mails de bienvenida.
-- Todas validan que quien llama es admin y dejan registro en audit_log (sin datos personales).

create or replace function private.assert_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'sin acceso'; end if;
end;
$$;
revoke execute on function private.assert_admin() from public, anon, authenticated;

create or replace function private.audit(p_action text, p_entity text, p_entity_id text, p_meta jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor, action, entity, entity_id, meta)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, p_meta);
$$;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Organizaciones
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_save_org(
  p_id uuid, p_name text, p_kind public.org_kind, p_country text, p_reseller uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.assert_admin();
  if coalesce(trim(p_name), '') = '' or upper(p_country) !~ '^[A-Z]{2}$' then raise exception 'datos inválidos'; end if;
  if p_id is null then
    insert into public.organizations (name, kind, country, region, reseller_id)
    values (left(trim(p_name), 120), p_kind, upper(p_country),
            case when upper(p_country) in ('ES', 'PT', 'FR', 'IT', 'DE') then 'eu' else 'latam' end::public.region, p_reseller)
    returning id into v_id;
  else
    update public.organizations set name = left(trim(p_name), 120), kind = p_kind, country = upper(p_country), reseller_id = p_reseller
    where id = p_id returning id into v_id;
  end if;
  perform private.audit('save_org', 'organization', v_id::text);
  return v_id;
end;
$$;

create or replace function public.admin_set_org_module(
  p_org uuid, p_module text, p_active boolean, p_starts date default null, p_ends date default null, p_seats int default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  insert into public.organization_modules (organization_id, module_id, active, starts_at, ends_at, seats)
  values (p_org, p_module, p_active, p_starts, p_ends, p_seats)
  on conflict (organization_id, module_id) do update set
    active = excluded.active, starts_at = excluded.starts_at, ends_at = excluded.ends_at, seats = excluded.seats;
  perform private.audit('set_org_module', 'organization', p_org::text, jsonb_build_object('module', p_module, 'active', p_active));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Clases, módulos por clase y programas por clase
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_save_class(
  p_org uuid, p_id uuid, p_name text, p_level public.school_level, p_grade int
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.assert_admin();
  if coalesce(trim(p_name), '') = '' or (p_grade is not null and p_grade not between 1 and 7) then raise exception 'datos inválidos'; end if;
  if p_id is null then
    insert into public.classes (organization_id, name, level, grade)
    values (p_org, left(trim(p_name), 40), p_level, p_grade) returning id into v_id;
  else
    update public.classes set name = left(trim(p_name), 40), level = p_level, grade = p_grade
    where id = p_id and organization_id = p_org returning id into v_id;
    if v_id is null then raise exception 'clase inexistente'; end if;
  end if;
  perform private.audit('save_class', 'class', v_id::text);
  return v_id;
end;
$$;

create or replace function public.admin_set_class_modules(p_class uuid, p_modules text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  delete from public.class_modules where class_id = p_class and not (module_id = any (coalesce(p_modules, '{}')));
  insert into public.class_modules (class_id, module_id)
  select p_class, unnest(coalesce(p_modules, '{}')) on conflict do nothing;
  perform private.audit('set_class_modules', 'class', p_class::text, jsonb_build_object('modules', p_modules));
end;
$$;

-- Asigna (o quita) un programa a varias clases. Al asignar, habilita el módulo en esas clases.
create or replace function public.admin_assign_program(p_program uuid, p_classes uuid[], p_assign boolean default true)
returns int language plpgsql security definer set search_path = '' as $$
declare v_module text; v_count int;
begin
  perform private.assert_admin();
  select module_id into v_module from public.programs where id = p_program;
  if v_module is null then raise exception 'programa inexistente'; end if;
  if p_assign then
    insert into public.class_programs (class_id, program_id)
    select c.id, p_program from public.classes c where c.id = any (p_classes)
    on conflict do nothing;
    get diagnostics v_count = row_count;
    insert into public.class_modules (class_id, module_id)
    select c.id, v_module from public.classes c where c.id = any (p_classes)
    on conflict do nothing;
  else
    delete from public.class_programs where program_id = p_program and class_id = any (p_classes);
    get diagnostics v_count = row_count;
  end if;
  perform private.audit(case when p_assign then 'assign_program' else 'unassign_program' end, 'program', p_program::text,
                        jsonb_build_object('classes', cardinality(p_classes)));
  return v_count;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Personas
-- ─────────────────────────────────────────────────────────────
-- Listado paginado de una organización. Busca por nombre, mail o número de documento exacto.
create or replace function public.admin_people(
  p_org uuid, p_search text default null, p_role text default null, p_class uuid default null,
  p_status text default 'activos', p_limit int default 50, p_offset int default 0
) returns table (
  person_id uuid, first_name text, last_name text, email text, role public.member_role,
  class_id uuid, class_name text, teacher_classes text, membership_active boolean, deleted boolean,
  has_account boolean, must_change_password boolean, last_seen timestamptz, modules text[], total bigint
) language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_num text := upper(regexp_replace(coalesce(p_search, ''), '[^0-9A-Za-z]', '', 'g'));
  v_hash text;
begin
  perform private.assert_admin();
  if length(v_num) >= 5 then
    select private.doc_hash(o.country, 'dni', v_num) into v_hash from public.organizations o where o.id = p_org;
  end if;
  return query
  with base as (
    select p.id, p.first_name, p.last_name, p.email, m.role, m.class_id, c.name as class_name,
           m.active as membership_active, p.deleted_at is not null as deleted,
           p.auth_user_id is not null as has_account, p.must_change_password
    from public.memberships m
    join public.people p on p.id = m.person_id
    left join public.classes c on c.id = m.class_id
    where m.organization_id = p_org
      and (p_role is null or m.role::text = p_role)
      and (p_class is null or m.class_id = p_class
           or exists (select 1 from public.class_teachers ct where ct.person_id = p.id and ct.class_id = p_class))
      and case coalesce(p_status, 'activos')
            when 'activos' then m.active and p.deleted_at is null
            when 'inactivos' then not m.active or p.deleted_at is not null
            else true end
      and (v_q is null
           or p.first_name ilike '%' || v_q || '%' or p.last_name ilike '%' || v_q || '%' or p.email ilike '%' || v_q || '%'
           or p.doc_hash = v_hash)
  )
  select b.id, b.first_name, b.last_name, b.email, b.role, b.class_id, b.class_name,
         (select string_agg(c2.name, ', ' order by c2.name) from public.class_teachers ct
            join public.classes c2 on c2.id = ct.class_id
            where ct.person_id = b.id and c2.organization_id = p_org),
         b.membership_active, b.deleted, b.has_account, b.must_change_password,
         (select max(da.last_seen_at) from public.daily_activity da where da.person_id = b.id and da.organization_id = p_org),
         array(select pm.module_id from public.person_modules pm where pm.person_id = b.id and pm.organization_id = p_org),
         count(*) over ()
  from base b
  order by b.last_name, b.first_name
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;
$$;

-- Mueve un alumno de clase, o reemplaza las clases de un docente
create or replace function public.admin_set_classes(p_person uuid, p_org uuid, p_classes uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.member_role;
begin
  perform private.assert_admin();
  select role into v_role from public.memberships where person_id = p_person and organization_id = p_org;
  if v_role is null then raise exception 'la persona no pertenece a la organización'; end if;
  if exists (select 1 from unnest(coalesce(p_classes, '{}')) x
             where not exists (select 1 from public.classes c where c.id = x and c.organization_id = p_org)) then
    raise exception 'clase de otra organización';
  end if;
  if v_role = 'alumno' then
    if cardinality(p_classes) <> 1 then raise exception 'el alumno tiene que tener una sola clase'; end if;
    update public.memberships set class_id = p_classes[1] where person_id = p_person and organization_id = p_org;
  elsif v_role = 'docente' then
    delete from public.class_teachers ct using public.classes c
    where ct.class_id = c.id and c.organization_id = p_org and ct.person_id = p_person
      and not (ct.class_id = any (coalesce(p_classes, '{}')));
    insert into public.class_teachers (class_id, person_id)
    select unnest(coalesce(p_classes, '{}')), p_person on conflict do nothing;
  else
    raise exception 'un coordinador ve todas las clases';
  end if;
  perform private.audit('set_classes', 'people', p_person::text, jsonb_build_object('org', p_org));
end;
$$;

-- Módulos asignados a una persona puntual (además de los de su clase)
create or replace function public.admin_set_person_modules(p_person uuid, p_org uuid, p_modules text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if not exists (select 1 from public.memberships where person_id = p_person and organization_id = p_org) then
    raise exception 'la persona no pertenece a la organización';
  end if;
  delete from public.person_modules
  where person_id = p_person and organization_id = p_org and not (module_id = any (coalesce(p_modules, '{}')));
  insert into public.person_modules (person_id, organization_id, module_id)
  select p_person, p_org, unnest(coalesce(p_modules, '{}')) on conflict do nothing;
  perform private.audit('set_person_modules', 'people', p_person::text, jsonb_build_object('modules', p_modules));
end;
$$;

-- Dar de baja / reactivar en una organización (no borra datos)
create or replace function public.admin_set_membership_active(p_person uuid, p_org uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.memberships set active = p_active where person_id = p_person and organization_id = p_org;
  perform private.audit(case when p_active then 'reactivate' else 'deactivate' end, 'people', p_person::text,
                        jsonb_build_object('org', p_org));
end;
$$;

-- Eliminar: marca a la persona como eliminada en toda la plataforma y libera su mail.
-- Devuelve su cuenta de acceso para que el servidor la bloquee.
create or replace function public.admin_delete_person(p_person uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_auth uuid;
begin
  perform private.assert_admin();
  update public.people set deleted_at = now() where id = p_person and deleted_at is null returning auth_user_id into v_auth;
  update public.memberships set active = false where person_id = p_person;
  perform private.audit('delete_person', 'people', p_person::text);
  return v_auth;
end;
$$;

create or replace function public.admin_restore_person(p_person uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_auth uuid;
begin
  perform private.assert_admin();
  if exists (
    select 1 from public.people a join public.people b on lower(a.email) = lower(b.email)
    where a.id = p_person and b.id <> a.id and b.deleted_at is null
  ) then raise exception 'el mail ya lo usa otra persona'; end if;
  update public.people set deleted_at = null where id = p_person returning auth_user_id into v_auth;
  perform private.audit('restore_person', 'people', p_person::text);
  return v_auth;
end;
$$;

-- Cambio de mail (solo el admin). Devuelve la cuenta y el mail anterior para sincronizar Auth.
create or replace function public.admin_change_email(p_person uuid, p_email text)
returns table (auth_user_id uuid, old_email text) language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email));
begin
  perform private.assert_admin();
  if length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'mail inválido'; end if;
  if exists (select 1 from public.people p where lower(p.email) = v_email and p.id <> p_person and p.deleted_at is null) then
    raise exception 'el mail ya lo usa otra persona';
  end if;
  return query
  with old as (select p.auth_user_id, p.email from public.people p where p.id = p_person for update)
  update public.people p set email = v_email from old where p.id = p_person
  returning old.auth_user_id, old.email;
  perform private.audit('change_email', 'people', p_person::text);
end;
$$;

-- Datos mínimos para generar una contraseña nueva y avisar por mail
create or replace function public.admin_password_target(p_person uuid)
returns table (auth_user_id uuid, email text, first_name text, locale text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.people set must_change_password = true where id = p_person and deleted_at is null;
  perform private.audit('reset_password', 'people', p_person::text);
  return query select p.auth_user_id, p.email, p.first_name, p.locale from public.people p
  where p.id = p_person and p.deleted_at is null;
end;
$$;

-- Vincula la cuenta de acceso recién creada (la crea el servidor con la clave de servicio)
create or replace function public.admin_link_account(p_person uuid, p_auth uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.people set auth_user_id = p_auth, must_change_password = true
  where id = p_person and auth_user_id is null;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Mails de bienvenida programados por organización (y opcionalmente una clase).
-- El envío lo hace el servidor con la clave de servicio: genera la contraseña,
-- crea o actualiza la cuenta y manda el mail. La contraseña no se guarda en ningún lado.
-- ─────────────────────────────────────────────────────────────
create table public.welcome_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  send_at timestamptz not null,
  subject text not null check (char_length(subject) <= 200),
  template_html text not null check (char_length(template_html) <= 200000),
  only_new boolean not null default true,      -- solo a quienes todavía no recibieron su acceso
  status text not null default 'programado' check (status in ('programado', 'enviando', 'enviado', 'cancelado')),
  sent_count int not null default 0,
  failed_count int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index welcome_campaigns_due_idx on public.welcome_campaigns (send_at) where status in ('programado', 'enviando');

create table public.welcome_deliveries (
  campaign_id uuid not null references public.welcome_campaigns (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  status text not null check (status in ('enviado', 'error')),
  error_code text,
  sent_at timestamptz not null default now(),
  primary key (campaign_id, person_id)
);

alter table public.welcome_campaigns enable row level security;
alter table public.welcome_deliveries enable row level security;
create policy welcome_campaigns_select on public.welcome_campaigns for select to authenticated using (private.is_platform_admin());
create policy welcome_deliveries_select on public.welcome_deliveries for select to authenticated using (private.is_platform_admin());

create or replace function public.admin_schedule_welcome(
  p_org uuid, p_class uuid, p_send_at timestamptz, p_subject text, p_html text, p_only_new boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.assert_admin();
  if p_class is not null and not exists (select 1 from public.classes where id = p_class and organization_id = p_org) then
    raise exception 'clase de otra organización';
  end if;
  if position('{{contrasena}}' in p_html) = 0 then raise exception 'la plantilla tiene que incluir {{contrasena}}'; end if;
  insert into public.welcome_campaigns (organization_id, class_id, send_at, subject, template_html, only_new, created_by)
  values (p_org, p_class, p_send_at, trim(p_subject), p_html, p_only_new, (select auth.uid()))
  returning id into v_id;
  perform private.audit('schedule_welcome', 'organization', p_org::text, jsonb_build_object('campaign', v_id));
  return v_id;
end;
$$;

create or replace function public.admin_cancel_welcome(p_campaign uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.welcome_campaigns set status = 'cancelado' where id = p_campaign and status = 'programado';
  perform private.audit('cancel_welcome', 'welcome_campaign', p_campaign::text);
end;
$$;

-- "Enviar ahora": adelanta el envío; el servidor lo procesa enseguida
create or replace function public.admin_send_welcome_now(p_campaign uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.welcome_campaigns set send_at = now() where id = p_campaign and status in ('programado', 'enviando');
  perform private.audit('send_welcome_now', 'welcome_campaign', p_campaign::text);
end;
$$;

-- Permisos: solo usuarios autenticados (cada función valida que sea admin)
do $$
declare f text;
begin
  foreach f in array array[
    'admin_save_org(uuid, text, public.org_kind, text, uuid)',
    'admin_set_org_module(uuid, text, boolean, date, date, int)',
    'admin_save_class(uuid, uuid, text, public.school_level, int)',
    'admin_set_class_modules(uuid, text[])',
    'admin_assign_program(uuid, uuid[], boolean)',
    'admin_people(uuid, text, text, uuid, text, int, int)',
    'admin_set_classes(uuid, uuid, uuid[])',
    'admin_set_person_modules(uuid, uuid, text[])',
    'admin_set_membership_active(uuid, uuid, boolean)',
    'admin_delete_person(uuid)',
    'admin_restore_person(uuid)',
    'admin_change_email(uuid, text)',
    'admin_password_target(uuid)',
    'admin_link_account(uuid, uuid)',
    'admin_schedule_welcome(uuid, uuid, timestamptz, text, text, boolean)',
    'admin_cancel_welcome(uuid)',
    'admin_send_welcome_now(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
