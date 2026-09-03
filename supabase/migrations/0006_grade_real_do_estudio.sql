-- =============================================================================
-- 0006 — A grade real do estúdio
--
-- Três mudanças, todas vindas da grade que o estúdio pratica hoje:
--
-- 1. Aula tem LOCAL, e nem todo local é sala: metade das aulas de 08:30 às
--    quartas e sextas acontece ao ar livre, no Iate Clube da Praia dos Ossos.
--    `rooms` ganha `is_outdoor` e o seed inventado dá lugar aos dois lugares
--    de verdade.
--
-- 2. Horário pode existir sem professor designado. Antes `teacher_id` era
--    obrigatório, o que impedia montar a grade antes de cadastrar a equipe —
--    e a grade é justamente a primeira coisa que se monta.
--
-- 3. A grade real entra como dados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Locais
-- -----------------------------------------------------------------------------

alter table public.rooms add column if not exists is_outdoor boolean not null default false;

comment on column public.rooms.is_outdoor is
  'Aula ao ar livre. A agenda destaca em azul; sala fechada vai em verde.';

-- O seed inicial ("Sala Principal", "Sala Shanti") foi suposição minha e nunca
-- teve dados ligados. Sai.
delete from public.rooms
where name in ('Sala Principal', 'Sala Shanti')
  and not exists (select 1 from public.class_schedules cs where cs.room_id = rooms.id)
  and not exists (select 1 from public.class_sessions se where se.room_id = rooms.id);

insert into public.rooms (name, capacity, is_outdoor, notes) values
  ('Estúdio', 15, false, 'Sala do estúdio.'),
  ('Iate Clube', 25, true, 'Ao ar livre, Praia dos Ossos.')
on conflict (name) do update
  set capacity = excluded.capacity,
      is_outdoor = excluded.is_outdoor,
      notes = excluded.notes;

-- -----------------------------------------------------------------------------
-- 2. Horário sem professor
-- -----------------------------------------------------------------------------

alter table public.class_schedules alter column teacher_id drop not null;
alter table public.class_sessions  alter column teacher_id drop not null;

comment on column public.class_schedules.teacher_id is
  'Professor responsável. NULL = ainda a definir.';

-- A view juntava profiles pelo professor com INNER JOIN, o que sumiria com as
-- aulas sem professor. Vira LEFT JOIN.
drop view if exists public.v_session_availability;

create view public.v_session_availability
with (security_invoker = true) as
select
  s.id                as session_id,
  s.title,
  s.starts_at,
  s.ends_at,
  s.status,
  s.level,
  r.name              as room,
  r.is_outdoor,
  p.full_name         as teacher_name,
  s.teacher_id,
  s.capacity,
  count(b.id) filter (where b.status in ('booked', 'attended')) as booked_count,
  s.capacity - count(b.id) filter (where b.status in ('booked', 'attended')) as spots_left,
  count(b.id) filter (where b.status = 'waitlisted') as waitlist_count
from public.class_sessions s
left join public.profiles p on p.id = s.teacher_id
left join public.rooms    r on r.id = s.room_id
left join public.bookings b on b.session_id = s.id
group by s.id, r.name, r.is_outdoor, p.full_name;

-- -----------------------------------------------------------------------------
-- 3. A grade
--
-- Segunda  07:00 estúdio · 18:00 estúdio
-- Terça    08:30 estúdio · 19:00 estúdio
-- Quarta   07:00 estúdio · 08:30 ar livre · 18:00 estúdio
-- Quinta   08:30 estúdio · 19:00 estúdio
-- Sexta    07:00 estúdio · 08:30 ar livre
--
-- Todas de 1 hora. weekday segue extract(dow): 1 = segunda … 5 = sexta.
-- -----------------------------------------------------------------------------

insert into public.class_schedules (weekday, start_time, duration_min, capacity, room_id, level)
select g.weekday, g.hora, 60, r.capacity, r.id, 'todos'::public.class_level
from (values
  (1, time '07:00', 'Estúdio'),
  (1, time '18:00', 'Estúdio'),
  (2, time '08:30', 'Estúdio'),
  (2, time '19:00', 'Estúdio'),
  (3, time '07:00', 'Estúdio'),
  (3, time '08:30', 'Iate Clube'),
  (3, time '18:00', 'Estúdio'),
  (4, time '08:30', 'Estúdio'),
  (4, time '19:00', 'Estúdio'),
  (5, time '07:00', 'Estúdio'),
  (5, time '08:30', 'Iate Clube')
) as g(weekday, hora, local)
join public.rooms r on r.name = g.local
where not exists (
  select 1 from public.class_schedules cs
  where cs.weekday = g.weekday and cs.start_time = g.hora
);
