-- Admin → Personas: avance de cada alumno en los programas que tiene asignados (por su clase o
-- individualmente) dentro de la organización, y estado del reporte:
--   'reporte'      → tiene al menos un reporte con IA listo
--   'en_proceso'   → empezó algún capítulo (o terminó y el reporte se está generando)
--   'sin_comenzar' → no empezó ningún capítulo
create or replace function public.admin_people_progress(p_org uuid, p_people uuid[])
returns table (person_id uuid, completed int, total int, pct int, status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
  with progs as (
    select m.person_id, cp.program_id
    from public.memberships m
    join public.class_programs cp on cp.class_id = m.class_id
    where m.organization_id = p_org and m.role = 'alumno' and m.person_id = any(p_people)
    union
    select pp.person_id, pp.program_id
    from public.person_programs pp
    where pp.organization_id = p_org and pp.person_id = any(p_people)
  ),
  agg as (
    select pr.person_id,
      (select count(*) from public.chapter_progress chp join public.chapters ch on ch.id = chp.chapter_id
        where chp.person_id = pr.person_id and chp.status = 'completed'
          and ch.program_id in (select x.program_id from progs x where x.person_id = pr.person_id))::int as completed,
      (select count(*) from public.chapters ch
        where ch.program_id in (select x.program_id from progs x where x.person_id = pr.person_id))::int as total,
      exists (select 1 from public.chapter_progress chp join public.chapters ch on ch.id = chp.chapter_id
        where chp.person_id = pr.person_id
          and ch.program_id in (select x.program_id from progs x where x.person_id = pr.person_id)) as started,
      exists (select 1 from public.program_reports r
        where r.person_id = pr.person_id and r.status = 'listo'
          and r.program_id in (select x.program_id from progs x where x.person_id = pr.person_id)) as has_report
    from (select distinct x.person_id from progs x) pr
  )
  select a.person_id, a.completed, a.total,
    case when a.total > 0 then round(100.0 * a.completed / a.total)::int else 0 end,
    case when a.has_report then 'reporte' when a.started then 'en_proceso' else 'sin_comenzar' end
  from agg a;
end;
$$;

revoke execute on function public.admin_people_progress(uuid, uuid[]) from public, anon;
grant execute on function public.admin_people_progress(uuid, uuid[]) to authenticated;
