-- Un capítulo terminado queda cerrado: sus respuestas no se pueden cambiar ("lo que respondió es lo que es").
create or replace function public.submit_answer(p_question uuid, p_option uuid default null, p_text text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_person uuid := private.my_person_id();
  v_kind text;
  v_chapter uuid;
  v_text text := nullif(left(trim(coalesce(p_text, '')), 4000), '');
begin
  if v_person is null then raise exception 'sin perfil'; end if;
  select q.kind, q.chapter_id into v_kind, v_chapter from public.questions q
  join public.chapters c on c.id = q.chapter_id
  where q.id = p_question and c.program_id in (select private.my_program_ids());
  if v_kind is null then raise exception 'pregunta no asignada'; end if;

  if exists (select 1 from public.chapter_progress pr
             where pr.person_id = v_person and pr.chapter_id = v_chapter and pr.status = 'completed') then
    raise exception 'capítulo cerrado';
  end if;

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
