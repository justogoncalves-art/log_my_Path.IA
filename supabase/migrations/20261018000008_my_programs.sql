-- Programas del alumno con su avance y el estado de la encuesta (mitad y final).
create or replace function public.my_programs(p_module text default null)
returns table (
  id uuid, module_id text, code text, title text, grade smallint, language text,
  chapters int, completed int, mid_rated boolean, final_rated boolean
) language sql stable security definer set search_path = '' as $$
  select p.id, p.module_id, p.code, p.title, p.grade, p.language,
         (select count(*)::int from public.chapters c where c.program_id = p.id),
         (select count(*)::int from public.chapters c
            join public.chapter_progress pr on pr.chapter_id = c.id and pr.person_id = private.my_person_id() and pr.status = 'completed'
            where c.program_id = p.id),
         coalesce((select f.mid_rating is not null from public.program_feedback f where f.program_id = p.id and f.person_id = private.my_person_id()), false),
         coalesce((select f.rating is not null from public.program_feedback f where f.program_id = p.id and f.person_id = private.my_person_id()), false)
  from public.programs p
  where p.id in (select private.my_program_ids())
    and (p_module is null or p.module_id = p_module)
  order by p.grade, p.title;
$$;
revoke execute on function public.my_programs(text) from public, anon;
grant execute on function public.my_programs(text) to authenticated;
