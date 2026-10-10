-- =============================================================================
-- 0021 — Reposição de aula
--
-- O aluno da turma de segunda e quarta falta na quarta e faz a aula na terça,
-- numa turma que não é a dele. Isso precisa deixar rastro nos dois lados: na
-- chamada da terça ele é visita, e na chamada da quarta a falta vira presença
-- de outra cor, dizendo onde ele repôs.
--
-- São duas linhas de `bookings` — uma em cada aula — e um único vínculo entre
-- elas: a linha da visita aponta para a falta que está repondo. Uma ponta só,
-- lida das duas direções. Nada de tabela nova, nada de marcar a mesma coisa em
-- dois lugares e correr o risco de discordarem.
--
-- Decisões do estúdio, tomadas em 10/10/2026:
--   • vale repor falta passada e adiantar aula que se sabe que vai perder;
--   • a visita ocupa uma das vagas da turma visitada, e lotada recusa;
--   • faltas de até 30 dias podem ser repostas;
--   • o professor da turma visitada registra, não só a administração.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. O vínculo
-- -----------------------------------------------------------------------------

alter table public.bookings
  add column if not exists reposicao_de uuid
    references public.bookings (id) on delete set null;

comment on column public.bookings.reposicao_de is
  'Preenchido na linha da visita: qual aula da turma do próprio aluno esta '
  'presença está repondo. Nulo em toda linha comum de chamada.';

-- Uma falta se repõe uma vez só.
create unique index if not exists bookings_uma_reposicao_por_falta
  on public.bookings (reposicao_de)
  where reposicao_de is not null;

create index if not exists bookings_visitas
  on public.bookings (session_id)
  where reposicao_de is not null;

/**
 * Impede vínculo incoerente.
 *
 * O banco não pode confiar que a tela mandou o par certo: a falta tem que ser
 * do mesmo aluno, em outra aula, e não pode ser ela própria uma reposição —
 * senão nasce corrente de reposição de reposição e a conta de frequência
 * nunca mais fecha.
 */
create or replace function public.conferir_reposicao()
returns trigger language plpgsql security definer set search_path = public as $$
declare origem record;
begin
  if new.reposicao_de is null then
    return new;
  end if;

  if new.reposicao_de = new.id then
    raise exception 'uma aula não repõe a si mesma';
  end if;

  select b.student_id, b.session_id, b.reposicao_de
    into origem
  from public.bookings b
  where b.id = new.reposicao_de;

  if not found then
    raise exception 'a aula que se quer repor não existe';
  end if;
  if origem.student_id <> new.student_id then
    raise exception 'essa falta é de outro aluno';
  end if;
  if origem.session_id = new.session_id then
    raise exception 'a reposição teria que ser em outra aula';
  end if;
  if origem.reposicao_de is not null then
    raise exception 'não se repõe uma reposição';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_reposicao_coerente on public.bookings;
create trigger bookings_reposicao_coerente
  before insert or update of reposicao_de on public.bookings
  for each row execute function public.conferir_reposicao();

-- -----------------------------------------------------------------------------
-- 2. Uma régua só para dizer o que é presença
--
-- Cinco views contavam `status = 'attended'` cada uma por conta própria. Com a
-- reposição a regra ficou mais fina — falta reposta conta como presença, e a
-- visita não entra na frequência da turma visitada, porque o aluno não é de
-- lá. Em vez de repetir isso cinco vezes e deixar as telas discordarem com o
-- tempo, a regra passa a morar aqui, e as cinco leem daqui.
-- -----------------------------------------------------------------------------

create or replace view public.v_presencas
with (security_invoker = true) as
select
  b.id            as booking_id,
  b.student_id,
  b.session_id,
  b.status,
  b.reposicao_de,
  s.class_id,
  s.starts_at,
  r.id            as reposta_por,
  case
    when b.reposicao_de is not null then 'visita'
    when b.status = 'attended'      then 'presente'
    when r.id is not null           then 'reposta'
    when b.status = 'no_show'       then 'falta'
    else 'sem_registro'
  end             as situacao
from public.bookings b
join public.class_sessions s on s.id = b.session_id
left join public.bookings r on r.reposicao_de = b.id
where s.status <> 'canceled';

comment on view public.v_presencas is
  'Uma linha por chamada, já classificada: presente, reposta, falta, visita '
  'ou sem_registro. É a régua que as contas de frequência usam.';

-- -----------------------------------------------------------------------------
-- 3. As contas, agora pela régua
-- -----------------------------------------------------------------------------

