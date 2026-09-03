-- =============================================================================
-- 0010 — Mensalidade da turma
--
-- A turma passa a ter valor mensal. Quem entra nela é cobrado por ele, e a
-- cobrança nasce sozinha na matrícula — a administração não digita valor
-- nenhum aluno a aluno.
--
-- Vencimento: dia 5 do mês de referência.
--
-- Quem entra no meio do mês paga proporcional, por quarto do mês:
--
--   entra no 1º quarto → 100%
--   entra no 2º quarto →  75%
--   entra no 3º quarto →  50%
--   entra no 4º quarto →  25%
--
-- Por quarto, e não por dia, de propósito: o estúdio decidiu que o valor não
-- deve depender de o mês ter 28 ou 31 dias, e um número redondo é mais fácil
-- de explicar na recepção.
-- =============================================================================

alter table public.classes
  add column if not exists monthly_price numeric(10,2) not null default 0
  check (monthly_price >= 0);

comment on column public.classes.monthly_price is
  'Mensalidade da turma. Todo aluno matriculado é cobrado por este valor.';

-- -----------------------------------------------------------------------------
-- Pagamentos ganham turma e mês de referência
-- -----------------------------------------------------------------------------

alter table public.payments
  add column if not exists class_id uuid references public.classes (id) on delete set null,
  add column if not exists reference_month date,
  add column if not exists proportion numeric(4,2)
    check (proportion is null or (proportion > 0 and proportion <= 1));

comment on column public.payments.reference_month is
  'Primeiro dia do mês cobrado. Serve de chave junto com aluno e turma.';
comment on column public.payments.proportion is
  'Fração cobrada: 1, 0.75, 0.5 ou 0.25. NULL em cobranças avulsas.';

-- Uma cobrança por aluno, turma e mês. Sem isto, gerar as mensalidades duas
-- vezes cobraria o aluno em dobro.
create unique index if not exists payments_mensalidade_uniq
  on public.payments (student_id, class_id, reference_month)
  where class_id is not null and reference_month is not null;

-- -----------------------------------------------------------------------------
-- A fração do mês
-- -----------------------------------------------------------------------------

create or replace function public.fracao_do_mes(entrada date)
returns numeric
language sql
immutable
as $$
  select case
    when extract(day from entrada) <= extract(days from date_trunc('month', entrada)
      + interval '1 month' - interval '1 day') * 0.25 then 1.00
    when extract(day from entrada) <= extract(days from date_trunc('month', entrada)
      + interval '1 month' - interval '1 day') * 0.50 then 0.75
    when extract(day from entrada) <= extract(days from date_trunc('month', entrada)
      + interval '1 month' - interval '1 day') * 0.75 then 0.50
    else 0.25
  end;
$$;

comment on function public.fracao_do_mes is
  'Quanto do mês a pessoa paga, pelo quarto em que entrou: 1, 0.75, 0.5 ou 0.25.';

/**
 * Vencimento de uma mensalidade: dia 5 do mês de referência.
 *
 * Quando a matrícula acontece depois do dia 5, cobrar com vencimento já
 * vencido nasceria em atraso — a cobrança ganha cinco dias a partir da
 * entrada.
 */
create or replace function public.vencimento_da_mensalidade(
  mes date, entrada date
) returns date
language sql
immutable
as $$
  select greatest(
    date_trunc('month', mes)::date + 4,
    case when entrada > date_trunc('month', mes)::date + 4
         then entrada + 5
         else date_trunc('month', mes)::date + 4
    end
  );
$$;

-- -----------------------------------------------------------------------------
-- Geração das mensalidades
-- -----------------------------------------------------------------------------

/**
 * Cria as mensalidades de um mês para todos os alunos em turmas ativas.
 *
 * Idempotente: o índice único impede cobrar o mesmo aluno duas vezes pela
 * mesma turma no mesmo mês, então rodar de novo não duplica nada.
 */
