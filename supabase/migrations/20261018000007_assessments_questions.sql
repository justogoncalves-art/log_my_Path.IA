-- Mento.IA y demás programas con preguntas: evaluaciones psicométricas, dimensiones,
-- preguntas por capítulo, opciones con ponderaciones y respuestas del alumno.
-- Las ponderaciones nunca se muestran al alumno (tabla aparte, solo admin).

-- ─────────────────────────────────────────────────────────────
-- Catálogo de evaluaciones y sus dimensiones (las 46 columnas del Excel)
-- ─────────────────────────────────────────────────────────────
create table public.assessments (
  id text primary key,
  name_es text not null,
  name_en text not null,
  ipsative boolean not null default false,   -- elección forzada: solo se compara dentro de la persona (Anclas)
  sort int not null default 0
);

create table public.dimensions (
  id text primary key,                       -- ej. riasec.realista
  assessment_id text not null references public.assessments (id),
  name_es text not null,
  name_en text not null,
  excel_label text not null unique,          -- encabezado exacto de la columna en el Excel
  sort int not null default 0
);

insert into public.assessments (id, name_es, name_en, ipsative, sort) values
  ('riasec', 'RIASEC — Intereses vocacionales', 'RIASEC — Vocational interests', false, 1),
  ('via', 'Fortalezas de carácter (VIA-IS)', 'Character strengths (VIA-IS)', false, 2),
  ('schein', 'Anclas de carrera (Schein)', 'Career anchors (Schein)', true, 3),
  ('bigfive', 'Personalidad — Big Five (OCEAN)', 'Personality — Big Five (OCEAN)', false, 4),
  ('ie', 'Inteligencia emocional y regulación', 'Emotional intelligence and regulation', false, 5),
  ('avk', 'Estilos de aprendizaje (AVK)', 'Learning styles (AVK)', false, 6),
  ('proposito', 'Sentido de propósito', 'Sense of purpose', false, 7),
  ('intencionalidad', 'Intencionalidad en la elección de carrera', 'Intentionality in career choice', false, 8);

