-- Campus: favoritos del alumno (carreras y universidades) y vista del docente
-- (afinidad RIASEC de cada alumno, sus favoritos y lo más guardado de la clase).
-- Más adelante los favoritos sirven para avisar novedades.

create table public.campus_favorites (
  person_id uuid not null references public.people (id) on delete cascade,
  kind text not null check (kind in ('carrera', 'universidad')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (person_id, kind, item_id)
);
create index campus_favorites_item_idx on public.campus_favorites (kind, item_id);
alter table public.campus_favorites enable row level security;
create policy campus_favorites_select on public.campus_favorites for select to authenticated
  using (person_id = private.my_person_id() or private.can_see_person(person_id));

-- Guarda o quita; devuelve si quedó guardado
create or replace function public.campus_toggle_favorite(p_kind text, p_item uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_person uuid := private.my_person_id();
begin
  if v_person is null then raise exception 'sin acceso'; end if;
  if p_kind = 'carrera' and not exists (select 1 from public.campus_programs where id = p_item) then raise exception 'datos inválidos'; end if;
  if p_kind = 'universidad' and not exists (select 1 from public.campus_universities where id = p_item) then raise exception 'datos inválidos'; end if;
  if p_kind not in ('carrera', 'universidad') then raise exception 'datos inválidos'; end if;
  -- Quitar un favorito lo deja inactivo (queda el historial para futuras novedades)
  if exists (select 1 from public.campus_favorites where person_id = v_person and kind = p_kind and item_id = p_item and active) then
    update public.campus_favorites set active = false where person_id = v_person and kind = p_kind and item_id = p_item;
    return false;
  end if;
  if (select count(*) from public.campus_favorites where person_id = v_person and active) >= 300 then raise exception 'demasiados favoritos'; end if;
  insert into public.campus_favorites (person_id, kind, item_id) values (v_person, p_kind, p_item)
  on conflict (person_id, kind, item_id) do update set active = true, created_at = now();
  return true;
end;
$$;

create or replace function public.my_campus_favorites()
returns table (kind text, item_id uuid)
language sql stable security definer set search_path = '' as $$
  select f.kind, f.item_id from public.campus_favorites f where f.person_id = private.my_person_id() and f.active;
$$;

-- Perfil RIASEC de cualquier persona (el del último programa de Mento completado con RIASEC)
create or replace function private.person_riasec(p_person uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_program uuid;
begin
  select pc.program_id into v_program
  from public.program_completions pc join public.programs p on p.id = pc.program_id and p.module_id = 'mento'
  where pc.person_id = p_person
    and exists (select 1 from public.chapters c where c.program_id = pc.program_id and c.assessment_label ilike '%riasec%')
  order by pc.completed_at desc limit 1;
  if v_program is null then return '{}'::jsonb; end if;
  return (select coalesce(jsonb_object_agg(case s.dimension_id
            when 'riasec.realista' then 'R' when 'riasec.investigativo' then 'I' when 'riasec.artistico' then 'A'
            when 'riasec.social' then 'S' when 'riasec.emprendedor' then 'E' when 'riasec.convencional' then 'C' end, s.t_score), '{}'::jsonb)
          from private.compute_scores(p_person, v_program) s where s.assessment_id = 'riasec' and s.answered > 0);
end;
$$;

-- Código Holland (3 letras) a partir del perfil
create or replace function private.holland(p_profile jsonb) returns text
language sql immutable set search_path = '' as $$
  select string_agg(k, '' order by v desc, k) from (
    select key k, value::numeric v from jsonb_each_text(coalesce(p_profile, '{}'::jsonb)) order by value::numeric desc, key limit 3) x;
$$;

-- Docente: alumnos de la clase con su código RIASEC y cuántos favoritos guardaron
create or replace function public.staff_campus_students(p_class uuid)
returns table (person_id uuid, first_name text, last_name text, holland text, favorite_programs int, favorite_universities int, last_favorite_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.first_name, p.last_name, nullif(private.holland(private.person_riasec(p.id)), ''),
    (select count(*)::int from public.campus_favorites f where f.person_id = p.id and f.kind = 'carrera' and f.active),
    (select count(*)::int from public.campus_favorites f where f.person_id = p.id and f.kind = 'universidad' and f.active),
    (select max(f.created_at) from public.campus_favorites f where f.person_id = p.id and f.active)
  from public.memberships m join public.people p on p.id = m.person_id
  where m.class_id = p_class and m.role = 'alumno' and m.active and p.deleted_at is null and private.can_see_class(p_class)
  order by p.last_name, p.first_name;
$$;

-- Docente: ficha Campus de un alumno (perfil, carreras con más afinidad en su país y en el mundo, favoritos)
create or replace function public.staff_campus_student(p_person uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_profile jsonb; v_country text;
begin
  if not private.can_see_person(p_person) then return null; end if;
  v_profile := private.person_riasec(p_person);
  select o.country into v_country from public.memberships m join public.organizations o on o.id = m.organization_id
  where m.person_id = p_person and m.active order by m.created_at limit 1;
  return jsonb_build_object(
    'first_name', (select first_name from public.people where id = p_person),
    'last_name', (select last_name from public.people where id = p_person),
    'country', v_country,
    'profile', v_profile,
    'holland', nullif(private.holland(v_profile), ''),
    'top_programs', case when v_profile = '{}'::jsonb then '[]'::jsonb else (
      select coalesce(jsonb_agg(x order by x.affinity desc, x.universities desc), '[]') from (
        select min(p.name) as name, mode() within group (order by p.riasec_primary) as rp, mode() within group (order by p.riasec_secondary) as rs,
               mode() within group (order by p.knowledge_area) as area, count(distinct p.university_id)::int as universities,
               private.affinity(mode() within group (order by p.riasec_primary), mode() within group (order by p.riasec_secondary), v_profile) as affinity
        from public.campus_programs p join public.campus_universities u on u.id = p.university_id
        where p.riasec_primary is not null and (v_country is null or u.country_code = v_country)
        group by lower(p.name)
        order by 6 desc nulls last, 5 desc limit 10) x) end,
    'favorite_programs', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'program_type', p.program_type, 'university_id', u.id, 'university', u.official_name,
        'country_code', u.country_code, 'city', u.city, 'riasec', concat(p.riasec_primary, p.riasec_secondary),
        'affinity', private.affinity(p.riasec_primary, p.riasec_secondary, v_profile), 'saved_at', f.created_at) order by f.created_at desc), '[]')
      from public.campus_favorites f join public.campus_programs p on p.id = f.item_id join public.campus_universities u on u.id = p.university_id
      where f.person_id = p_person and f.kind = 'carrera' and f.active),
    'favorite_universities', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', u.id, 'name', u.official_name, 'country_code', u.country_code, 'city', u.city, 'rank_qs', u.rank_qs, 'saved_at', f.created_at)
        order by f.created_at desc), '[]')
      from public.campus_favorites f join public.campus_universities u on u.id = f.item_id
      where f.person_id = p_person and f.kind = 'universidad' and f.active)
  );
