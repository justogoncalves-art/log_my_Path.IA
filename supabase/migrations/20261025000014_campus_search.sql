-- My Campus.IA para el alumno: perfil RIASEC propio, afinidad de cada carrera, buscadores y filtros.
-- El perfil sale de las respuestas del último programa de Mento.IA completado (no depende del reporte de IA).

-- Puntajes T del alumno en las 6 dimensiones RIASEC (vacío si todavía no completó un programa con RIASEC)
create or replace function public.my_riasec()
returns table (letter char(1), t numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_person uuid := private.my_person_id(); v_program uuid;
begin
  if v_person is null then return; end if;
  select pc.program_id into v_program
  from public.program_completions pc join public.programs p on p.id = pc.program_id and p.module_id = 'mento'
  where pc.person_id = v_person
    and exists (select 1 from public.chapters c where c.program_id = pc.program_id and c.assessment_label ilike '%riasec%')
  order by pc.completed_at desc limit 1;
  if v_program is null then return; end if;
  return query
  select (case s.dimension_id
            when 'riasec.realista' then 'R' when 'riasec.investigativo' then 'I' when 'riasec.artistico' then 'A'
            when 'riasec.social' then 'S' when 'riasec.emprendedor' then 'E' when 'riasec.convencional' then 'C' end)::char(1),
         s.t_score
  from private.compute_scores(v_person, v_program) s
  where s.assessment_id = 'riasec' and s.answered > 0;
end;
$$;

-- Afinidad 0-100 de una carrera según el código RIASEC (primario pesa 65 %, secundario 35 %)
create or replace function private.affinity(p_primary char(1), p_secondary char(1), p_profile jsonb)
returns int language sql immutable set search_path = '' as $$
  select case when p_primary is null or p_profile is null or p_profile = '{}'::jsonb then null else
    greatest(0, least(100, round(
      ((0.65 * coalesce((p_profile->>p_primary)::numeric, 50)
      + 0.35 * coalesce((p_profile->>coalesce(p_secondary, p_primary))::numeric, 50)) - 20) / 60 * 100
    )))::int end;
$$;

create or replace function private.my_riasec_json() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(letter, t), '{}'::jsonb) from public.my_riasec();
$$;

-- "Pública" / "Privada" a partir del texto libre del Excel
create or replace function private.ownership_kind(p text) returns text
language sql immutable set search_path = '' as $$
  select case when p ~* 'p[uú]blic' then 'publica' when p ~* 'privad|private' then 'privada' else 'otra' end;
$$;

-- Carreras con más afinidad, agrupadas por nombre (en un país o en todos)
create or replace function public.campus_affinity(p_country text default null, p_limit int default 12)
returns table (name text, riasec_primary char(1), riasec_secondary char(1), knowledge_area text,
               affinity int, universities int, countries int)
language sql stable security definer set search_path = '' as $$
  with prof as (select private.my_riasec_json() as j),
  g as (
    select min(p.name) as name, mode() within group (order by p.riasec_primary) as rp,
           mode() within group (order by p.riasec_secondary) as rs,
           mode() within group (order by p.knowledge_area) as area,
           count(distinct p.university_id)::int as unis, count(distinct u.country_code)::int as ctry
    from public.campus_programs p join public.campus_universities u on u.id = p.university_id
    where p.riasec_primary is not null and (p_country is null or u.country_code = upper(p_country))
    group by lower(p.name)
  )
  select g.name, g.rp, g.rs, g.area, private.affinity(g.rp, g.rs, prof.j), g.unis, g.ctry
  from g, prof
  where prof.j <> '{}'::jsonb
  order by private.affinity(g.rp, g.rs, prof.j) desc nulls last, g.unis desc, g.name
  limit least(greatest(p_limit, 1), 50);
$$;

-- Buscador de carreras
create or replace function public.campus_search_programs(
  p_q text default null, p_country text default null, p_area text default null, p_kind text default null,
  p_sort text default 'afinidad', p_limit int default 20, p_offset int default 0)