insert into public.dimensions (id, assessment_id, name_es, name_en, excel_label, sort) values
  ('riasec.realista', 'riasec', 'Realista', 'Realistic', 'Realista', 1),
  ('riasec.investigativo', 'riasec', 'Investigativo', 'Investigative', 'Investigativo', 2),
  ('riasec.artistico', 'riasec', 'Artístico', 'Artistic', 'Artístico', 3),
  ('riasec.social', 'riasec', 'Social', 'Social', 'Social', 4),
  ('riasec.emprendedor', 'riasec', 'Emprendedor', 'Enterprising', 'Emprendedor', 5),
  ('riasec.convencional', 'riasec', 'Convencional', 'Conventional', 'Convencional', 6),
  ('via.perseverancia', 'via', 'Perseverancia', 'Perseverance', 'Perseverancia', 1),
  ('via.curiosidad', 'via', 'Curiosidad', 'Curiosity', 'Curiosidad', 2),
  ('via.empatia', 'via', 'Empatía / Amabilidad', 'Kindness', 'Empatía / Amabilidad', 3),
  ('via.vitalidad', 'via', 'Vitalidad / Zest', 'Zest', 'Vitalidad / Zest', 4),
  ('via.liderazgo', 'via', 'Liderazgo', 'Leadership', 'Liderazgo', 5),
  ('via.optimismo', 'via', 'Optimismo / Perspectiva', 'Hope / Perspective', 'Optimismo / Perspectiva', 6),
  ('via.gratitud', 'via', 'Gratitud', 'Gratitude', 'Gratitud', 7),
  ('via.creatividad', 'via', 'Creatividad original', 'Creativity', 'Creatividad original', 8),
  ('schein.tecnico', 'schein', 'Técnico-funcional', 'Technical/functional', 'Técnico-funcional', 1),
  ('schein.gestion', 'schein', 'Gestión general', 'General management', 'Gestión general', 2),
  ('schein.autonomia', 'schein', 'Autonomía e independencia', 'Autonomy/independence', 'Autonomía e independencia', 3),
  ('schein.seguridad', 'schein', 'Seguridad y estabilidad', 'Security/stability', 'Seguridad y estabilidad', 4),
  ('schein.emprendedora', 'schein', 'Creatividad emprendedora', 'Entrepreneurial creativity', 'Creatividad emprendedora', 5),
  ('schein.servicio', 'schein', 'Dedicación a una causa / servicio', 'Service/dedication to a cause', 'Dedicación a una causa / servicio', 6),
  ('schein.desafio', 'schein', 'Desafío puro', 'Pure challenge', 'Desafío puro', 7),
  ('schein.estilo_vida', 'schein', 'Estilo de vida', 'Lifestyle', 'Estilo de vida', 8),
  ('bigfive.extraversion', 'bigfive', 'Extraversión', 'Extraversion', 'Extraversión', 1),
  ('bigfive.amabilidad', 'bigfive', 'Amabilidad', 'Agreeableness', 'Amabilidad', 2),
  ('bigfive.responsabilidad', 'bigfive', 'Responsabilidad', 'Conscientiousness', 'Responsabilidad (Conciencia)', 3),
  ('bigfive.neuroticismo', 'bigfive', 'Neuroticismo (bajo = estabilidad emocional)', 'Neuroticism', 'Neuroticismo (bajo = Estabilidad emocional)', 4),
  ('bigfive.apertura', 'bigfive', 'Apertura a la experiencia', 'Openness', 'Apertura a la experiencia', 5),
  ('ie.autoconciencia', 'ie', 'Autoconciencia emocional', 'Emotional self-awareness', 'Autoconciencia emocional', 1),
  ('ie.autorregulacion', 'ie', 'Autorregulación / Control de impulsos', 'Self-regulation', 'Autorregulación / Control de impulsos', 2),
  ('ie.motivacion', 'ie', 'Motivación intrínseca', 'Intrinsic motivation', 'Motivación intrínseca', 3),
  ('ie.empatia', 'ie', 'Empatía', 'Empathy', 'Empatía', 4),
  ('ie.habilidades_sociales', 'ie', 'Habilidades sociales', 'Social skills', 'Habilidades sociales', 5),
  ('ie.aceptacion', 'ie', 'Aceptación emocional', 'Emotional acceptance', 'Aceptación emocional', 6),
  ('ie.estrategias', 'ie', 'Acceso a estrategias de regulación', 'Access to regulation strategies', 'Acceso a estrategias de regulación', 7),
  ('avk.auditivo', 'avk', 'Auditivo', 'Auditory', 'Auditivo', 1),
  ('avk.visual', 'avk', 'Visual', 'Visual', 'Visual', 2),
  ('avk.kinestesico', 'avk', 'Kinestésico', 'Kinesthetic', 'Kinestésico', 3),
  ('proposito.impacto', 'proposito', 'Impacto social / ambiental', 'Social/environmental impact', 'Impacto social / ambiental', 1),
  ('proposito.innovacion', 'proposito', 'Innovación / creación', 'Innovation/creation', 'Innovación / creación', 2),
  ('proposito.estabilidad', 'proposito', 'Estabilidad / equilibrio', 'Stability/balance', 'Estabilidad / equilibrio', 3),
  ('proposito.crecimiento', 'proposito', 'Crecimiento personal', 'Personal growth', 'Crecimiento personal', 4),
  ('proposito.motivacion', 'proposito', 'Motivación intrínseca (propósito)', 'Intrinsic motivation (purpose)', 'Motivación intrínseca (propósito)', 5),
  ('proposito.presion_externa', 'proposito', 'Presión externa (baja)', 'External pressure (low)', 'Presión externa (baja)', 6),
  ('intencionalidad.motivacion', 'intencionalidad', 'Motivación intrínseca vs. extrínseca', 'Intrinsic vs. extrinsic motivation', 'Motivación intrínseca vs. extrínseca', 1),
  ('intencionalidad.presion', 'intencionalidad', 'Presión familiar / social', 'Family/social pressure', 'Presión familiar / social', 2),
  ('intencionalidad.claridad', 'intencionalidad', 'Claridad y compromiso con la elección', 'Clarity and commitment', 'Claridad y compromiso con la elección', 3);

-- ─────────────────────────────────────────────────────────────
-- Contenido del programa: capítulo → preguntas → opciones
-- ─────────────────────────────────────────────────────────────
alter table public.chapters add column assessment_label text;     -- "EVALUACIÓN" tal como viene en el Excel

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  position smallint not null,
  kind text not null check (kind in ('simple', 'abierta')),
  prompt text not null check (char_length(prompt) <= 2000),
  unique (chapter_id, position)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position smallint not null,
  text text not null check (char_length(text) <= 1000),
  unique (question_id, position)
);