end;
$$;

-- Docente: resumen de la clase (tipos RIASEC y lo más guardado)
create or replace function public.staff_campus_class(p_class uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_students uuid[];
begin
  if not private.can_see_class(p_class) then return null; end if;
  select coalesce(array_agg(m.person_id), '{}') into v_students from public.memberships m join public.people p on p.id = m.person_id
  where m.class_id = p_class and m.role = 'alumno' and m.active and p.deleted_at is null;
  return jsonb_build_object(
    'students', cardinality(v_students),
    'with_profile', (select count(*) from unnest(v_students) s(id) where private.person_riasec(s.id) <> '{}'::jsonb),
    'with_favorites', (select count(distinct f.person_id) from public.campus_favorites f where f.person_id = any(v_students) and f.active),
    'holland', (select coalesce(jsonb_object_agg(l, n), '{}') from (
        select left(private.holland(private.person_riasec(s.id)), 1) l, count(*) n from unnest(v_students) s(id)
        group by 1 having left(private.holland(private.person_riasec(s.id)), 1) is not null) x),
    'top_programs', (select coalesce(jsonb_agg(x order by x.n desc, x.name), '[]') from (
        select min(p.name) name, count(distinct f.person_id)::int n, count(distinct p.university_id)::int universities
        from public.campus_favorites f join public.campus_programs p on p.id = f.item_id
        where f.kind = 'carrera' and f.active and f.person_id = any(v_students) group by lower(p.name) order by 2 desc limit 10) x),
    'top_universities', (select coalesce(jsonb_agg(x order by x.n desc, x.name), '[]') from (
        select u.id, u.official_name name, u.country_code, count(distinct f.person_id)::int n
        from public.campus_favorites f join public.campus_universities u on u.id = f.item_id
        where f.kind = 'universidad' and f.active and f.person_id = any(v_students) group by u.id order by 4 desc limit 10) x)
  );
end;
$$;

revoke all on public.campus_favorites from anon;
revoke insert, update, truncate on public.campus_favorites from authenticated;
revoke execute on function private.person_riasec(uuid) from public, anon, authenticated;
revoke execute on function private.holland(jsonb) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['public.campus_toggle_favorite(text, uuid)', 'public.my_campus_favorites()', 'public.staff_campus_students(uuid)',
    'public.staff_campus_student(uuid)', 'public.staff_campus_class(uuid)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
