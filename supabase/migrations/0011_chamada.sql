-- =============================================================================
-- 0011 — Chamada
--
-- O professor abre a aula do dia e marca quem veio. A aula concreta e a lista
-- de presença nascem no momento em que ele abre a chamada, em vez de exigir
-- que alguém tenha gerado as aulas antes — o professor não deveria depender
-- de um botão que a administração talvez não tenha apertado.
--
-- Reaproveita o que já existe: `class_sessions` é a aula naquele dia e
-- `bookings` é a linha de cada aluno nela, com status attended ou no_show.
-- =============================================================================

/**
 * Abre (ou recupera) a aula de uma turma num dia, com a lista de presença
 * já montada a partir de quem está matriculado.
 *
 * Idempotente: chamar de novo devolve a mesma aula e apenas acrescenta quem
 * entrou na turma depois, sem mexer nas presenças já marcadas.
 */
create or replace function public.abrir_chamada(turma uuid, dia date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  encontro record;
  aula_id  uuid;
  inicio   timestamptz;
begin
  -- Só o professor da turma ou a administração.
  if not (
    public.is_admin()
    or exists (
      select 1 from public.classes c
      where c.id = turma and c.teacher_id = auth.uid()
    )
  ) then
    raise exception 'sem permissão para abrir a chamada desta turma';
  end if;

  select cm.start_time, cm.duration_min, c.teacher_id, c.room_id,
         c.capacity, c.level, c.name
    into encontro
  from public.class_meetings cm
  join public.classes c on c.id = cm.class_id
  where cm.class_id = turma
    and cm.weekday = extract(dow from dia)::smallint
  limit 1;

  if not found then
    raise exception 'esta turma não tem aula neste dia da semana';
  end if;

  inicio := (dia + encontro.start_time) at time zone 'America/Sao_Paulo';

  select id into aula_id
  from public.class_sessions
  where class_id = turma and starts_at = inicio;

  if aula_id is null then
    insert into public.class_sessions
      (class_id, teacher_id, room_id, title, starts_at, ends_at, capacity, level)
    values (
      turma, encontro.teacher_id, encontro.room_id, encontro.name,
      inicio, inicio + make_interval(mins => encontro.duration_min),
      encontro.capacity, encontro.level
    )
    returning id into aula_id;
  end if;

  -- Uma linha por aluno matriculado que ainda não tenha.
  insert into public.bookings (session_id, student_id, status)
  select aula_id, e.student_id, 'booked'
  from public.class_enrollments e
  where e.class_id = turma
    and e.is_active
    and not exists (
      select 1 from public.bookings b
      where b.session_id = aula_id and b.student_id = e.student_id
    );

  return aula_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- O professor precisa enxergar e mexer nas aulas das turmas dele
-- -----------------------------------------------------------------------------

drop policy if exists sessions_update_own_teacher on public.class_sessions;
create policy sessions_update_own_teacher on public.class_sessions
  for update using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  ) with check (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

-- A política antiga só olhava class_sessions.teacher_id, que pode estar vazio
-- quando a turma ainda não tinha professor no momento em que a aula nasceu.
drop policy if exists bookings_select_teacher on public.bookings;
create policy bookings_select_teacher on public.bookings
  for select using (
    exists (
      select 1 from public.class_sessions s
      left join public.classes c on c.id = s.class_id
      where s.id = session_id
        and (s.teacher_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

drop policy if exists bookings_update_teacher on public.bookings;
create policy bookings_update_teacher on public.bookings
  for update using (
    exists (
      select 1 from public.class_sessions s
      left join public.classes c on c.id = s.class_id
      where s.id = session_id
        and (s.teacher_id = auth.uid() or c.teacher_id = auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.class_sessions s
      left join public.classes c on c.id = s.class_id
      where s.id = session_id
        and (s.teacher_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

-- O professor também precisa ler o perfil de quem está na turma dele, para a
-- chamada mostrar nomes. A política antiga dependia de o aluno já ter
-- agendado uma aula com ele, o que não acontece mais nesse modelo.
create or replace function public.teaches_student(target_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.class_enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = target_student
      and e.is_active
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.bookings b
    join public.class_sessions s on s.id = b.session_id
    where b.student_id = target_student
      and s.teacher_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Frequência
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
group by b.student_id, s.class_id;

comment on view public.v_frequencia is
  'Presenças por aluno e turma. Aulas sem chamada feita não entram na conta.';