-- Ponderaciones (0-100) de cada opción por dimensión. Solo el admin y las funciones del servidor.
create table public.option_weights (
  option_id uuid not null references public.question_options (id) on delete cascade,
  dimension_id text not null references public.dimensions (id),
  weight numeric(6, 2) not null check (weight > 0),
  primary key (option_id, dimension_id)
);

-- Respuestas del alumno: la opción elegida o el texto (abiertas). Se analizan con IA.
create table public.responses (
  person_id uuid not null references public.people (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  option_id uuid references public.question_options (id) on delete cascade,
  text_answer text check (char_length(text_answer) <= 4000),
  answered_at timestamptz not null default now(),
  primary key (person_id, question_id),
  check ((option_id is null) <> (text_answer is null))
);
create index responses_question_idx on public.responses (question_id);

alter table public.assessments enable row level security;
alter table public.dimensions enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.option_weights enable row level security;
alter table public.responses enable row level security;

create policy assessments_select on public.assessments for select to authenticated using (true);
create policy dimensions_select on public.dimensions for select to authenticated using (true);
create policy questions_select on public.questions for select to authenticated using (true);
create policy question_options_select on public.question_options for select to authenticated using (true);
create policy option_weights_select on public.option_weights for select to authenticated using (private.is_platform_admin());
-- Respuestas crudas: solo la persona y el admin. Docentes y colegio ven resultados, no respuestas.
create policy responses_select on public.responses for select to authenticated using (
  private.is_platform_admin() or person_id = private.my_person_id()
);

-- ─────────────────────────────────────────────────────────────
-- Guardar una respuesta (el alumno, solo en programas asignados)
-- ─────────────────────────────────────────────────────────────
create or replace function public.submit_answer(p_question uuid, p_option uuid default null, p_text text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := private.my_person_id();
  v_kind text;
  v_text text := nullif(left(trim(coalesce(p_text, '')), 4000), '');
begin
  if v_person is null then raise exception 'sin perfil'; end if;
  select q.kind into v_kind from public.questions q
  join public.chapters c on c.id = q.chapter_id
  where q.id = p_question and c.program_id in (select private.my_program_ids());
  if v_kind is null then raise exception 'pregunta no asignada'; end if;

  if v_kind = 'simple' then
    if p_option is null or not exists (select 1 from public.question_options o where o.id = p_option and o.question_id = p_question) then
      raise exception 'opción inválida';
    end if;
    v_text := null;
  else
    if v_text is null then raise exception 'respuesta vacía'; end if;
    p_option := null;
  end if;

  insert into public.responses (person_id, question_id, option_id, text_answer)
  values (v_person, p_question, p_option, v_text)
  on conflict (person_id, question_id) do update set
    option_id = excluded.option_id, text_answer = excluded.text_answer, answered_at = now();
end;
$$;
revoke execute on function public.submit_answer(uuid, uuid, text) from public, anon;
grant execute on function public.submit_answer(uuid, uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Puntajes por dimensión de una persona en un programa.
-- Bruto = suma de ponderaciones elegidas; máximo = suma del mayor peso posible por pregunta;
-- T = 50 + ((X − max/2) / (max/6)) × 10, limitado a 20–80 (T teórica, no normativa).
-- Por ahora solo el admin (lo usa la IA para los reportes).
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_program_scores(p_person uuid, p_program uuid)
returns table (assessment_id text, dimension_id text, dimension text, raw numeric, max_possible numeric, t_score numeric, answered int, items int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
  with q as (
    select q.id from public.questions q join public.chapters c on c.id = q.chapter_id
    where c.program_id = p_program and q.kind = 'simple'
  ),
  per_q as (   -- mayor peso posible por pregunta y dimensión
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
    select pq.dimension_id,
           sum(pq.best) as max_possible,
           coalesce(sum(g.weight), 0) as raw,
           count(distinct pq.question_id)::int as items,
           count(distinct r.question_id)::int as answered
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
end;
$$;
revoke execute on function public.admin_program_scores(uuid, uuid) from public, anon;
grant execute on function public.admin_program_scores(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Carga de un programa desde el Excel (admin).
-- Cada carga crea una versión nueva y desactiva la anterior: nunca se borra nada,
-- así las respuestas viejas siguen apuntando a sus preguntas.
-- Si la versión anterior todavía no tiene respuestas, las asignaciones pasan a la nueva.
-- p_chapters: [{position, title, assessment, video, questions: [{position, kind, prompt,
--               options: [{position, text, weights: {dimension_id: peso}}]}]}]
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_import_program(
  p_module text, p_code text, p_title text, p_level public.school_level, p_grade int,
  p_language text, p_track text, p_chapters jsonb
) returns table (program_id uuid, version int, chapters int, questions int, options int, moved_assignments boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_old uuid; v_old_version int; v_prog uuid; v_version int;
  ch jsonb; qu jsonb; op jsonb; w record;
  v_ch uuid; v_q uuid; v_o uuid;
  n_ch int := 0; n_q int := 0; n_o int := 0; v_moved boolean := false;
begin
  perform private.assert_admin();
  if not exists (select 1 from public.modules where id = p_module) then raise exception 'módulo inexistente'; end if;
  if not exists (select 1 from public.languages where code = p_language) then raise exception 'idioma inexistente'; end if;
  if p_code !~ '^[a-z0-9-]{3,60}$' or coalesce(trim(p_title), '') = '' then raise exception 'datos inválidos'; end if;
  if jsonb_typeof(p_chapters) is distinct from 'array' or jsonb_array_length(p_chapters) not between 1 and 60 then
    raise exception 'capítulos inválidos';
  end if;

  select p.id, p.version into v_old, v_old_version from public.programs p
  where p.code = p_code and p.language = p_language and p.track is not distinct from nullif(p_track, '') and p.active
  order by p.version desc limit 1;
  v_version := coalesce((select max(p.version) from public.programs p
                         where p.code = p_code and p.language = p_language and p.track is not distinct from nullif(p_track, '')), 0) + 1;

  insert into public.programs (module_id, code, title, level, grade, language, track, version)
  values (p_module, p_code, left(trim(p_title), 120), p_level, p_grade, p_language, nullif(p_track, ''), v_version)
  returning id into v_prog;

  for ch in select value from jsonb_array_elements(p_chapters) loop
    insert into public.chapters (program_id, position, title, mux_playback_id, assessment_label)
    values (v_prog, (ch->>'position')::smallint, left(ch->>'title', 200),
            nullif(left(trim(coalesce(ch->>'video', '')), 100), ''), nullif(left(ch->>'assessment', 200), ''))
    returning id into v_ch;
    n_ch := n_ch + 1;
    for qu in select value from jsonb_array_elements(coalesce(ch->'questions', '[]')) loop
      if qu->>'kind' not in ('simple', 'abierta') then raise exception 'tipo de pregunta inválido'; end if;
      insert into public.questions (chapter_id, position, kind, prompt)
      values (v_ch, (qu->>'position')::smallint, qu->>'kind', qu->>'prompt')
      returning id into v_q;
      n_q := n_q + 1;
      for op in select value from jsonb_array_elements(coalesce(qu->'options', '[]')) loop
        insert into public.question_options (question_id, position, text)
        values (v_q, (op->>'position')::smallint, op->>'text')
        returning id into v_o;
        n_o := n_o + 1;
        for w in select key, value from jsonb_each_text(coalesce(op->'weights', '{}')) loop
          if not exists (select 1 from public.dimensions d where d.id = w.key) then raise exception 'dimensión inexistente: %', w.key; end if;
          if w.value::numeric > 0 then
            insert into public.option_weights (option_id, dimension_id, weight) values (v_o, w.key, w.value::numeric);
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  if v_old is not null then
    update public.programs p set active = false where p.id = v_old;
    if not exists (
      select 1 from public.responses r join public.questions q on q.id = r.question_id
      join public.chapters c on c.id = q.chapter_id where c.program_id = v_old
    ) and not exists (select 1 from public.chapter_progress pr join public.chapters c on c.id = pr.chapter_id where c.program_id = v_old) then
      update public.class_programs cp set program_id = v_prog where cp.program_id = v_old;
      update public.person_programs pp set program_id = v_prog where pp.program_id = v_old;
      v_moved := true;
    end if;
  end if;

  perform private.audit('import_program', 'program', v_prog::text,
                        jsonb_build_object('code', p_code, 'language', p_language, 'version', v_version));
  return query select v_prog, v_version, n_ch, n_q, n_o, v_moved;
end;
$$;
revoke execute on function public.admin_import_program(text, text, text, public.school_level, int, text, text, jsonb) from public, anon;
grant execute on function public.admin_import_program(text, text, text, public.school_level, int, text, text, jsonb) to authenticated;
