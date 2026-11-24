-- My Campus.IA: catálogo global de universidades y carreras.
-- Se carga desde admin → Campus con el Excel de 43 columnas (una fila por carrera, con los datos de la
-- universidad repetidos). Cada carga actualiza lo que ya existe y agrega lo nuevo: nunca borra.
-- Es un catálogo público (sin datos personales): lo lee cualquier usuario con sesión; solo el admin escribe.

create table public.campus_universities (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null,                -- ISO 3166-1 (AR, ES, GB…)
  official_name text not null check (char_length(official_name) between 2 and 200),
  name_key text generated always as (lower(btrim(official_name))) stored,
  short_name text,
  region text,
  city text,
  ownership text,                               -- TIPO (Pública, Privada…)
  institution_type text,                        -- TIPO_INSTITUCIÓN
  instruction_language text,
  rank_qs int,
  rank_the int,
  rank_arwu int,
  rank_national int,
  accreditations text,
  students text,
  founded int,
  website text,
  description_es text,
  description_en text,
  data_source text,
  data_updated text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, name_key)
);
create index campus_universities_country_idx on public.campus_universities (country_code);

-- Notas internas de My Path: nunca las ve un alumno
create table public.campus_university_notes (
  university_id uuid primary key references public.campus_universities (id) on delete cascade,
  notes text not null
);

create table public.campus_programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.campus_universities (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  program_type text,
  modality text,
  prog_key text generated always as (
    lower(btrim(name)) || '|' || lower(coalesce(btrim(program_type), '')) || '|' || lower(coalesce(btrim(modality), ''))
  ) stored,
  name_en text,
  knowledge_area text,
  professional_family text,
  riasec_primary char(1) check (riasec_primary in ('R', 'I', 'A', 'S', 'E', 'C')),
  riasec_secondary char(1) check (riasec_secondary in ('R', 'I', 'A', 'S', 'E', 'C')),
  duration_years numeric(3,1),
  language text,
  annual_cost text,
  scholarships text,
  admission text,
  cutoff_type text,
  cutoff_source text,
  employment_rate text,
  avg_salary text,
  url text,
  description text,
  curriculum text,
  source text,
  data_updated text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, prog_key)
);
create index campus_programs_university_idx on public.campus_programs (university_id);
create index campus_programs_riasec_idx on public.campus_programs (riasec_primary, riasec_secondary);
create index campus_programs_area_idx on public.campus_programs (knowledge_area);

alter table public.campus_universities enable row level security;
alter table public.campus_university_notes enable row level security;
alter table public.campus_programs enable row level security;
create policy campus_universities_select on public.campus_universities for select to authenticated using (true);
create policy campus_programs_select on public.campus_programs for select to authenticated using (true);
create policy campus_notes_select on public.campus_university_notes for select to authenticated using (public.is_platform_admin());

-- ─────────────────────────────────────────────────────────────
-- Carga (admin). Llega en tandas: universidades y sus carreras.
-- p_universities: [{country_code, official_name, short_name, region, city, ownership, institution_type,
--                   instruction_language, rank_qs, rank_the, rank_arwu, rank_national, accreditations,
--                   students, founded, website, description_es, description_en, data_source, data_updated, notes}]
-- p_programs: [{country_code, university, name, program_type, modality, name_en, knowledge_area,
--               professional_family, riasec_primary, riasec_secondary, duration_years, language, annual_cost,
--               scholarships, admission, cutoff_type, cutoff_source, employment_rate, avg_salary, url,
--               description, curriculum, source, data_updated}]
-- Devuelve cuántas universidades y carreras son nuevas y cuántas cambiaron (las iguales no se tocan).
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_import_campus(p_universities jsonb, p_programs jsonb)
returns table (universities_new int, universities_updated int, programs_new int, programs_updated int)
language plpgsql security definer set search_path = '' as $$
declare
  v_un int := 0; v_uu int := 0; v_pn int := 0; v_pu int := 0; v_missing int;
