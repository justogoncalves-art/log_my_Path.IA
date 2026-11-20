-- El filtro "Híbrida u online" incluye también las carreras 100 % online.
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
      and (p_modality is null or private.modality_kind(p.modality) = p_modality
           or (p_modality = 'hibrida' and private.modality_kind(p.modality) = 'online'))
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