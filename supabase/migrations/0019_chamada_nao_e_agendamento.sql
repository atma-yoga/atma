-- =============================================================================
-- 0019 — Chamada não é agendamento
--
-- `enforce_session_capacity` foi escrito para o modelo antigo, em que o ALUNO
-- se agendava numa aula avulsa: barrava aula já começada e mandava para a
-- lista de espera quando lotava.
--
-- No modelo de turmas quem insere linhas em `bookings` é o professor abrindo
-- a chamada — sempre depois da aula, e sempre com quem já está matriculado.
-- O gatilho barrava exatamente isso, e a mensagem "aula já começou" não
-- chegava à tela: o botão simplesmente não fazia nada.
--
-- As duas regras continuam valendo para quem se agenda sozinho. Deixam de
-- valer para professor e administração.
-- =============================================================================

create or replace function public.enforce_session_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  occupied  integer;
  cap       integer;
  sess      record;
  ehGestor  boolean;
begin
  if new.status not in ('booked', 'waitlisted') then
    return new;
  end if;

  select s.capacity, s.status, s.starts_at, s.class_id, c.teacher_id
    into sess
  from public.class_sessions s
  left join public.classes c on c.id = s.class_id
  where s.id = new.session_id
  for update of s;

  if sess.status = 'canceled' then
    raise exception 'aula cancelada, não aceita agendamento';
  end if;

  -- Professor da turma e administração estão fazendo chamada, não se
  -- agendando: nem o horário nem a lotação se aplicam a eles.
  ehGestor := public.is_admin()
    or (sess.teacher_id is not null and sess.teacher_id = auth.uid());

  if ehGestor then
    return new;
  end if;

  if sess.starts_at < now() then
    raise exception 'esta aula já começou';
  end if;

  cap := sess.capacity;

  select count(*) into occupied
  from public.bookings
  where session_id = new.session_id
    and status in ('booked', 'attended')
    and (tg_op = 'INSERT' or id <> new.id);

  if occupied >= cap then
    new.status := 'waitlisted';
    select coalesce(max(waitlist_pos), 0) + 1 into new.waitlist_pos
    from public.bookings
    where session_id = new.session_id and status = 'waitlisted';
  else
    new.status := 'booked';
    new.waitlist_pos := null;
  end if;

  return new;
end;
$$;
