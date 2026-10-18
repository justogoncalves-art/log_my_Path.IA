-- Las funciones auxiliares de las políticas pasan a un esquema que no expone la API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where auth_user_id = (select auth.uid()));
$$;

create or replace function private.my_person_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.people where auth_user_id = (select auth.uid()) and deleted_at is null;
$$;

create or replace function private.my_managed_orgs()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.organization_id from public.memberships m
  where m.person_id = private.my_person_id() and m.active
    and m.role in ('coordinador', 'profesional');
$$;

create or replace function private.my_taught_classes()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select class_id from public.class_teachers where person_id = private.my_person_id();
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Políticas apuntando al esquema privado
drop policy people_select on public.people;
create policy people_select on public.people for select to authenticated using (
  auth_user_id = (select auth.uid())
  or private.is_platform_admin()
  or exists (
    select 1 from public.memberships m
    where m.person_id = people.id
      and (m.organization_id in (select private.my_managed_orgs())
           or m.class_id in (select private.my_taught_classes()))
  )
);

drop policy organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated using (
  private.is_platform_admin()
  or id in (select organization_id from public.memberships where person_id = private.my_person_id())
);

drop policy classes_select on public.classes;
create policy classes_select on public.classes for select to authenticated using (
  private.is_platform_admin()
  or organization_id in (select private.my_managed_orgs())
  or id in (select private.my_taught_classes())
  or id in (select class_id from public.memberships where person_id = private.my_person_id())
);

drop policy memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or organization_id in (select private.my_managed_orgs())
  or class_id in (select private.my_taught_classes())
);

drop policy class_teachers_select on public.class_teachers;
create policy class_teachers_select on public.class_teachers for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or class_id in (select id from public.classes where organization_id in (select private.my_managed_orgs()))
);

drop policy organization_modules_select on public.organization_modules;
create policy organization_modules_select on public.organization_modules for select to authenticated using (
  private.is_platform_admin()
  or organization_id in (select organization_id from public.memberships where person_id = private.my_person_id())
);

drop policy class_modules_select on public.class_modules;
create policy class_modules_select on public.class_modules for select to authenticated using (
  private.is_platform_admin()
  or class_id in (select id from public.classes where organization_id in (select private.my_managed_orgs()))
  or class_id in (select private.my_taught_classes())
  or class_id in (select class_id from public.memberships where person_id = private.my_person_id())
);

drop policy person_modules_select on public.person_modules;
create policy person_modules_select on public.person_modules for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or organization_id in (select private.my_managed_orgs())
);

drop policy audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using (private.is_platform_admin());

-- Las funciones de la API usan las privadas
create or replace function public.me()
returns table (
  person_id uuid, first_name text, last_name text, locale text,
  must_change_password boolean, is_admin boolean,
  organization_id uuid, organization_name text, role public.member_role
) language sql stable security definer set search_path = '' as $$
  select p.id, p.first_name, p.last_name, p.locale, p.must_change_password,
         private.is_platform_admin(), o.id, o.name, m.role
  from public.people p
  left join public.memberships m on m.person_id = p.id and m.active
  left join public.organizations o on o.id = m.organization_id and o.active
  where p.auth_user_id = (select auth.uid()) and p.deleted_at is null
  order by m.created_at
  limit 1;
$$;

create or replace function public.my_modules(p_org uuid)
returns table (
  id text, name text, summary_es text, summary_en text, info_url text, sort int, active boolean
) language sql stable security definer set search_path = '' as $$
  with me as (
    select m.person_id, m.role, m.class_id
    from public.memberships m
    where m.person_id = private.my_person_id() and m.organization_id = p_org and m.active
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

create or replace function public.complete_password_change()
returns void language sql security definer set search_path = '' as $$
  update public.people set must_change_password = false
  where auth_user_id = (select auth.uid());
  insert into public.audit_log (actor, action, entity, entity_id)
  select (select auth.uid()), 'password_changed', 'people', private.my_person_id()::text;
$$;

drop function public.is_platform_admin();
drop function public.my_managed_orgs();
drop function public.my_taught_classes();
drop function public.my_person_id();
