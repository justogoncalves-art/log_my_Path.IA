-- SOLO DEV. Un alumno ficticio (Bruno, datos de prueba) completa "Tu Manifiesto" con respuestas inventadas,
-- para probar de punta a punta el reporte con IA. Se puede volver a correr.
do $$
declare
  v_person uuid := '109c9e64-d08f-475d-b0de-0c30900e3bfb';
  v_program uuid := 'bca6c68d-fb80-4014-8d57-422a0cb3576f';
  v_org uuid;
  v_texts text[] := array[
    'Me gusta mucho entender cómo funcionan las cosas, sobre todo la biología y el cuerpo humano.',
    'Disfruto ayudar a mis compañeros cuando no entienden un tema; me hace sentir útil.',
    'Me imagino trabajando en un laboratorio o en un hospital, investigando algo que sirva a la gente.',
    'Mis padres quieren que estudie algo con salida laboral, pero yo quiero algo que me apasione.',
    'Lo que más valoro es aprender siempre cosas nuevas y no aburrirme en un trabajo.',
    'Me cuesta decidir porque me gustan muchas cosas distintas: ciencia, deporte y música.',
    'Quiero un trabajo que me deje tiempo para mi familia y para viajar.',
    'Me motiva resolver problemas difíciles aunque me lleve tiempo.',
    'Hice un voluntariado en un comedor y me di cuenta de que me gusta trabajar con personas.',
    'Me veo en diez años con un trabajo estable, pero haciendo algo que tenga sentido.',
    'No me gusta trabajar solo todo el día; prefiero equipos.',
    'Me interesa la medicina o la biotecnología, pero todavía no estoy seguro.',
    'Elijo mi carrera por mí, aunque escucho los consejos de mi familia.'];
  i int := 0;
  q record;
begin
  select organization_id into v_org from public.memberships where person_id = v_person limit 1;
  insert into public.person_programs (person_id, organization_id, program_id) values (v_person, v_org, v_program) on conflict do nothing;
  for q in
    select qq.id, qq.kind, qq.position, c.position cpos,
           (select array_agg(o.id order by o.position) from public.question_options o where o.question_id = qq.id) opts
    from public.questions qq join public.chapters c on c.id = qq.chapter_id
    where c.program_id = v_program order by c.position, qq.position
  loop
    i := i + 1;
    if q.kind = 'abierta' then
      insert into public.responses (person_id, question_id, option_id, text_answer) values (v_person, q.id, null, v_texts[1 + (i % array_length(v_texts, 1))])
      on conflict (person_id, question_id) do update set text_answer = excluded.text_answer, option_id = null;
    else
      insert into public.responses (person_id, question_id, option_id, text_answer)
      values (v_person, q.id, q.opts[1 + ((i * 7 + q.cpos) % array_length(q.opts, 1))], null)
      on conflict (person_id, question_id) do update set option_id = excluded.option_id, text_answer = null;
    end if;
  end loop;
  insert into public.chapter_progress (person_id, chapter_id, status, seconds_spent, started_at, completed_at)
  select v_person, c.id, 'completed', 540 + c.position * 30, now() - interval '3 days', now() - interval '2 days' + c.position * interval '1 hour'
  from public.chapters c where c.program_id = v_program
  on conflict (person_id, chapter_id) do update set status = 'completed', completed_at = excluded.completed_at, seconds_spent = excluded.seconds_spent;
  insert into public.program_completions (person_id, program_id, completed_at) values (v_person, v_program, now()) on conflict do nothing;
end $$;
