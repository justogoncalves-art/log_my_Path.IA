-- Buscadores de Campus v2: primero los resultados del país del alumno (p_home) y después el extranjero,
-- con más filtros (modalidad, duración, becas, tipo RIASEC, tipo de institución).
-- Reemplazan a campus_search_programs / campus_search_universities, que quedan sin permiso (no se borran).

-- Modalidad normalizada a partir del texto libre (en varios idiomas)
create or replace function private.modality_kind(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p ~* 'h[ií]brid|semipresencial|blended' then 'hibrida'
    when p ~* 'online|virtual|l[ií]nea|distancia|remote' and p ~* 'presencial|in-person|présentiel|präsenz|presenza|aanwezig' then 'hibrida'
    when p ~* 'online|virtual|l[ií]nea|distancia|remote' then 'online'
    else 'presencial' end;
$$;

-- ¿Ofrece becas? (S, Parcial, Merit-based… sí; N, No o vacío, no)
create or replace function private.has_scholarships(p text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(btrim(p), '') !~* '^(n|no|ninguna|none|—|-|)$';
$$;

create or replace function public.campus_find_programs(
  p_q text default null, p_country text default null, p_home text default null, p_area text default null,
  p_kind text default null, p_modality text default null, p_duration int default null, p_scholarships boolean default null,
  p_riasec text default null, p_sort text default 'afinidad', p_limit int default 24, p_offset int default 0)
returns table (id uuid, name text, program_type text, modality text, knowledge_area text, duration_years numeric,
               riasec_primary char(1), riasec_secondary char(1), annual_cost text, scholarships text, university_id uuid,
               university text, country_code char(2), city text, rank_qs int, affinity int, is_home boolean, total bigint)
language sql stable security definer set search_path = '' as $$
  with prof as (select private.my_riasec_json() as j),
  r as (
    select p.id, p.name, p.program_type, p.modality, p.knowledge_area, p.duration_years, p.riasec_primary,
           p.riasec_secondary, p.annual_cost, p.scholarships, u.id as university_id, u.official_name as university,
           u.country_code, u.city, u.rank_qs,
           private.affinity(p.riasec_primary, p.riasec_secondary, prof.j) as affinity,
           (p_home is not null and u.country_code = upper(p_home)) as is_home
    from public.campus_programs p join public.campus_universities u on u.id = p.university_id, prof
    where (p_country is null or u.country_code = upper(p_country))
      and (p_area is null or p.knowledge_area = p_area)
      and (p_kind is null or private.ownership_kind(u.ownership) = p_kind)
      and (p_modality is null or private.modality_kind(p.modality) = p_modality)
      and (p_duration is null
           or (p_duration <= 3 and p.duration_years <= 3)
           or (p_duration in (4, 5) and p.duration_years > p_duration - 1 and p.duration_years <= p_duration)
           or (p_duration >= 6 and p.duration_years > 5))
      and (p_scholarships is null or private.has_scholarships(p.scholarships) = p_scholarships)
      and (p_riasec is null or p.riasec_primary = upper(p_riasec))
      and (p_q is null or p.name ilike '%' || p_q || '%' or p.name_en ilike '%' || p_q || '%'
           or u.official_name ilike '%' || p_q || '%' or u.short_name ilike '%' || p_q || '%')
  )
  select r.*, count(*) over () from r
  order by r.is_home desc,
           case when p_sort = 'ranking' then coalesce(r.rank_qs, 100000) end,
           case when p_sort <> 'ranking' then r.affinity end desc nulls last,
           r.rank_qs nulls last, r.name
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;

create or replace function public.campus_find_universities(
  p_q text default null, p_country text default null, p_home text default null, p_kind text default null,
  p_institution text default null, p_max_qs int default null, p_limit int default 24, p_offset int default 0)
returns table (id uuid, official_name text, short_name text, country_code char(2), city text, ownership text,
               institution_type text, instruction_language text, rank_qs int, programs int, is_home boolean, total bigint)
language sql stable security definer set search_path = '' as $$
  select u.id, u.official_name, u.short_name, u.country_code, u.city, u.ownership, u.institution_type,
         u.instruction_language, u.rank_qs,
         (select count(*)::int from public.campus_programs p where p.university_id = u.id),
         (p_home is not null and u.country_code = upper(p_home)), count(*) over ()
  from public.campus_universities u
  where (p_country is null or u.country_code = upper(p_country))
    and (p_kind is null or private.ownership_kind(u.ownership) = p_kind)
    and (p_institution is null or u.institution_type = p_institution)
    and (p_max_qs is null or u.rank_qs <= p_max_qs)
    and (p_q is null or u.official_name ilike '%' || p_q || '%' or u.short_name ilike '%' || p_q || '%' or u.city ilike '%' || p_q || '%')
  order by (p_home is not null and u.country_code = upper(p_home)) desc,
           u.rank_qs nulls last, u.rank_national nulls last, u.official_name
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;

-- Opciones de los filtros, con cuántos hay de cada una
create or replace function public.campus_filter_options()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'areas', (select coalesce(jsonb_agg(jsonb_build_object('v', knowledge_area, 'n', n) order by n desc), '[]')
              from (select knowledge_area, count(*) n from public.campus_programs where knowledge_area is not null group by 1) a),
    'institutions', (select coalesce(jsonb_agg(jsonb_build_object('v', institution_type, 'n', n) order by n desc), '[]')
              from (select institution_type, count(*) n from public.campus_universities where institution_type is not null group by 1) i)
  );
$$;

revoke execute on function private.modality_kind(text) from public, anon, authenticated;
revoke execute on function private.has_scholarships(text) from public, anon, authenticated;
revoke execute on function public.campus_search_programs(text, text, text, text, text, int, int) from authenticated;
revoke execute on function public.campus_search_universities(text, text, text, int, int, int) from authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.campus_find_programs(text, text, text, text, text, text, int, boolean, text, text, int, int)',
    'public.campus_find_universities(text, text, text, text, text, int, int, int)',
    'public.campus_filter_options()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
