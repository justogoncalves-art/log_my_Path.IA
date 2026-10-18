-- Aplicar a mano en el SQL Editor de Supabase (mypath-dev) si la herramienta no pudo: contiene DELETE y pide confirmación.
-- Es la misma parte de 20261018000006_admin_actions_welcome.sql.

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

revoke execute on function public.admin_set_class_modules(uuid, text[]) from public, anon;
revoke execute on function public.admin_assign_program(uuid, uuid[], boolean) from public, anon;
revoke execute on function public.admin_set_classes(uuid, uuid, uuid[]) from public, anon;
revoke execute on function public.admin_set_person_modules(uuid, uuid, text[]) from public, anon;
grant execute on function public.admin_set_class_modules(uuid, text[]) to authenticated;
grant execute on function public.admin_assign_program(uuid, uuid[], boolean) to authenticated;
grant execute on function public.admin_set_classes(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.admin_set_person_modules(uuid, uuid, text[]) to authenticated;