returns table (id uuid, name text, program_type text, modality text, knowledge_area text, duration_years numeric,
               riasec_primary char(1), riasec_secondary char(1), annual_cost text, university_id uuid,
               university text, country_code char(2), city text, rank_qs int, affinity int, total bigint)
language sql stable security definer set search_path = '' as $$
  with prof as (select private.my_riasec_json() as j),
  r as (
    select p.id, p.name, p.program_type, p.modality, p.knowledge_area, p.duration_years, p.riasec_primary,
           p.riasec_secondary, p.annual_cost, u.id as university_id, u.official_name as university, u.country_code,
           u.city, u.rank_qs, private.affinity(p.riasec_primary, p.riasec_secondary, prof.j) as affinity
    from public.campus_programs p join public.campus_universities u on u.id = p.university_id, prof
    where (p_country is null or u.country_code = upper(p_country))
      and (p_area is null or p.knowledge_area = p_area)
      and (p_kind is null or private.ownership_kind(u.ownership) = p_kind)
      and (p_q is null or p.name ilike '%' || p_q || '%' or p.name_en ilike '%' || p_q || '%'
           or u.official_name ilike '%' || p_q || '%' or u.short_name ilike '%' || p_q || '%')
  )
  select r.*, count(*) over () from r
  order by case when p_sort = 'ranking' then coalesce(r.rank_qs, 100000) end,
           case when p_sort <> 'ranking' then r.affinity end desc nulls last,
           r.rank_qs nulls last, r.name
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

-- Buscador de universidades
create or replace function public.campus_search_universities(
  p_q text default null, p_country text default null, p_kind text default null, p_max_qs int default null,
  p_limit int default 20, p_offset int default 0)
returns table (id uuid, official_name text, short_name text, country_code char(2), city text, ownership text,
               institution_type text, instruction_language text, rank_qs int, programs int, total bigint)
language sql stable security definer set search_path = '' as $$
  select u.id, u.official_name, u.short_name, u.country_code, u.city, u.ownership, u.institution_type,
         u.instruction_language, u.rank_qs,
         (select count(*)::int from public.campus_programs p where p.university_id = u.id), count(*) over ()
  from public.campus_universities u
  where (p_country is null or u.country_code = upper(p_country))
    and (p_kind is null or private.ownership_kind(u.ownership) = p_kind)
    and (p_max_qs is null or u.rank_qs <= p_max_qs)
    and (p_q is null or u.official_name ilike '%' || p_q || '%' or u.short_name ilike '%' || p_q || '%' or u.city ilike '%' || p_q || '%')
  order by u.rank_qs nulls last, u.rank_national nulls last, u.official_name
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

-- Opciones de los filtros
create or replace function public.campus_areas()
returns table (knowledge_area text, programs int)
language sql stable security definer set search_path = '' as $$
  select knowledge_area, count(*)::int from public.campus_programs where knowledge_area is not null
  group by knowledge_area order by count(*) desc;
$$;

-- Afinidad de carreras puntuales (para la ficha y el comparador)
create or replace function public.campus_program_affinity(p_ids uuid[])
returns table (id uuid, affinity int)
language sql stable security definer set search_path = '' as $$
  select p.id, private.affinity(p.riasec_primary, p.riasec_secondary, private.my_riasec_json())
  from public.campus_programs p where p.id = any(p_ids[1:50]);
$$;

revoke execute on function private.affinity(char, char, jsonb) from public, anon, authenticated;
revoke execute on function private.my_riasec_json() from public, anon, authenticated;
revoke execute on function private.ownership_kind(text) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.my_riasec()', 'public.campus_affinity(text, int)',
    'public.campus_search_programs(text, text, text, text, text, int, int)',
    'public.campus_search_universities(text, text, text, int, int, int)', 'public.campus_areas()',
    'public.campus_program_affinity(uuid[])'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
