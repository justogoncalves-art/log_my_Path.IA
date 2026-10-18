-- Idiomas, encuesta de satisfacción (mitad y final), programas completados
-- y alta de personas desde el admin con el documento cifrado.

-- ─────────────────────────────────────────────────────────────
-- Idiomas: tabla para poder sumar idiomas sin cambiar el esquema
-- ─────────────────────────────────────────────────────────────
create table public.languages (
  code text primary key,
  name_es text not null,
  name_en text not null,
  active boolean not null default true,
  sort int not null default 0
);
alter table public.languages enable row level security;
create policy languages_select on public.languages for select to authenticated using (true);

insert into public.languages (code, name_es, name_en, sort) values
  ('es-ES', 'Español (España)', 'Spanish (Spain)', 1),
  ('es-419', 'Español latino', 'Spanish (Latin America)', 2),
  ('es-AR', 'Español rioplatense (voseo)', 'Spanish (Argentina)', 3),
  ('en', 'Inglés', 'English', 4),
  ('pt', 'Portugués', 'Portuguese', 5)
on conflict (code) do nothing;

alter table public.programs
  add constraint programs_language_fkey foreign key (language) references public.languages (code);

-- Campus y EdFin: 5º y 6º año de secundaria
update public.modules set min_level = 'secundaria', min_grade = 5 where id in ('campus', 'edfin');

-- ─────────────────────────────────────────────────────────────
-- Encuesta: "¿Te ha gustado My Path?" a mitad y al final del programa.
-- Con 3 estrellas o menos se pide "¿Qué mejorarías?".
-- rating/comment = final; mid_* = mitad del programa.
-- ─────────────────────────────────────────────────────────────
alter table public.program_feedback alter column rating drop not null;
alter table public.program_feedback
  add column mid_rating smallint check (mid_rating between 1 and 5),
  add column mid_comment text check (char_length(mid_comment) <= 2000),
  add column mid_at timestamptz,
  add constraint program_feedback_some_rating check (rating is not null or mid_rating is not null);

