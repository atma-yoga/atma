-- =============================================================================
-- 0013 — Aula extra, suspensão e frequência do aluno
--
-- Duas coisas que faltavam:
--
-- 1. A grade cobre o que se repete, mas a vida do estúdio tem exceção:
--    feriado que cancela, reposição no sábado, workshop avulso. Agora dá para
--    suspender uma aula e criar uma fora da grade.
--
-- 2. O aluno passa a ver a própria frequência. As views abaixo somam isso já
--    no fuso do estúdio — agrupar por mês em UTC jogaria a aula das 19h do
--    dia 31 para o mês seguinte.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Suspender e reativar
-- -----------------------------------------------------------------------------

create or replace function public.pode_mexer_na_turma(turma uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (
        select 1 from public.classes c
        where c.id = turma and c.teacher_id = auth.uid()
      );
$$;

create or replace function public.suspender_aula(aula uuid, motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  turma uuid;
begin
  select class_id into turma from public.class_sessions where id = aula;

  if turma is null or not public.pode_mexer_na_turma(turma) then
    raise exception 'sem permissão para suspender esta aula';
  end if;

  update public.class_sessions
  set status = 'canceled',
      cancel_reason = nullif(trim(coalesce(motivo, '')), '')
  where id = aula;
end;
$$;

create or replace function public.reativar_aula(aula uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  turma uuid;
begin
  select class_id into turma from public.class_sessions where id = aula;

  if turma is null or not public.pode_mexer_na_turma(turma) then
    raise exception 'sem permissão para reativar esta aula';
  end if;

  update public.class_sessions
  set status = 'scheduled', cancel_reason = null
  where id = aula;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Aula extra — fora dos dias da grade
-- -----------------------------------------------------------------------------

create or replace function public.criar_aula_extra(
  turma        uuid,
  dia          date,
  hora         time,
  duracao      integer default 60,
  observacao   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t       record;
  inicio  timestamptz;
  nova    uuid;
begin
  if not public.pode_mexer_na_turma(turma) then
    raise exception 'sem permissão para criar aula nesta turma';
  end if;

  select teacher_id, room_id, capacity, level, name into t
  from public.classes where id = turma;

  if not found then
    raise exception 'turma não encontrada';
  end if;

  inicio := (dia + hora) at time zone 'America/Sao_Paulo';

  -- A mesma turma não pode ter duas aulas no mesmo instante; se já existe,
  -- devolvemos a que existe em vez de estourar.
  select id into nova
  from public.class_sessions
  where class_id = turma and starts_at = inicio;

  if nova is not null then
    return nova;
  end if;

  insert into public.class_sessions
    (class_id, teacher_id, room_id, title, starts_at, ends_at,
     capacity, level, teacher_notes)
  values (
    turma, t.teacher_id, t.room_id, t.name,
    inicio, inicio + make_interval(mins => duracao),
    t.capacity, t.level, nullif(trim(coalesce(observacao, '')), '')
  )
  returning id into nova;

  -- Já matricula quem está na turma, para a chamada nascer pronta.
  insert into public.bookings (session_id, student_id, status)
  select nova, e.student_id, 'booked'
  from public.class_enrollments e
  where e.class_id = turma and e.is_active;

  return nova;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Frequência — aula suspensa não conta contra ninguém
-- -----------------------------------------------------------------------------

create or replace view public.v_frequencia
with (security_invoker = true) as
select
  b.student_id,
  s.class_id,
  count(*) filter (where b.status in ('attended', 'no_show')) as aulas_com_registro,
  count(*) filter (where b.status = 'attended')               as presencas,
  count(*) filter (where b.status = 'no_show')                as faltas,
  case
    when count(*) filter (where b.status in ('attended', 'no_show')) = 0 then null
    else round(
      100.0 * count(*) filter (where b.status = 'attended')
      / count(*) filter (where b.status in ('attended', 'no_show'))
    )
  end as percentual
from public.bookings b
join public.class_sessions s on s.id = b.session_id
where s.class_id is not null
  and s.status <> 'canceled'
group by b.student_id, s.class_id;

/**
 * Frequência do aluno mês a mês.
 *
 * O mês vem da data no fuso do estúdio: agrupando em UTC, a aula das 19h do
 * dia 31 cairia no mês seguinte.
 */
create or replace view public.v_frequencia_mensal
with (security_invoker = true) as
select
  b.student_id,
  date_trunc(
    'month', (s.starts_at at time zone 'America/Sao_Paulo')
  )::date as mes,
  count(*) filter (where b.status = 'attended') as presencas,
  count(*) filter (where b.status = 'no_show')  as faltas
from public.bookings b
join public.class_sessions s on s.id = b.session_id
where s.status <> 'canceled'
group by b.student_id, date_trunc('month', (s.starts_at at time zone 'America/Sao_Paulo'));

/** Cada aula do aluno, para desenhar o mês e listar o que vem. */
create or replace view public.v_aulas_do_aluno
with (security_invoker = true) as
select
  b.id            as booking_id,
  b.student_id,
  b.status        as presenca,
  s.id            as session_id,
  s.starts_at,
  s.ends_at,
  s.status        as status_aula,
  s.cancel_reason,
  c.id            as class_id,
  c.name          as turma,
  r.name          as sala,
  r.color         as cor,
  r.is_outdoor,
  coalesce(p.social_name, p.full_name) as professor
from public.bookings b
join public.class_sessions s on s.id = b.session_id
left join public.classes c on c.id = s.class_id
left join public.rooms r on r.id = s.room_id
left join public.profiles p on p.id = s.teacher_id;
