-- Reporte de programa generado con IA (Claude) a partir de puntajes y respuestas.
-- El alumno lo lee; solo el servidor (clave secreta) lo escribe. A la IA no viaja ningún dato personal.

create table public.program_reports (
  person_id uuid not null references public.people (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  status text not null default 'pendiente' check (status in ('pendiente', 'generando', 'listo', 'error')),
  content jsonb,
  model text,
  error_code text,
  attempts int not null default 0,
  started_at timestamptz,
  generated_at timestamptz,
  primary key (person_id, program_id)
);
alter table public.program_reports enable row level security;
create policy program_reports_select on public.program_reports for select to authenticated using (
  public.is_platform_admin() or person_id = public.my_person_id()
);

-- Puntajes por dimensión sin control de acceso: solo lo llaman funciones ya autorizadas
create or replace function private.compute_scores(p_person uuid, p_program uuid)
returns table (assessment_id text, dimension_id text, dimension text, raw numeric, max_possible numeric, t_score numeric, answered int, items int)
language sql stable security definer set search_path = '' as $$
  with q as (
    select q.id from public.questions q join public.chapters c on c.id = q.chapter_id
    where c.program_id = p_program and q.kind = 'simple'
  ),
  per_q as (
    select o.question_id, w.dimension_id, max(w.weight) as best
    from public.question_options o join public.option_weights w on w.option_id = o.id
    where o.question_id in (select id from q)
    group by o.question_id, w.dimension_id
  ),
  got as (
    select o.question_id, w.dimension_id, w.weight
    from public.responses r
    join public.question_options o on o.id = r.option_id
    join public.option_weights w on w.option_id = o.id
    where r.person_id = p_person and r.question_id in (select id from q)
  ),
  agg as (
    select pq.dimension_id, sum(pq.best) as max_possible, coalesce(sum(g.weight), 0) as raw,
           count(distinct pq.question_id)::int as items, count(distinct r.question_id)::int as answered
    from per_q pq
    left join got g on g.question_id = pq.question_id and g.dimension_id = pq.dimension_id
    left join public.responses r on r.question_id = pq.question_id and r.person_id = p_person
    group by pq.dimension_id
  )
  select d.assessment_id, d.id, d.name_es, a.raw, a.max_possible,
         round(least(80, greatest(20, 50 + ((a.raw - a.max_possible / 2) / nullif(a.max_possible / 6, 0)) * 10)), 1),
         a.answered, a.items
  from agg a join public.dimensions d on d.id = a.dimension_id
  order by d.assessment_id, d.sort;
$$;
revoke execute on function private.compute_scores(uuid, uuid) from public, anon, authenticated;

create or replace function public.admin_program_scores(p_person uuid, p_program uuid)
returns table (assessment_id text, dimension_id text, dimension text, raw numeric, max_possible numeric, t_score numeric, answered int, items int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query select * from private.compute_scores(p_person, p_program);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Funciones del servidor (solo service_role)
-- ─────────────────────────────────────────────────────────────

-- Toma el turno de generar: solo si el programa está completo y nadie lo está generando.
-- Con error se reintenta hasta 3 veces (cada intento cuesta una llamada a la IA).
create or replace function public.report_claim(p_person uuid, p_program uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  if exists (
    select 1 from public.chapters c
    left join public.chapter_progress pr on pr.chapter_id = c.id and pr.person_id = p_person and pr.status = 'completed'
    where c.program_id = p_program and pr.chapter_id is null
  ) then return false; end if;

  insert into public.program_reports (person_id, program_id, status, started_at, attempts)
  values (p_person, p_program, 'generando', now(), 1)
  on conflict (person_id, program_id) do update set status = 'generando', started_at = now(),
    attempts = public.program_reports.attempts + 1, error_code = null
  where public.program_reports.status = 'pendiente'
     or (public.program_reports.status = 'error' and public.program_reports.attempts < 3)
     or (public.program_reports.status = 'generando' and public.program_reports.started_at < now() - interval '10 minutes')
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

-- Datos para la IA: programa, puntajes y respuestas. Sin nombre, mail ni documento.
create or replace function public.report_input(p_person uuid, p_program uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'program', (select jsonb_build_object('title', p.title, 'grade', p.grade, 'level', p.level, 'language', p.language)
                from public.programs p where p.id = p_program),
    'country', (select o.country from public.memberships m join public.organizations o on o.id = m.organization_id
                where m.person_id = p_person and m.active order by m.created_at limit 1),
    'scores', (select coalesce(jsonb_agg(jsonb_build_object('assessment', s.assessment_id, 'dimension', s.dimension_id,
                 'name', s.dimension, 't', s.t_score, 'answered', s.answered, 'items', s.items)), '[]')
               from private.compute_scores(p_person, p_program) s),
    'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                  'chapter', c.title, 'evaluation', c.assessment_label, 'kind', q.kind, 'question', q.prompt,
                  'answer', coalesce(o.text, r.text_answer)) order by c.position, q.position), '[]')
                from public.questions q
                join public.chapters c on c.id = q.chapter_id
                left join public.responses r on r.question_id = q.id and r.person_id = p_person
                left join public.question_options o on o.id = r.option_id
                where c.program_id = p_program and r.question_id is not null)
  );
$$;

create or replace function public.report_save(p_person uuid, p_program uuid, p_status text, p_content jsonb, p_model text, p_error text)
returns void language sql security definer set search_path = '' as $$
  update public.program_reports set
    status = p_status, content = coalesce(p_content, content), model = coalesce(p_model, model),
    error_code = p_error, generated_at = case when p_status = 'listo' then now() else generated_at end
  where person_id = p_person and program_id = p_program;
$$;

revoke execute on function public.report_claim(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.report_input(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.report_save(uuid, uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.report_claim(uuid, uuid) to service_role;
grant execute on function public.report_input(uuid, uuid) to service_role;
grant execute on function public.report_save(uuid, uuid, text, jsonb, text, text) to service_role;