create or replace function public.gerar_mensalidades(mes date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  primeiro_dia date := date_trunc('month', mes)::date;
  criadas      integer := 0;
  m            record;
  entrada      date;
  fracao       numeric;
begin
  if not public.is_admin() then
    raise exception 'apenas admin pode gerar mensalidades';
  end if;

  for m in
    select e.student_id, e.class_id, e.enrolled_at, c.monthly_price, c.name
    from public.class_enrollments e
    join public.classes c on c.id = e.class_id
    where e.is_active
      and c.is_active
      and c.monthly_price > 0
  loop
    entrada := (m.enrolled_at at time zone 'America/Sao_Paulo')::date;

    -- Quem já estava na turma antes deste mês paga o mês inteiro.
    if entrada <= primeiro_dia then
      fracao := 1.00;
      entrada := primeiro_dia;
    elsif date_trunc('month', entrada)::date > primeiro_dia then
      continue; -- entrou depois do mês cobrado
    else
      fracao := public.fracao_do_mes(entrada);
    end if;

    insert into public.payments (
      student_id, class_id, reference_month, proportion,
      amount, due_date, status, notes
    )
    values (
      m.student_id, m.class_id, primeiro_dia, fracao,
      round(m.monthly_price * fracao, 2),
      public.vencimento_da_mensalidade(primeiro_dia, entrada),
      'pending',
      m.name || ' · ' || to_char(primeiro_dia, 'MM/YYYY') ||
        case when fracao < 1
             then ' · ' || round(fracao * 100) || '% do mês'
             else '' end
    )
    on conflict do nothing;

    if found then
      criadas := criadas + 1;
    end if;
  end loop;

  return criadas;
end;
$$;

/**
 * Ao matricular, cria já a cobrança do mês corrente.
 *
 * Fica no banco e não na aplicação porque a cobrança é consequência da
 * matrícula, não de quem a fez: qualquer caminho que matricule alguém —
 * tela, script, importação futura — gera a cobrança do mesmo jeito.
 */
create or replace function public.cobrar_ao_matricular()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  turma   record;
  entrada date;
  fracao  numeric;
  mes     date;
begin
  if not new.is_active then
    return new;
  end if;

  select name, monthly_price, is_active into turma
  from public.classes where id = new.class_id;

  if not found or turma.monthly_price <= 0 or not turma.is_active then
    return new;
  end if;

  entrada := (new.enrolled_at at time zone 'America/Sao_Paulo')::date;
  mes     := date_trunc('month', entrada)::date;
  fracao  := public.fracao_do_mes(entrada);

  insert into public.payments (
    student_id, class_id, reference_month, proportion,
    amount, due_date, status, notes
  )
  values (
    new.student_id, new.class_id, mes, fracao,
    round(turma.monthly_price * fracao, 2),
    public.vencimento_da_mensalidade(mes, entrada),
    'pending',
    turma.name || ' · ' || to_char(mes, 'MM/YYYY') ||
      case when fracao < 1
           then ' · ' || round(fracao * 100) || '% do mês'
           else '' end
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists class_enrollments_cobranca on public.class_enrollments;
create trigger class_enrollments_cobranca
  after insert or update of is_active on public.class_enrollments
  for each row execute function public.cobrar_ao_matricular();

-- -----------------------------------------------------------------------------
-- Visão do financeiro do aluno
-- -----------------------------------------------------------------------------

create or replace view public.v_mensalidades
with (security_invoker = true) as
select
  p.id,
  p.student_id,
  coalesce(pr.social_name, pr.full_name) as aluno,
  pr.document_id as cpf,
  p.class_id,
  c.name         as turma,
  p.reference_month,
  p.proportion,
  p.amount,
  p.status,
  p.due_date,
  p.paid_at,
  p.method,
  p.notes
from public.payments p
join public.profiles pr on pr.id = p.student_id
left join public.classes c on c.id = p.class_id;
