-- Videos de Mux por capítulo: si el Playback ID es "signed" el servidor firma un permiso temporal.
alter table public.chapters add column mux_signed boolean not null default false;

-- Asignar (o quitar) el video de un capítulo sin volver a cargar el Excel
create or replace function public.admin_set_chapter_video(p_chapter uuid, p_playback_id text, p_signed boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if p_playback_id is not null and p_playback_id !~ '^[A-Za-z0-9]{10,100}$' then raise exception 'datos inválidos'; end if;
  update public.chapters c set mux_playback_id = p_playback_id, mux_signed = coalesce(p_signed, false) where c.id = p_chapter;
  perform private.audit('set_chapter_video', 'chapter', p_chapter::text);
end;
$$;
revoke execute on function public.admin_set_chapter_video(uuid, text, boolean) from public, anon;
grant execute on function public.admin_set_chapter_video(uuid, text, boolean) to authenticated;
