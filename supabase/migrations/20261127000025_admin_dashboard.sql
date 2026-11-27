-- Tablero del admin: números globales, actividad de los últimos 14 días y resumen por organización
-- (alumnos, accesos, actividad, avance y reportes). Solo conteos: ningún dato personal.
create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  perform private.assert_admin();
  with st as (
    select m.organization_id org, m.person_id pid, m.class_id
    from public.memberships m join public.people p on p.id = m.person_id
    where m.role = 'alumno' and m.active and p.deleted_at is null
  ),
  progs as (
    select st.org, st.pid, cp.program_id from st join public.class_programs cp on cp.class_id = st.class_id
    union
    select pp.organization_id, pp.person_id, pp.program_id from public.person_programs pp join st on st.pid = pp.person_id and st.org = pp.organization_id
  ),
  per_student as (
    select st.org, st.pid,
      (select count(*) from public.chapters ch where ch.program_id in (select x.program_id from progs x where x.pid = st.pid and x.org = st.org)) as total,
      (select count(*) from public.chapter_progress chp join public.chapters ch on ch.id = chp.chapter_id
        where chp.person_id = st.pid and chp.status = 'completed'
          and ch.program_id in (select x.program_id from progs x where x.pid = st.pid and x.org = st.org)) as done,
      exists (select 1 from public.chapter_progress chp where chp.person_id = st.pid) as started,
      exists (select 1 from public.program_reports r where r.person_id = st.pid and r.status = 'listo') as report,
      exists (select 1 from public.daily_activity a where a.person_id = st.pid and a.day > current_date - 7) as active7,
      (select p.auth_user_id is not null from public.people p where p.id = st.pid) as has_account
    from st
  ),
  per_org as (
    select o.id, o.name, o.kind, o.country, o.active, r.name reseller,
      (select count(*) from public.memberships m where m.organization_id = o.id and m.active and m.role <> 'alumno') staff,
      count(s.pid) students,
      count(*) filter (where s.has_account) with_account,
      count(*) filter (where s.active7) active7,
      count(*) filter (where s.report) reports,
      count(*) filter (where s.started and not s.report) in_progress,
      count(*) filter (where s.pid is not null and not s.started) not_started,
      coalesce(round(avg(case when s.total > 0 then 100.0 * s.done / s.total end)), 0)::int avg_pct
    from public.organizations o
    left join public.resellers r on r.id = o.reseller_id
    left join per_student s on s.org = o.id
    group by o.id, r.name
  )
  select jsonb_build_object(
    'orgs', (select coalesce(jsonb_agg(to_jsonb(po) order by po.active desc, po.students desc, po.name), '[]') from per_org po),
    'totals', (select jsonb_build_object(
        'orgs', count(*) filter (where active), 'students', coalesce(sum(students), 0), 'staff', coalesce(sum(staff), 0),
        'reports', coalesce(sum(reports), 0), 'active7', coalesce(sum(active7), 0),
        'avg_pct', coalesce(round(avg(avg_pct) filter (where students > 0)), 0)) from per_org),
    'today', (select count(distinct a.person_id) from public.daily_activity a where a.day = current_date),
    'activity', (select coalesce(jsonb_agg(jsonb_build_object('day', g.d, 'users', g.n) order by g.d), '[]') from (
        select d::date d, (select count(distinct a.person_id) from public.daily_activity a where a.day = d::date) n
        from generate_series(current_date - 13, current_date, interval '1 day') d) g),
    'alerts_1h', (select count(*) from public.health_alerts where created_at > now() - interval '1 hour'),
    'critical_1h', (select count(*) from public.health_alerts where created_at > now() - interval '1 hour' and level = 'critico')
  ) into v;
  return v;
end;
$$;

revoke execute on function public.admin_dashboard() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