begin
  perform private.assert_admin();
  if jsonb_typeof(p_universities) is distinct from 'array' or jsonb_typeof(p_programs) is distinct from 'array'
     or jsonb_array_length(p_universities) > 500 or jsonb_array_length(p_programs) > 3000 then
    raise exception 'datos inválidos';
  end if;

  with src as (
    select distinct on (upper(u->>'country_code'), lower(btrim(u->>'official_name')))
      upper(u->>'country_code') as country_code, left(btrim(u->>'official_name'), 200) as official_name,
      left(u->>'short_name', 60) short_name, left(u->>'region', 120) region, left(u->>'city', 120) city,
      left(u->>'ownership', 80) ownership, left(u->>'institution_type', 80) institution_type,
      left(u->>'instruction_language', 80) instruction_language,
      (u->>'rank_qs')::int rank_qs, (u->>'rank_the')::int rank_the, (u->>'rank_arwu')::int rank_arwu,
      (u->>'rank_national')::int rank_national, left(u->>'accreditations', 400) accreditations,
      left(u->>'students', 40) students, (u->>'founded')::int founded, left(u->>'website', 300) website,
      left(u->>'description_es', 3000) description_es, left(u->>'description_en', 3000) description_en,
      left(u->>'data_source', 500) data_source, left(u->>'data_updated', 300) data_updated, ord
    from jsonb_array_elements(p_universities) with ordinality as t(u, ord)
    where (u->>'country_code') ~ '^[A-Za-z]{2}$' and char_length(btrim(coalesce(u->>'official_name', ''))) between 2 and 200
    order by upper(u->>'country_code'), lower(btrim(u->>'official_name')), ord desc
  ), up as (
    insert into public.campus_universities as cu (country_code, official_name, short_name, region, city, ownership,
      institution_type, instruction_language, rank_qs, rank_the, rank_arwu, rank_national, accreditations, students,
      founded, website, description_es, description_en, data_source, data_updated)
    select country_code, official_name, short_name, region, city, ownership, institution_type, instruction_language,
      rank_qs, rank_the, rank_arwu, rank_national, accreditations, students, founded, website, description_es,
      description_en, data_source, data_updated
    from src
    on conflict (country_code, name_key) do update set
      official_name = excluded.official_name, short_name = excluded.short_name, region = excluded.region,
      city = excluded.city, ownership = excluded.ownership, institution_type = excluded.institution_type,
      instruction_language = excluded.instruction_language, rank_qs = excluded.rank_qs, rank_the = excluded.rank_the,
      rank_arwu = excluded.rank_arwu, rank_national = excluded.rank_national, accreditations = excluded.accreditations,
      students = excluded.students, founded = excluded.founded, website = excluded.website,
      description_es = excluded.description_es, description_en = excluded.description_en,
      data_source = excluded.data_source, data_updated = excluded.data_updated, updated_at = now()
    where (cu.official_name, cu.short_name, cu.region, cu.city, cu.ownership, cu.institution_type, cu.instruction_language,
           cu.rank_qs, cu.rank_the, cu.rank_arwu, cu.rank_national, cu.accreditations, cu.students, cu.founded, cu.website,
           cu.description_es, cu.description_en, cu.data_source, cu.data_updated)
      is distinct from
          (excluded.official_name, excluded.short_name, excluded.region, excluded.city, excluded.ownership,
           excluded.institution_type, excluded.instruction_language, excluded.rank_qs, excluded.rank_the,
           excluded.rank_arwu, excluded.rank_national, excluded.accreditations, excluded.students, excluded.founded,
           excluded.website, excluded.description_es, excluded.description_en, excluded.data_source, excluded.data_updated)
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into v_un, v_uu from up;

  -- Notas internas (solo admin)
  insert into public.campus_university_notes (university_id, notes)
  select distinct on (cu.id) cu.id, left(u->>'notes', 2000)
  from jsonb_array_elements(p_universities) with ordinality as t(u, ord)
  join public.campus_universities cu on cu.country_code = upper(u->>'country_code') and cu.name_key = lower(btrim(u->>'official_name'))
  where nullif(btrim(coalesce(u->>'notes', '')), '') is not null
  order by cu.id, ord desc
  on conflict (university_id) do update set notes = excluded.notes;

  -- Cada carrera tiene que apuntar a una universidad existente
  select count(*) into v_missing
  from jsonb_array_elements(p_programs) p
  where not exists (select 1 from public.campus_universities cu
                    where cu.country_code = upper(p->>'country_code') and cu.name_key = lower(btrim(p->>'university')));
  if v_missing > 0 then raise exception 'hay % carreras sin su universidad', v_missing; end if;

  with src as (
    select distinct on (cu.id, lower(btrim(p->>'name')), lower(coalesce(btrim(p->>'program_type'), '')), lower(coalesce(btrim(p->>'modality'), '')))
      cu.id as university_id, left(btrim(p->>'name'), 200) as name, left(p->>'program_type', 80) program_type,
      left(p->>'modality', 80) modality, left(p->>'name_en', 200) name_en, left(p->>'knowledge_area', 120) knowledge_area,
      left(p->>'professional_family', 120) professional_family,
      nullif(upper(left(p->>'riasec_primary', 1)), '') riasec_primary, nullif(upper(left(p->>'riasec_secondary', 1)), '') riasec_secondary,
      (p->>'duration_years')::numeric(3,1) duration_years, left(p->>'language', 80) language,
      left(p->>'annual_cost', 300) annual_cost, left(p->>'scholarships', 200) scholarships, left(p->>'admission', 500) admission,
      left(p->>'cutoff_type', 200) cutoff_type, left(p->>'cutoff_source', 500) cutoff_source,
      left(p->>'employment_rate', 40) employment_rate, left(p->>'avg_salary', 120) avg_salary, left(p->>'url', 400) url,
      left(p->>'description', 3000) description, left(p->>'curriculum', 1500) curriculum, left(p->>'source', 500) source,
      left(p->>'data_updated', 60) data_updated, ord
    from jsonb_array_elements(p_programs) with ordinality as t(p, ord)
    join public.campus_universities cu on cu.country_code = upper(p->>'country_code') and cu.name_key = lower(btrim(p->>'university'))
    where char_length(btrim(coalesce(p->>'name', ''))) between 1 and 200
    order by cu.id, lower(btrim(p->>'name')), lower(coalesce(btrim(p->>'program_type'), '')), lower(coalesce(btrim(p->>'modality'), '')), ord desc
  ), up as (
    insert into public.campus_programs as cp (university_id, name, program_type, modality, name_en, knowledge_area,
      professional_family, riasec_primary, riasec_secondary, duration_years, language, annual_cost, scholarships,
      admission, cutoff_type, cutoff_source, employment_rate, avg_salary, url, description, curriculum, source, data_updated)
    select university_id, name, program_type, modality, name_en, knowledge_area, professional_family,
      case when riasec_primary in ('R','I','A','S','E','C') then riasec_primary end,
      case when riasec_secondary in ('R','I','A','S','E','C') then riasec_secondary end,
      duration_years, language, annual_cost, scholarships, admission, cutoff_type, cutoff_source, employment_rate,
      avg_salary, url, description, curriculum, source, data_updated
    from src
    on conflict (university_id, prog_key) do update set
      name = excluded.name, program_type = excluded.program_type, modality = excluded.modality, name_en = excluded.name_en,
      knowledge_area = excluded.knowledge_area, professional_family = excluded.professional_family,
      riasec_primary = excluded.riasec_primary, riasec_secondary = excluded.riasec_secondary,
      duration_years = excluded.duration_years, language = excluded.language, annual_cost = excluded.annual_cost,
      scholarships = excluded.scholarships, admission = excluded.admission, cutoff_type = excluded.cutoff_type,
      cutoff_source = excluded.cutoff_source, employment_rate = excluded.employment_rate, avg_salary = excluded.avg_salary,
      url = excluded.url, description = excluded.description, curriculum = excluded.curriculum, source = excluded.source,
      data_updated = excluded.data_updated, updated_at = now()
    where (cp.name, cp.program_type, cp.modality, cp.name_en, cp.knowledge_area, cp.professional_family, cp.riasec_primary,
           cp.riasec_secondary, cp.duration_years, cp.language, cp.annual_cost, cp.scholarships, cp.admission, cp.cutoff_type,
           cp.cutoff_source, cp.employment_rate, cp.avg_salary, cp.url, cp.description, cp.curriculum, cp.source, cp.data_updated)
      is distinct from
          (excluded.name, excluded.program_type, excluded.modality, excluded.name_en, excluded.knowledge_area,
           excluded.professional_family, excluded.riasec_primary, excluded.riasec_secondary, excluded.duration_years,
           excluded.language, excluded.annual_cost, excluded.scholarships, excluded.admission, excluded.cutoff_type,
           excluded.cutoff_source, excluded.employment_rate, excluded.avg_salary, excluded.url, excluded.description,
           excluded.curriculum, excluded.source, excluded.data_updated)
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into v_pn, v_pu from up;

  perform private.audit('import_campus', 'campus', null,
    jsonb_build_object('universities_new', v_un, 'universities_updated', v_uu, 'programs_new', v_pn, 'programs_updated', v_pu));
  return query select v_un, v_uu, v_pn, v_pu;
end;
$$;
revoke execute on function public.admin_import_campus(jsonb, jsonb) from public, anon;
grant execute on function public.admin_import_campus(jsonb, jsonb) to authenticated;

-- Resumen por país (para el admin y para el buscador)
create or replace function public.campus_country_stats()
returns table (country_code char(2), universities int, programs int, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.country_code, count(distinct u.id)::int, count(p.id)::int, max(greatest(u.updated_at, p.updated_at))
  from public.campus_universities u left join public.campus_programs p on p.university_id = u.id
  group by u.country_code order by u.country_code;
$$;
revoke execute on function public.campus_country_stats() from public, anon;
grant execute on function public.campus_country_stats() to authenticated;