create or replace view public.v_frequencia
with (security_invoker = true) as
select
  p.student_id,
  p.class_id,
  count(*) filter (where p.situacao in ('presente', 'reposta', 'falta'))
    as aulas_com_registro,
  count(*) filter (where p.situacao in ('presente', 'reposta'))
    as presencas,
  count(*) filter (where p.situacao = 'falta')
    as faltas,
  case
    when count(*) filter (where p.situacao in ('presente', 'reposta', 'falta')) = 0
      then null
    else round(
      100.0 * count(*) filter (where p.situacao in ('presente', 'reposta'))
      / count(*) filter (where p.situacao in ('presente', 'reposta', 'falta'))
    )
  end as percentual,
  count(*) filter (where p.situacao = 'reposta') as reposicoes
from public.v_presencas p
where p.class_id is not null
  and p.situacao <> 'visita'
group by p.student_id, p.class_id;

comment on view public.v_frequencia is
  'Presenças por aluno e turma. Falta reposta conta como presença. A visita '
  'não entra: o aluno não é da turma visitada.';

create or replace view public.v_frequencia_mensal
with (security_invoker = true) as
select
  p.student_id,
  date_trunc('month', (p.starts_at at time zone 'America/Sao_Paulo'))::date as mes,
  count(*) filter (where p.situacao in ('presente', 'reposta')) as presencas,
  count(*) filter (where p.situacao = 'falta')                  as faltas,
  count(*) filter (where p.situacao = 'reposta')                as reposicoes
from public.v_presencas p
where p.situacao <> 'visita'
group by p.student_id,
         date_trunc('month', (p.starts_at at time zone 'America/Sao_Paulo'));

create or replace view public.v_presenca_mensal
with (security_invoker = true) as
select
  p.student_id,
  date_trunc('month', (p.starts_at at time zone 'America/Sao_Paulo'))::date as mes,
  count(*) filter (where p.situacao in ('presente', 'reposta')) as presencas,
  count(*) filter (where p.situacao = 'falta')                  as faltas,
  count(*) filter (where p.situacao = 'reposta')                as reposicoes
from public.v_presencas p
where p.situacao <> 'visita'
group by p.student_id,
         date_trunc('month', (p.starts_at at time zone 'America/Sao_Paulo'));

create or replace view public.v_relatorio_presenca
with (security_invoker = true) as
select
  p.student_id,
  coalesce(pr.social_name, pr.full_name) as aluno,
  count(*) filter (where p.situacao in ('presente', 'reposta')) as presencas,
  count(*) filter (where p.situacao = 'falta')                  as faltas,
  case
    when count(*) filter (where p.situacao in ('presente', 'reposta', 'falta')) = 0
      then null
    else round(
      100.0 * count(*) filter (where p.situacao in ('presente', 'reposta'))
      / count(*) filter (where p.situacao in ('presente', 'reposta', 'falta'))
    )
  end as percentual,
  count(*) filter (where p.situacao = 'reposta') as reposicoes
from public.v_presencas p
join public.profiles pr on pr.id = p.student_id
where p.situacao <> 'visita'
group by p.student_id, pr.social_name, pr.full_name;

-- A agenda do aluno ganha a situação e, quando houver, para onde a aula foi
-- (na linha da falta reposta) ou de onde veio (na linha da visita).
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
  coalesce(p.social_name, p.full_name) as professor,
  case
    when b.reposicao_de is not null then 'visita'
    when b.status = 'attended'      then 'presente'
    when rep.id is not null         then 'reposta'
    when b.status = 'no_show'       then 'falta'
    else 'sem_registro'
  end             as situacao,
  -- Onde ele repôs esta falta.
  cRep.name       as reposta_na_turma,
  sRep.starts_at  as reposta_em,
  -- Qual aula esta visita está repondo.
  cOrig.name      as repoe_a_turma,
  sOrig.starts_at as repoe_a_aula_de
from public.bookings b
join public.class_sessions s on s.id = b.session_id
left join public.classes c on c.id = s.class_id
left join public.rooms r on r.id = s.room_id
left join public.profiles p on p.id = s.teacher_id
left join public.bookings rep on rep.reposicao_de = b.id
left join public.class_sessions sRep on sRep.id = rep.session_id
left join public.classes cRep on cRep.id = sRep.class_id
left join public.bookings orig on orig.id = b.reposicao_de
left join public.class_sessions sOrig on sOrig.id = orig.session_id
left join public.classes cOrig on cOrig.id = sOrig.class_id;

