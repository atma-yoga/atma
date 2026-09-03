-- =============================================================================
-- 0008 — Turmas
--
-- Muda o modelo, não só o nome. Antes cada horário era solto e o aluno
-- escolhia aula a aula. Agora existe TURMA: um grupo fixo, com professor,
-- um conjunto de dias na semana, capacidade própria e alunos matriculados
-- pela administração. A grade semanal é o desenho das turmas.
--
--   classes           a turma
--   class_meetings    os dias e horários em que ela se encontra
--   class_enrollments quem está nela
--
-- `class_schedules` sai: virou `classes` + `class_meetings`.
--
-- A grade atual do estúdio agrupa naturalmente em turmas — 07:00 é
-- segunda/quarta/sexta, 08:30 do estúdio é terça/quinta — então ela é
-- convertida aqui em vez de descartada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Turma
-- -----------------------------------------------------------------------------

create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  teacher_id  uuid references public.teachers (profile_id) on delete set null,
  room_id     uuid references public.rooms (id) on delete set null,
  capacity    integer not null default 12 check (capacity between 1 and 99),
  level       public.class_level not null default 'todos',
  valid_from  date not null default current_date,
  valid_until date,
  is_active   boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);

comment on table public.classes is
  'Turma: grupo fixo de alunos com professor e dias próprios.';
comment on column public.classes.capacity is
  'Quantos alunos cabem. Padrão 12.';
comment on column public.classes.teacher_id is
  'Professor responsável. NULL = ainda a definir.';

-- -----------------------------------------------------------------------------
-- 2. Encontros — os dias da semana em que a turma acontece
-- -----------------------------------------------------------------------------

