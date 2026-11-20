-- Corrige los puntajes de staff_class_stats y class_report_input (agregaciones anidadas).
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