-- -----------------------------------------------------------------------------
-- 4. Achar o aluno que chegou para repor
--
-- Quem faz a chamada é o professor da turma visitada, e ele não tem — nem deve
-- ter — acesso à ficha de aluno de outra turma. Por isso a busca é uma função
-- com poderes próprios que devolve só o nome e em que turmas a pessoa está:
-- o suficiente para saber que é o Pedro certo, e nada além disso.
-- -----------------------------------------------------------------------------

create or replace function public.alunos_para_reposicao(aula uuid, busca text)
returns table (student_id uuid, nome text, turmas text)
language plpgsql stable security definer set search_path = public as $$
declare destino record;
begin
  select s.id, s.class_id, c.teacher_id
    into destino
  from public.class_sessions s
  left join public.classes c on c.id = s.class_id
  where s.id = aula;

  if not found then
    raise exception 'aula não encontrada';
  end if;

  if not (public.is_admin()
          or destino.teacher_id = auth.uid()
          or exists (select 1 from public.class_sessions s2
                     where s2.id = aula and s2.teacher_id = auth.uid())) then
    raise exception 'sem permissão para mexer na chamada desta aula';
  end if;

  -- Busca vazia devolve todo mundo que pode ser visita nesta aula: são
  -- dezenas de nomes num estúdio, cabem na tela, e assim a busca filtra na
  -- máquina do professor sem uma ida ao servidor a cada tecla.
  return query
  select
    st.profile_id,
    coalesce(pr.social_name, pr.full_name),
    string_agg(distinct c.name, ', ' order by c.name)
  from public.students st
  join public.profiles pr on pr.id = st.profile_id
  join public.class_enrollments e on e.student_id = st.profile_id and e.is_active
  join public.classes c on c.id = e.class_id
  where st.is_active
    and (coalesce(trim(busca), '') = ''
         or pr.full_name ilike '%' || trim(busca) || '%'
         or pr.social_name ilike '%' || trim(busca) || '%')
    -- Quem já é da turma visitada não é visita.
    and not exists (
      select 1 from public.class_enrollments e2
      where e2.student_id = st.profile_id
        and e2.class_id = destino.class_id
        and e2.is_active
    )
    -- Nem quem já está nesta chamada.
    and not exists (
      select 1 from public.bookings b
      where b.session_id = aula and b.student_id = st.profile_id
    )
  group by st.profile_id, pr.social_name, pr.full_name
  order by 2
  limit 40;
end;
$$;

/**
 * O que esse aluno tem para repor.
 *
 * Devolve as faltas dos últimos 30 dias que ainda não foram repostas e as
 * aulas dele nos próximos 30 dias — estas para quem avisa antes que vai
 * faltar. A aula futura pode ainda não existir no banco; nesse caso vem sem
 * `origem`, e quem registra a cria na hora.
 */
create or replace function public.aulas_para_repor(aluno uuid)
returns table (
  origem      uuid,
  turma       uuid,
  turma_nome  text,
  quando      timestamptz,
  dia         date,
  tipo        text
)
language sql stable security definer set search_path = public as $$
with candidatas as (
  -- Faltas recentes ainda em aberto.
  select
    b.id          as origem,
    s.class_id    as turma,
    c.name        as turma_nome,
    s.starts_at   as quando,
    (s.starts_at at time zone 'America/Sao_Paulo')::date as dia,
    'falta'       as tipo
  from public.bookings b
  join public.class_sessions s on s.id = b.session_id
  join public.classes c on c.id = s.class_id
  where b.student_id = aluno
    and b.reposicao_de is null
    and b.status = 'no_show'
    and s.status <> 'canceled'
    and s.starts_at >= now() - interval '30 days'
    and not exists (
      select 1 from public.bookings r where r.reposicao_de = b.id
    )

  union all

  -- Aulas que ainda vêm, pela grade da turma.
  select
    b.id,
    c.id,
    c.name,
    (d::date + cm.start_time) at time zone 'America/Sao_Paulo',
    d::date,
    'futura'
  from public.class_enrollments e
  join public.classes c on c.id = e.class_id
  join public.class_meetings cm on cm.class_id = c.id
  cross join generate_series(current_date, current_date + 30, interval '1 day') d
  left join public.class_sessions s
    on s.class_id = c.id
   and s.starts_at = (d::date + cm.start_time) at time zone 'America/Sao_Paulo'
  left join public.bookings b
    on b.session_id = s.id and b.student_id = aluno
  where e.student_id = aluno
    and e.is_active
    and extract(dow from d) = cm.weekday
    and (s.id is null or s.status <> 'canceled')
    -- Já resolvida: veio, faltou, ou já tem reposição marcada.
    and (b.id is null or (b.status = 'booked' and b.reposicao_de is null
         and not exists (select 1 from public.bookings r where r.reposicao_de = b.id)))
)
-- A falta é o motivo de estar aqui: vem primeiro, e a mais recente no topo.
-- Depois as aulas que vêm, da mais próxima para a mais distante. Ordenar só
-- por data jogaria a falta para o fim da lista, onde ninguém a acha.
select origem, turma, turma_nome, quando, dia, tipo
from candidatas
order by tipo, abs(extract(epoch from (quando - now())))
limit 20;
$$;

