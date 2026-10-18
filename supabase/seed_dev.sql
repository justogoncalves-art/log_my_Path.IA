-- Datos ficticios SOLO para desarrollo (mypath-dev). Nunca correr en producción.
-- Dos colegios para verificar que nadie ve datos de otro colegio.
do $$
declare
  u_coord uuid := '00000000-0000-4000-a000-000000000001';
  u_doc   uuid := '00000000-0000-4000-a000-000000000002';
  u_alu   uuid := '00000000-0000-4000-a000-000000000003';
  u_alu2  uuid := '00000000-0000-4000-a000-000000000004';
  u_otro  uuid := '00000000-0000-4000-a000-000000000005';
  org1 uuid; org2 uuid; c4a uuid; c4b uuid; c_otro uuid;
  p_coord uuid; p_doc uuid; p_alu uuid; p_alu2 uuid; p_otro uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', x.email, now(),
         '{"provider":"email","providers":["email"]}', '{}', now(), now()
  from (values (u_coord, 'demo.coordinador@mypathia.app'), (u_doc, 'demo.docente@mypathia.app'),
               (u_alu, 'demo.alumno@mypathia.app'), (u_alu2, 'demo.alumno2@mypathia.app'),
               (u_otro, 'demo.otrocolegio@mypathia.app')) as x(id, email)
  on conflict (id) do nothing;

  insert into public.organizations (name, kind, country) values ('Colegio Demo San Martín', 'colegio', 'AR') returning id into org1;
  insert into public.organizations (name, kind, country) values ('Colegio Demo Belgrano', 'colegio', 'AR') returning id into org2;

  insert into public.classes (organization_id, name) values (org1, '4ºA') returning id into c4a;
  insert into public.classes (organization_id, name) values (org1, '4ºB') returning id into c4b;
  insert into public.classes (organization_id, name) values (org2, '5ºA') returning id into c_otro;

  insert into public.people (auth_user_id, doc_country, doc_type, doc_hash, doc_cipher, first_name, last_name, email, must_change_password)
  values (u_coord, 'AR', 'DNI', 'demo-hash-1', 'demo', 'Carla', 'Coordinadora', 'demo.coordinador@mypathia.app', false) returning id into p_coord;
  insert into public.people (auth_user_id, doc_country, doc_type, doc_hash, doc_cipher, first_name, last_name, email, must_change_password)
  values (u_doc, 'AR', 'DNI', 'demo-hash-2', 'demo', 'Diego', 'Docente', 'demo.docente@mypathia.app', false) returning id into p_doc;
  insert into public.people (auth_user_id, doc_country, doc_type, doc_hash, doc_cipher, first_name, last_name, email)
  values (u_alu, 'AR', 'DNI', 'demo-hash-3', 'demo', 'Ana', 'Alumna', 'demo.alumno@mypathia.app') returning id into p_alu;
  insert into public.people (auth_user_id, doc_country, doc_type, doc_hash, doc_cipher, first_name, last_name, email)
  values (u_alu2, 'AR', 'DNI', 'demo-hash-4', 'demo', 'Bruno', 'Alumno', 'demo.alumno2@mypathia.app') returning id into p_alu2;
  insert into public.people (auth_user_id, doc_country, doc_type, doc_hash, doc_cipher, first_name, last_name, email)
  values (u_otro, 'AR', 'DNI', 'demo-hash-5', 'demo', 'Olga', 'OtroColegio', 'demo.otrocolegio@mypathia.app') returning id into p_otro;

  insert into public.memberships (person_id, organization_id, role) values (p_coord, org1, 'coordinador'), (p_doc, org1, 'docente');
  insert into public.memberships (person_id, organization_id, role, class_id) values
    (p_alu, org1, 'alumno', c4a), (p_alu2, org1, 'alumno', c4b), (p_otro, org2, 'alumno', c_otro);
  insert into public.class_teachers (class_id, person_id) values (c4a, p_doc);

  -- El colegio 1 contrató Mento y Campus; Campus asignado solo a 4ºA
  insert into public.organization_modules (organization_id, module_id) values (org1, 'mento'), (org1, 'campus'), (org2, 'mento');
  insert into public.class_modules (class_id, module_id) values (c4a, 'mento'), (c4a, 'campus'), (c4b, 'mento'), (c_otro, 'mento');
end $$;
