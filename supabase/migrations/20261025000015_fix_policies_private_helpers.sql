-- Las políticas nuevas usaban public.is_platform_admin()/public.my_person_id(), que el rol authenticated no puede
-- ejecutar (se revocaron en 20261018000002). Pasan a las versiones de private, como el resto de las tablas.
alter policy program_reports_select on public.program_reports using (private.is_platform_admin() or person_id = private.my_person_id());
alter policy ai_settings_select on public.ai_settings using (private.is_platform_admin());
alter policy ai_usage_select on public.ai_usage using (private.is_platform_admin());
alter policy campus_notes_select on public.campus_university_notes using (private.is_platform_admin());
