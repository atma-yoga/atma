-- =============================================================================
-- 0015 — Valor por aluno
--
-- O preço da turma vira o padrão, não a regra fixa. A administração pode
-- definir um valor próprio para um aluno naquela turma — bolsa, desconto de
-- irmão, preço travado de quem entrou antes do reajuste.
--
--   valor cobrado = coalesce(valor do aluno, preço da turma)
--
-- Fica na matrícula e não no aluno de propósito: a mesma pessoa pode pagar
-- cheio numa turma e ter desconto em outra.
-- =============================================================================

alter table public.class_enrollments
  add column if not exists custom_price numeric(10,2)
  check (custom_price is null or custom_price >= 0);

comment on column public.class_enrollments.custom_price is
  'Mensalidade deste aluno nesta turma. NULL = usa o preço da turma.';

-- -----------------------------------------------------------------------------
-- A cobrança automática passa a respeitar o valor do aluno
-- -----------------------------------------------------------------------------

create or replace function public.cobrar_ao_matricular()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  turma   record;
  entrada date;
  fracao  numeric;
  mes     date;
  valor   numeric;
begin
  if not new.is_active then
    return new;
  end if;

  select name, monthly_price, is_active into turma
  from public.classes where id = new.class_id;

  if not found or not turma.is_active then
    return new;
  end if;

  valor := coalesce(new.custom_price, turma.monthly_price);
  if valor <= 0 then
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
    round(valor * fracao, 2),
    public.vencimento_da_mensalidade(mes, entrada),
    'pending',
    turma.name || ' · ' || to_char(mes, 'MM/YYYY') ||
      case when fracao < 1
           then ' · ' || round(fracao * 100) || '% do mês'
           else '' end ||
      case when new.custom_price is not null then ' · valor combinado' else '' end
  )
  on conflict do nothing;

  return new;
end;
$$;

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
  valor        numeric;
begin
  if not public.is_admin() then
    raise exception 'apenas admin pode gerar mensalidades';
  end if;

  for m in
    select e.student_id, e.class_id, e.enrolled_at, e.custom_price,
           c.monthly_price, c.name
    from public.class_enrollments e
    join public.classes c on c.id = e.class_id
    where e.is_active and c.is_active
  loop
    valor := coalesce(m.custom_price, m.monthly_price);
    continue when valor <= 0;

    entrada := (m.enrolled_at at time zone 'America/Sao_Paulo')::date;

    if entrada <= primeiro_dia then
      fracao := 1.00;
      entrada := primeiro_dia;
    elsif date_trunc('month', entrada)::date > primeiro_dia then
      continue;
    else
      fracao := public.fracao_do_mes(entrada);
    end if;

    insert into public.payments (
      student_id, class_id, reference_month, proportion,
      amount, due_date, status, notes
    )
    values (
      m.student_id, m.class_id, primeiro_dia, fracao,
      round(valor * fracao, 2),
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

-- -----------------------------------------------------------------------------
-- A ficha completa que a administração vê
-- -----------------------------------------------------------------------------

create or replace view public.v_ficha_completa
with (security_invoker = true) as
select
  p.id            as student_id,
  p.full_name,
  p.social_name,
  p.email,
  p.phone,
  p.document_id,
  p.address,
  p.health_conditions,
  p.health_notes,
  p.must_change_password,
  p.is_active      as perfil_ativo,
  s.start_date,
  s.experience_level,
  s.emergency_contact,
  s.goals,
  s.how_found_us,
  s.is_active      as aluno_ativo,
  (select count(*) from public.class_enrollments e
    where e.student_id = p.id and e.is_active) as turmas,
  (select coalesce(sum(pay.amount), 0) from public.payments pay
    where pay.student_id = p.id and pay.status = 'paid') as ja_pagou,
  (select coalesce(sum(pay.amount), 0) from public.payments pay
    where pay.student_id = p.id and pay.status <> 'paid') as em_aberto
from public.profiles p
join public.students s on s.profile_id = p.id;

comment on view public.v_ficha_completa is
  'Ficha do aluno para a administração. O professor usa v_ficha_do_aluno, '
  'que devolve só nome e saúde.';
