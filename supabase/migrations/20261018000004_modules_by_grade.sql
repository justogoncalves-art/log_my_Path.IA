-- El alumno solo ve un módulo si su clase está en el nivel/año mínimo del módulo
-- (Campus y EdFin: últimos años de secundaria).
create or replace function public.my_modules(p_org uuid)
returns table (
  id text, name text, summary_es text, summary_en text, info_url text, sort int, active boolean
) language sql stable security definer set search_path = '' as $$
  with me as (
    select m.person_id, m.role, m.class_id, c.level, c.grade
    from public.memberships m
    left join public.classes c on c.id = m.class_id
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
    and (
      (select role from me) <> 'alumno'
      or (
        md.visible_to_students
        and (
          md.min_level is null
          or (select level from me) > md.min_level
          or ((select level from me) = md.min_level and coalesce((select grade from me), 0) >= coalesce(md.min_grade, 0))
        )
      )
    )
  order by md.sort;
$$;
