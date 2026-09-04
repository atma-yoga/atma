-- =============================================================================
-- 0018 — A aula herda o professor da turma
--
-- `class_sessions.teacher_id` guardava quem daria aquela aula, para permitir
-- substituto. Mas uma aula criada quando a turma ainda não tinha professor
-- ficava com NULL para sempre, e a tela do professor — que filtra por esse
-- campo — não mostrava nada.
--
-- Agora o campo significa "substituto neste dia": quando vazio, vale o
-- professor da turma. As telas passam a ler o valor efetivo pela view.
-- =============================================================================

-- Aulas órfãs recebem o professor da própria turma.
update public.class_sessions s
set teacher_id = c.teacher_id
from public.classes c
where c.id = s.class_id
  and s.teacher_id is null
  and c.teacher_id is not null;

comment on column public.class_sessions.teacher_id is
  'Quem dá esta aula. NULL = o professor da turma (ver v_session_availability).';

-- A view devolve o professor efetivo, não o gravado na linha.
drop view if exists public.v_session_availability;

create view public.v_session_availability
with (security_invoker = true) as
select
  s.id                                   as session_id,
  s.title,
  s.starts_at,
  s.ends_at,
  s.status,
  s.level,
  s.class_id,
  c.name                                 as turma,
  r.name                                 as room,
  r.is_outdoor,
  r.color                                as cor,
  coalesce(s.teacher_id, c.teacher_id)   as teacher_id,
  p.full_name                            as teacher_name,
  coalesce(p.social_name, p.full_name)   as teacher_chamado,
  s.capacity,
  count(b.id) filter (where b.status in ('booked', 'attended')) as booked_count,
  s.capacity - count(b.id) filter (where b.status in ('booked', 'attended')) as spots_left,
  count(b.id) filter (where b.status = 'waitlisted') as waitlist_count
from public.class_sessions s
left join public.classes c on c.id = s.class_id
left join public.profiles p on p.id = coalesce(s.teacher_id, c.teacher_id)
left join public.rooms r on r.id = s.room_id
left join public.bookings b on b.session_id = s.id
group by s.id, c.name, c.teacher_id, r.name, r.is_outdoor, r.color,
         p.full_name, p.social_name;

-- generate_sessions deixa de gravar o professor: a turma manda.
create or replace function public.generate_sessions(range_start date, range_end date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  criadas integer := 0;
  m       record;
  d       date;
begin
  if not public.is_admin() then
    raise exception 'apenas admin pode gerar aulas';
  end if;

  for m in
    select cm.class_id, cm.weekday, cm.start_time, cm.duration_min,
           c.room_id, c.capacity, c.level, c.name, c.valid_from, c.valid_until
    from public.class_meetings cm
    join public.classes c on c.id = cm.class_id
    where c.is_active
      and c.valid_from <= range_end
      and (c.valid_until is null or c.valid_until >= range_start)
  loop
    for d in select generate_series(range_start, range_end, '1 day')::date loop
      continue when extract(dow from d)::smallint <> m.weekday;
      continue when d < m.valid_from;
      continue when m.valid_until is not null and d > m.valid_until;

      insert into public.class_sessions
        (class_id, room_id, title, starts_at, ends_at, capacity, level)
      values (
        m.class_id, m.room_id, m.name,
        (d + m.start_time) at time zone 'America/Sao_Paulo',
        (d + m.start_time) at time zone 'America/Sao_Paulo'
          + make_interval(mins => m.duration_min),
        m.capacity, m.level
      )
      on conflict do nothing;

      criadas := criadas + 1;
    end loop;
  end loop;

  return criadas;
end;
$$;