create or replace function public.rate_program(p_program uuid, p_moment text, p_rating int, p_comment text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := private.my_person_id();
  v_comment text := case when p_rating <= 3 then nullif(left(trim(coalesce(p_comment, '')), 2000), '') end;
begin
  if v_person is null then raise exception 'sin perfil'; end if;
  if p_program not in (select private.my_program_ids()) then raise exception 'programa no asignado'; end if;
  if p_rating not between 1 and 5 then raise exception 'puntaje inválido'; end if;
  if p_moment = 'mitad' then
    insert into public.program_feedback (person_id, program_id, mid_rating, mid_comment, mid_at)
    values (v_person, p_program, p_rating, v_comment, now())
    on conflict (person_id, program_id) do update set
      mid_rating = excluded.mid_rating, mid_comment = excluded.mid_comment, mid_at = now();
  elsif p_moment = 'final' then
    insert into public.program_feedback (person_id, program_id, rating, comment, created_at)
    values (v_person, p_program, p_rating, v_comment, now())
    on conflict (person_id, program_id) do update set
      rating = excluded.rating, comment = excluded.comment, created_at = now();
  else
    raise exception 'momento inválido';
  end if;
end;
$$;
revoke execute on function public.rate_program(uuid, text, int, text) from public, anon;
grant execute on function public.rate_program(uuid, text, int, text) to authenticated;
revoke execute on function public.submit_program_feedback(uuid, int, text) from authenticated;

-- ─────────────────────────────────────────────────────────────
-- Programa completado al 100%: dispara el formulario extenso por mail
-- y alimenta el aviso "el colegio terminó el programa".
-- ─────────────────────────────────────────────────────────────
create table public.program_completions (
  person_id uuid not null references public.people (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  completed_at timestamptz not null default now(),
  survey_sent_at timestamptz,
  primary key (person_id, program_id)
);
create index program_completions_pending_idx on public.program_completions (completed_at) where survey_sent_at is null;
alter table public.program_completions enable row level security;
create policy program_completions_select on public.program_completions for select to authenticated using (
  private.is_platform_admin()
  or person_id = private.my_person_id()
  or exists (
    select 1 from public.memberships m
    where m.person_id = program_completions.person_id
      and m.organization_id in (select private.my_managed_orgs())
  )
);

create or replace function public.record_chapter_progress(p_chapter uuid, p_completed boolean, p_seconds int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := private.my_person_id();
  v_program uuid;
begin
  if v_person is null then raise exception 'sin perfil'; end if;
  select c.program_id into v_program from public.chapters c
  where c.id = p_chapter and c.program_id in (select private.my_program_ids());
  if v_program is null then
    raise exception 'capítulo no asignado';
  end if;
  insert into public.chapter_progress (person_id, chapter_id, status, seconds_spent, completed_at)
  values (v_person, p_chapter, case when p_completed then 'completed' else 'started' end,
          greatest(0, least(p_seconds, 3600)), case when p_completed then now() end)
  on conflict (person_id, chapter_id) do update set
    status = case when public.chapter_progress.status = 'completed' or p_completed then 'completed' else 'started' end,
    seconds_spent = public.chapter_progress.seconds_spent + greatest(0, least(p_seconds, 3600)),
    completed_at = coalesce(public.chapter_progress.completed_at, case when p_completed then now() end);

  if p_completed and not exists (
    select 1 from public.chapters c
    left join public.chapter_progress pr on pr.chapter_id = c.id and pr.person_id = v_person and pr.status = 'completed'
    where c.program_id = v_program and pr.chapter_id is null
  ) then
    insert into public.program_completions (person_id, program_id) values (v_person, v_program)
    on conflict do nothing;
  end if;
end;
$$;

-- Satisfacción: cuenta la final y, si no hay, la de mitad de programa
create or replace function public.org_stats(p_org uuid)
returns table (
  organization_id uuid, organization_name text, students int, students_active_ever int,
  students_active_7d int, avg_minutes_per_student numeric, chapters_assigned int,
  chapters_completed int, students_completed_all int, satisfaction_avg numeric, satisfaction_count int
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (
    private.is_platform_admin()
    or p_org in (select private.my_managed_orgs())
    or exists (select 1 from public.organizations o where o.id = p_org and o.reseller_id in (select private.my_resellers()))
  ) then
    raise exception 'sin acceso';
  end if;

  return query
  with st as (
    select m.person_id, m.class_id from public.memberships m
    where m.organization_id = p_org and m.role = 'alumno' and m.active
  ),
  assigned as (
    select st.person_id, c.id as chapter_id
    from st
    join public.class_programs cp on cp.class_id = st.class_id
    join public.chapters c on c.program_id = cp.program_id
    union
    select pp.person_id, c.id
    from public.person_programs pp
    join public.chapters c on c.program_id = pp.program_id
    where pp.organization_id = p_org and pp.person_id in (select person_id from st)
  ),
  done as (
    select a.person_id, a.chapter_id from assigned a
    join public.chapter_progress pr on pr.person_id = a.person_id and pr.chapter_id = a.chapter_id and pr.status = 'completed'
  ),
  act as (
    select da.person_id, sum(da.seconds) as secs, max(da.day) as last_day
    from public.daily_activity da where da.organization_id = p_org group by da.person_id
  ),
  fb as (
    select coalesce(f.rating, f.mid_rating) as rating from public.program_feedback f
    where f.person_id in (select person_id from st) and coalesce(f.rating, f.mid_rating) is not null
  ),
  per_student as (
    select a.person_id, count(*) as total, count(d.chapter_id) as completed
    from assigned a left join done d on d.person_id = a.person_id and d.chapter_id = a.chapter_id
    group by a.person_id
  )
  select
    p_org,
    (select o.name from public.organizations o where o.id = p_org),
    (select count(*)::int from st),
    (select count(*)::int from act),
    (select count(*)::int from act where last_day >= current_date - 6),
    round(coalesce((select sum(secs) from act), 0) / 60.0 / nullif((select count(*) from st), 0), 1),
    (select count(*)::int from assigned),
    (select count(*)::int from done),
    (select count(*)::int from per_student where total > 0 and completed = total),
    round((select avg(rating) from fb), 2),
    (select count(*)::int from fb);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Documento cifrado. Las claves se generan dentro de Supabase Vault
-- (cifrado con una clave que Supabase guarda fuera de la base) y nunca
-- pasan por el código ni por el chat.
-- doc_hash: HMAC-SHA256 para buscar · doc_cipher: AES-256 para mostrar al admin.
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'doc_hmac_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'doc_hmac_key', 'HMAC del documento');
  end if;
  if not exists (select 1 from vault.secrets where name = 'doc_enc_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'doc_enc_key', 'Cifrado del documento');
  end if;
end;
$$;

create or replace function private.doc_hash(p_country text, p_type text, p_number text)
returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.hmac(
    upper(p_country) || ':' || lower(p_type) || ':' || upper(regexp_replace(p_number, '[^0-9A-Za-z]', '', 'g')),
    (select decrypted_secret from vault.decrypted_secrets where name = 'doc_hmac_key'),
    'sha256'), 'hex');
$$;

create or replace function private.doc_encrypt(p_number text)
returns text language sql volatile security definer set search_path = '' as $$
  select encode(extensions.pgp_sym_encrypt(
    upper(regexp_replace(p_number, '[^0-9A-Za-z]', '', 'g')),
    (select decrypted_secret from vault.decrypted_secrets where name = 'doc_enc_key'),
    'cipher-algo=aes256'), 'base64');
$$;

create or replace function private.doc_decrypt(p_cipher text)
returns text language sql stable security definer set search_path = '' as $$
  select extensions.pgp_sym_decrypt(decode(p_cipher, 'base64'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'doc_enc_key'));
$$;

-- Solo las usan funciones del servidor: nadie las puede llamar desde la API
revoke execute on function private.doc_hash(text, text, text) from public, anon, authenticated;
revoke execute on function private.doc_encrypt(text) from public, anon, authenticated;
revoke execute on function private.doc_decrypt(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Alta de personas (individual o desde el Excel). Solo el admin.
-- p_commit = false: valida y devuelve el resultado por fila sin guardar.
-- p_commit = true: guarda todo o nada (si alguna fila tiene error, no guarda).
-- La cuenta de acceso se crea al enviar el mail de bienvenida.
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_import_people(p_org uuid, p_rows jsonb, p_commit boolean default false)
returns table (row_no int, status text, detail text)
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organizations;
  r jsonb;
  i int := 0;
  v_errors int := 0;
  v_created int := 0;
  v_updated int := 0;
  v_seen_docs text[] := '{}';
  v_seen_mails text[] := '{}';
  v_year int := extract(year from now())::int;
  v_country text; v_type text; v_num text; v_hash text; v_email text; v_role text;
  v_first text; v_last text; v_sex text; v_birth date; v_classes text[]; v_cname text;
  v_class uuid; v_class_ids uuid[]; v_person uuid; v_existing public.people;
  v_status text; v_notes text[];
begin
  if not private.is_platform_admin() then raise exception 'sin acceso'; end if;
  select * into v_org from public.organizations o where o.id = p_org;
  if not found then raise exception 'organización inexistente'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 2000 then
    raise exception 'se esperan hasta 2000 filas';
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_status := null; v_notes := '{}'; v_person := null; v_class_ids := '{}'; v_birth := null;
    v_country := upper(coalesce(nullif(trim(r->>'doc_country'), ''), v_org.country));
    v_type := lower(coalesce(nullif(trim(r->>'doc_type'), ''), 'dni'));
    v_num := upper(regexp_replace(coalesce(r->>'doc_number', ''), '[^0-9A-Za-z]', '', 'g'));
    v_email := lower(trim(coalesce(r->>'email', '')));
    v_role := lower(trim(coalesce(r->>'role', '')));
    v_first := left(trim(coalesce(r->>'first_name', '')), 100);
    v_last := left(trim(coalesce(r->>'last_name', '')), 100);
    v_sex := nullif(lower(trim(coalesce(r->>'sex', ''))), '');
    v_classes := array(
      select trim(x) from unnest(string_to_array(coalesce(r->>'class', ''), ',')) x where trim(x) <> ''
    );

    if length(v_num) not between 5 and 20 then v_status := 'error'; v_notes := v_notes || 'Documento inválido'::text;
    elsif v_country !~ '^[A-Z]{2}$' then v_status := 'error'; v_notes := v_notes || 'País inválido'::text;
    elsif v_type !~ '^[a-z_]{2,20}$' then v_status := 'error'; v_notes := v_notes || 'Tipo de documento inválido'::text;
    elsif v_first = '' or v_last = '' then v_status := 'error'; v_notes := v_notes || 'Falta nombre o apellido'::text;
    elsif length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      v_status := 'error'; v_notes := v_notes || 'Mail inválido'::text;
    elsif v_role not in ('alumno', 'docente', 'coordinador') then
      v_status := 'error'; v_notes := v_notes || 'Tipo inválido (Alumno, Docente o Coordinador)'::text;
    elsif v_role = 'alumno' and cardinality(v_classes) <> 1 then
      v_status := 'error'; v_notes := v_notes || 'El alumno tiene que tener una sola clase'::text;
    elsif v_sex is not null and v_sex not in ('hombre', 'mujer', 'otro', 'no_informa') then
      v_status := 'error'; v_notes := v_notes || 'Sexo inválido'::text;
    elsif coalesce(r->>'birth_date', '') <> '' then
      begin
        v_birth := (r->>'birth_date')::date;
        if v_birth < date '1900-01-01' or v_birth > current_date then
          v_status := 'error'; v_notes := v_notes || 'Fecha de nacimiento inválida'::text;
        end if;
      exception when others then
        v_status := 'error'; v_notes := v_notes || 'Fecha de nacimiento inválida'::text;
      end;
    end if;

    if v_status is null then
      v_hash := private.doc_hash(v_country, v_type, v_num);
      if v_hash = any (v_seen_docs) then
        v_status := 'error'; v_notes := v_notes || 'Documento repetido en el archivo'::text;
      elsif v_email = any (v_seen_mails) then
        v_status := 'error'; v_notes := v_notes || 'Mail repetido en el archivo'::text;
      end if;
      v_seen_docs := v_seen_docs || v_hash;
      v_seen_mails := v_seen_mails || v_email;
    end if;

    if v_status is null then
      select * into v_existing from public.people p
      where p.doc_country = v_country and p.doc_type = v_type and p.doc_hash = v_hash;
      if found then
        v_person := v_existing.id;
        if v_existing.deleted_at is not null then
          v_status := 'error'; v_notes := v_notes || 'La persona está dada de baja: reactivarla desde su ficha'::text;
        elsif lower(v_existing.email) <> v_email then
          v_status := 'aviso'; v_notes := v_notes || 'Ya existe con otro mail: se mantiene el registrado'::text;
        else
          v_status := 'existe'; v_notes := v_notes || 'Ya existe: se actualizan rol y clase'::text;
        end if;
      elsif exists (select 1 from public.people p where lower(p.email) = v_email and p.deleted_at is null) then
        v_status := 'error'; v_notes := v_notes || 'El mail ya es de otra persona'::text;
      else
        v_status := 'nuevo';
      end if;
    end if;

    if v_status <> 'error' then
      foreach v_cname in array v_classes loop
        select c.id into v_class from public.classes c
        where c.organization_id = p_org and lower(c.name) = lower(v_cname) and c.school_year = v_year;
        if v_class is null then
          v_notes := v_notes || ('Clase nueva: ' || left(v_cname, 40));
          if p_commit then
            insert into public.classes (organization_id, name, school_year, grade)
            values (p_org, left(v_cname, 40), v_year,
                    case when substring(v_cname from '^[1-7]') is not null then substring(v_cname from '^[1-7]')::smallint end)
            on conflict (organization_id, name, school_year) do nothing;
            select c.id into v_class from public.classes c
            where c.organization_id = p_org and c.name = left(v_cname, 40) and c.school_year = v_year;
          end if;
        end if;
        if v_class is not null then v_class_ids := v_class_ids || v_class; end if;
        v_class := null;
      end loop;
    end if;

    if v_status = 'error' then
      v_errors := v_errors + 1;
    elsif p_commit then
      if v_person is null then
        insert into public.people (doc_country, doc_type, doc_hash, doc_cipher, first_name, last_name, email,
                                   sex, birth_date, province, city, guardian_consent)
        values (v_country, v_type, v_hash, private.doc_encrypt(v_num), v_first, v_last, v_email,
                v_sex, v_birth, nullif(left(trim(coalesce(r->>'province', '')), 100), ''),
                nullif(left(trim(coalesce(r->>'city', '')), 100), ''),
                coalesce(r->>'guardian_consent', '') = 'true')
        returning id into v_person;
        v_created := v_created + 1;
      else
        v_updated := v_updated + 1;
      end if;
      insert into public.memberships (person_id, organization_id, role, class_id)
      values (v_person, p_org, v_role::public.member_role, case when v_role = 'alumno' then v_class_ids[1] end)
      on conflict (person_id, organization_id) do update set
        role = excluded.role, class_id = excluded.class_id, active = true;
      if v_role = 'docente' then
        insert into public.class_teachers (class_id, person_id)
        select unnest(v_class_ids), v_person
        on conflict do nothing;
      end if;
    end if;

    row_no := i; status := v_status; detail := array_to_string(v_notes, ' · ');
    return next;
  end loop;

  if p_commit then
    if v_errors > 0 then raise exception 'hay % filas con errores: no se guardó nada', v_errors; end if;
    insert into public.audit_log (actor, action, entity, entity_id, meta)
    values ((select auth.uid()), 'import_people', 'organization', p_org::text,
            jsonb_build_object('created', v_created, 'updated', v_updated));
  end if;
end;
$$;
revoke execute on function public.admin_import_people(uuid, jsonb, boolean) from public, anon;
grant execute on function public.admin_import_people(uuid, jsonb, boolean) to authenticated;