create table if not exists public.class_meetings (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes (id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time   time not null,
  duration_min integer not null default 60 check (duration_min between 15 and 240),
  created_at   timestamptz not null default now(),
  unique (class_id, weekday, start_time)
);

comment on table public.class_meetings is
  'Dias e horários de uma turma. Três linhas = segunda, quarta e sexta.';

create index if not exists class_meetings_class on public.class_meetings (class_id);

-- -----------------------------------------------------------------------------
-- 3. Matrícula na turma
-- -----------------------------------------------------------------------------

create table if not exists public.class_enrollments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  student_id  uuid not null references public.students (profile_id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  is_active   boolean not null default true,
  notes       text,
  unique (class_id, student_id)
);

comment on table public.class_enrollments is
  'Aluno dentro de uma turma. Quem coloca é a administração.';

create index if not exists class_enrollments_class on public.class_enrollments (class_id);
create index if not exists class_enrollments_student on public.class_enrollments (student_id);

-- A capacidade é regra do banco, não da tela: se ficasse só no formulário,
-- duas matrículas simultâneas passariam do limite sem ninguém perceber.
create or replace function public.enforce_class_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ocupadas integer;
  limite   integer;
  turma    text;
begin
  if not new.is_active then
    return new;
  end if;

  select capacity, name into limite, turma
  from public.classes where id = new.class_id
  for update;

  select count(*) into ocupadas
  from public.class_enrollments
  where class_id = new.class_id
    and is_active
    and (tg_op = 'INSERT' or id <> new.id);

  if ocupadas >= limite then
    raise exception 'A turma % já tem % alunos, que é o limite.', turma, limite
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists class_enrollments_capacity on public.class_enrollments;
create trigger class_enrollments_capacity
  before insert or update of is_active, class_id on public.class_enrollments
  for each row execute function public.enforce_class_capacity();

-- -----------------------------------------------------------------------------
-- 4. Sessões passam a nascer de turmas
-- -----------------------------------------------------------------------------

alter table public.class_sessions
  add column if not exists class_id uuid references public.classes (id) on delete set null;

create index if not exists class_sessions_class on public.class_sessions (class_id);

-- -----------------------------------------------------------------------------
-- 5. Converte a grade existente em turmas
--
-- Agrupa por horário + local: os horários de 07:00 no estúdio viram uma
-- turma de segunda, quarta e sexta; os de 08:30 no estúdio, uma de terça e
-- quinta; e assim por diante.
-- -----------------------------------------------------------------------------

do $$
declare
  g        record;
  nova     uuid;
  dias     text;
  periodo  text;
begin
  -- Só converte se ainda não houver turmas, para a migration poder repetir.
  if exists (select 1 from public.classes) then
    return;
  end if;

  for g in
    select
      cs.start_time,
      cs.room_id,
      r.name as sala,
      r.is_outdoor,
      min(cs.duration_min) as duracao,
      array_agg(cs.weekday order by cs.weekday) as dias
    from public.class_schedules cs
    left join public.rooms r on r.id = cs.room_id
    where cs.is_active
    group by cs.start_time, cs.room_id, r.name, r.is_outdoor
  loop
    periodo := case
      when g.start_time < time '12:00' then 'Manhã'
      when g.start_time < time '18:00' then 'Tarde'
      else 'Noite'
    end;

    dias := to_char(g.start_time, 'HH24:MI');

    insert into public.classes (name, room_id, capacity, level)
    values (
      periodo || ' ' || dias || case when g.is_outdoor then ' · ar livre' else '' end,
      g.room_id,
      12,
      'todos'
    )
    returning id into nova;

    insert into public.class_meetings (class_id, weekday, start_time, duration_min)
    select nova, unnest(g.dias), g.start_time, coalesce(g.duracao, 60);
  end loop;
end $$;

drop table if exists public.class_schedules cascade;

-- -----------------------------------------------------------------------------
-- 6. generate_sessions passa a ler turmas
-- -----------------------------------------------------------------------------

drop function if exists public.generate_sessions(date, date);

create function public.generate_sessions(range_start date, range_end date)
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
    select
      cm.class_id, cm.weekday, cm.start_time, cm.duration_min,
      c.teacher_id, c.room_id, c.capacity, c.level, c.name,
      c.valid_from, c.valid_until
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
        (class_id, teacher_id, room_id, title, starts_at, ends_at, capacity, level)
      values (
        m.class_id, m.teacher_id, m.room_id, m.name,
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

-- Duas sessões da mesma turma no mesmo instante seriam duplicata.
create unique index if not exists class_sessions_turma_inicio_uniq
  on public.class_sessions (class_id, starts_at)
  where class_id is not null;

-- -----------------------------------------------------------------------------
-- 7. RLS
-- -----------------------------------------------------------------------------

alter table public.classes           enable row level security;
alter table public.class_meetings    enable row level security;
alter table public.class_enrollments enable row level security;

drop policy if exists classes_read on public.classes;
create policy classes_read on public.classes
  for select to authenticated using (true);

drop policy if exists classes_admin on public.classes;
create policy classes_admin on public.classes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists meetings_read on public.class_meetings;
create policy meetings_read on public.class_meetings
  for select to authenticated using (true);

drop policy if exists meetings_admin on public.class_meetings;
create policy meetings_admin on public.class_meetings
  for all using (public.is_admin()) with check (public.is_admin());

-- O aluno vê a própria matrícula; o professor vê quem está nas turmas dele.
drop policy if exists enrollments_select_self on public.class_enrollments;
create policy enrollments_select_self on public.class_enrollments
  for select using (student_id = auth.uid());

drop policy if exists enrollments_select_teacher on public.class_enrollments;
create policy enrollments_select_teacher on public.class_enrollments
  for select using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists enrollments_admin on public.class_enrollments;
create policy enrollments_admin on public.class_enrollments
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8. Visão da grade semanal
-- -----------------------------------------------------------------------------

create or replace view public.v_grade_semanal
with (security_invoker = true) as
select
  cm.id            as meeting_id,
  c.id             as class_id,
  c.name           as turma,
  cm.weekday,
  cm.start_time,
  cm.duration_min,
  c.capacity,
  c.is_active,
  r.name           as sala,
  r.is_outdoor,
  c.teacher_id,
  p.full_name      as professor,
  coalesce(p.social_name, p.full_name) as professor_chamado,
  (select count(*) from public.class_enrollments e
    where e.class_id = c.id and e.is_active) as matriculados
from public.class_meetings cm
join public.classes c on c.id = cm.class_id
left join public.rooms r on r.id = c.room_id
left join public.profiles p on p.id = c.teacher_id;