-- -----------------------------------------------------------------------------
-- 5. Registrar
-- -----------------------------------------------------------------------------

/**
 * Garante que o aluno tenha linha na aula daquele dia da turma dele, criando a
 * aula se ainda não existir.
 *
 * Existe por causa da reposição adiantada: o professor da terça precisa apontar
 * para a quarta que ainda não aconteceu, e ele não é professor da quarta. A
 * permissão já foi conferida na aula de destino, antes de chegar aqui.
 */
create or replace function public.garantir_lugar_na_aula(
  turma uuid, dia date, aluno uuid
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  encontro record;
  aula_id  uuid;
  inicio   timestamptz;
  lugar    uuid;
begin
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

  select id into lugar
  from public.bookings
  where session_id = aula_id and student_id = aluno;

  if lugar is null then
    insert into public.bookings (session_id, student_id, status)
    values (aula_id, aluno, 'booked')
    returning id into lugar;
  end if;

  return lugar;
end;
$$;

/**
 * Põe o aluno visitante na chamada de hoje, repondo uma aula da turma dele.
 *
 * `origem` é a linha da falta. Quando ela ainda não existe — reposição
 * adiantada — vêm `turma_origem` e `dia_origem` no lugar, e a aula nasce aqui.
 */
create or replace function public.registrar_reposicao(
  aula          uuid,
  aluno         uuid,
  origem        uuid default null,
  turma_origem  uuid default null,
  dia_origem    date default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  destino  record;
  ocupadas integer;
  alvo     uuid;
  novo     uuid;
begin
  select s.id, s.class_id, s.capacity, s.status, s.teacher_id, c.teacher_id as dono
    into destino
  from public.class_sessions s
  left join public.classes c on c.id = s.class_id
  where s.id = aula;

  if not found then
    raise exception 'aula não encontrada';
  end if;
  if destino.status = 'canceled' then
    raise exception 'esta aula está suspensa';
  end if;

  if not (public.is_admin()
          or destino.dono = auth.uid()
          or destino.teacher_id = auth.uid()) then
    raise exception 'sem permissão para mexer na chamada desta aula';
  end if;

  if exists (select 1 from public.bookings
             where session_id = aula and student_id = aluno) then
    raise exception 'este aluno já está nesta chamada';
  end if;

  -- A vaga é o tapete no chão: visita ocupa igual a matriculado.
  select count(*) into ocupadas
  from public.bookings
  where session_id = aula and status in ('booked', 'attended');

  if ocupadas >= coalesce(destino.capacity, 12) then
    raise exception 'turma cheia: % de % lugares ocupados',
      ocupadas, coalesce(destino.capacity, 12);
  end if;

  alvo := origem;

  if alvo is null then
    if turma_origem is null or dia_origem is null then
      raise exception 'informe qual aula está sendo reposta';
    end if;
    alvo := public.garantir_lugar_na_aula(turma_origem, dia_origem, aluno);
  end if;

  -- Entra já presente: ele está na sala, é isso que a reposição significa.
  begin
    insert into public.bookings
      (session_id, student_id, status, checked_in_at, checked_in_by, reposicao_de)
    values (aula, aluno, 'attended', now(), auth.uid(), alvo)
    returning id into novo;
  exception when unique_violation then
    -- O índice que garante uma reposição por falta. A mensagem crua do
    -- Postgres chegaria à tela do professor falando em constraint.
    raise exception 'esta aula já foi reposta em outro dia';
  end;

  return novo;
end;
$$;

/** Tira a visita da chamada. A falta volta a ser falta. */
create or replace function public.desfazer_reposicao(visita uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare dados record;
begin
  select b.id, b.reposicao_de, s.teacher_id, c.teacher_id as dono
    into dados
  from public.bookings b
  join public.class_sessions s on s.id = b.session_id
  left join public.classes c on c.id = s.class_id
  where b.id = visita;

  if not found then
    raise exception 'registro não encontrado';
  end if;
  if dados.reposicao_de is null then
    raise exception 'esta linha não é uma reposição';
  end if;
  if not (public.is_admin()
          or dados.dono = auth.uid()
          or dados.teacher_id = auth.uid()) then
    raise exception 'sem permissão para mexer na chamada desta aula';
  end if;

  delete from public.bookings where id = visita;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Fechar a porta de serviço
--
-- `garantir_lugar_na_aula` cria aula e presença para o aluno que receber por
-- parâmetro, sem conferir quem chamou — ela confia em `registrar_reposicao`,
-- que já conferiu. Como toda função em `public` é exposta pela API, deixá-la
-- aberta deixaria qualquer pessoa logada criando presença para qualquer um.
-- Ela só deve ser chamada de dentro do banco.
-- -----------------------------------------------------------------------------

revoke execute on function public.garantir_lugar_na_aula(uuid, date, uuid)
  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Contar a história da reposição na chamada
--
-- As duas pontas de uma reposição ficam em turmas diferentes, e o professor só
-- enxerga as aulas das turmas dele: pela RLS, o outro lado vem vazio. Esta
-- função atravessa essa parede com o mínimo possível — nome da turma e data,
-- nada de quem estava lá — para a chamada poder escrever "repôs na Noite 19:00,
-- 01/10" em vez de só pintar a linha de outra cor e não explicar nada.
-- -----------------------------------------------------------------------------

create or replace function public.contexto_de_reposicao(aula uuid)
returns table (
  booking_id   uuid,
  tipo         text,
  outra_turma  text,
  outra_data   timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare destino record;
begin
  select s.id, s.teacher_id, c.teacher_id as dono
    into destino
  from public.class_sessions s
  left join public.classes c on c.id = s.class_id
  where s.id = aula;

  if not found then
    return;
  end if;

  if not (public.is_admin()
          or destino.dono = auth.uid()
          or destino.teacher_id = auth.uid()) then
    raise exception 'sem permissão para ver a chamada desta aula';
  end if;

  return query
  -- Visitas: de qual aula da turma dele esta presença veio.
  select b.id, 'visita'::text, cOrig.name, sOrig.starts_at
  from public.bookings b
  join public.bookings orig on orig.id = b.reposicao_de
  join public.class_sessions sOrig on sOrig.id = orig.session_id
  left join public.classes cOrig on cOrig.id = sOrig.class_id
  where b.session_id = aula

  union all

  -- Faltas desta chamada que já foram repostas em outro dia.
  select b.id, 'reposta'::text, cRep.name, sRep.starts_at
  from public.bookings b
  join public.bookings rep on rep.reposicao_de = b.id
  join public.class_sessions sRep on sRep.id = rep.session_id
  left join public.classes cRep on cRep.id = sRep.class_id
  where b.session_id = aula;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. O visitante também tem ficha médica
--
-- `v_ficha_do_aluno` mostrava ao professor apenas quem está matriculado nas
-- turmas dele. O aluno que vem repor não está — e é justamente de quem o
-- professor mais precisa saber, porque é alguém que ele nunca viu entrando na
-- sala dele. Quem tem presença numa aula do professor passa a ter ficha
-- visível para ele: nome e saúde, como todo mundo, e nada além disso.
-- -----------------------------------------------------------------------------

create or replace view public.v_ficha_do_aluno
with (security_invoker = false) as
select
  p.id                                  as student_id,
  coalesce(p.social_name, p.full_name)  as nome,
  p.full_name                           as nome_completo,
  p.health_conditions,
  p.health_notes
from public.profiles p
where
  p.id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.class_enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p.id
      and e.is_active
      and c.teacher_id = auth.uid()
  )
  -- Quem esteve, está ou vai estar numa aula dele — inclusive repondo.
  or exists (
    select 1
    from public.bookings b
    join public.class_sessions s on s.id = b.session_id
    left join public.classes c2 on c2.id = s.class_id
    where b.student_id = p.id
      and (s.teacher_id = auth.uid() or c2.teacher_id = auth.uid())
  );

revoke all on public.v_ficha_do_aluno from public, anon;
grant select on public.v_ficha_do_aluno to authenticated;
