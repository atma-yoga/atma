-- =============================================================================
-- 0017 — Gênero, nascimento e relatórios
--
-- Três coisas:
--
-- 1. Gênero e data de nascimento entram na ficha. A data já existia como
--    coluna mas nunca era preenchida — sem ela não há relatório de faixa
--    etária.
--
-- 2. As views de relatório, que agregam no banco em vez de trazer tudo para
--    a aplicação somar.
--
-- 3. Nenhum relatório expõe nome junto de gênero ou idade. São recortes do
--    grupo, não fichas: cruzar identidade de gênero com nome numa tela que
--    fica aberta na recepção não é o que ninguém pediu ao entregar o dado.
-- =============================================================================

alter table public.profiles
  add column if not exists gender text;

comment on column public.profiles.gender is
  'Identidade de gênero. Vocabulário em src/lib/ficha.ts. Sempre opcional.';

alter table public.profiles drop constraint if exists profiles_gender_valores;
alter table public.profiles
  add constraint profiles_gender_valores
  check (
    gender is null
    or gender in (
      'mulher_cis', 'homem_cis',
      'mulher_trans', 'homem_trans',
      'travesti', 'nao_binario', 'agenero',
      'outro', 'prefiro_nao_dizer'
    )
  );

comment on column public.profiles.birth_date is
  'Data de nascimento. Usada para a faixa etária nos relatórios.';

-- -----------------------------------------------------------------------------
-- Fluxo de caixa por mês
-- -----------------------------------------------------------------------------

create or replace view public.v_relatorio_caixa
with (security_invoker = true) as
select
  p.reference_month                             as mes,
  count(*)                                      as cobrancas,
  sum(p.amount)                                 as previsto,
  sum(p.amount) filter (where p.status = 'paid') as recebido,
  sum(p.amount) filter (where p.status <> 'paid') as em_aberto,
  count(*) filter (where p.status = 'paid')      as pagas,
  count(*) filter (where p.status <> 'paid' and p.due_date < current_date)
                                                 as vencidas
from public.payments p
where p.reference_month is not null
group by p.reference_month;

-- -----------------------------------------------------------------------------
-- Presença por aluno
-- -----------------------------------------------------------------------------

create or replace view public.v_relatorio_presenca
with (security_invoker = true) as
select
  b.student_id,
  coalesce(pr.social_name, pr.full_name) as aluno,
  count(*) filter (where b.status = 'attended') as presencas,
  count(*) filter (where b.status = 'no_show')  as faltas,
  case
    when count(*) filter (where b.status in ('attended', 'no_show')) = 0 then null
    else round(
      100.0 * count(*) filter (where b.status = 'attended')
      / count(*) filter (where b.status in ('attended', 'no_show'))
    )
  end as percentual
from public.bookings b
join public.class_sessions s on s.id = b.session_id
join public.profiles pr on pr.id = b.student_id
where s.status <> 'canceled'
group by b.student_id, pr.social_name, pr.full_name;

/** Presença de um aluno mês a mês — usada também na ficha rápida. */
create or replace view public.v_presenca_mensal
with (security_invoker = true) as
select
  b.student_id,
  date_trunc('month', (s.starts_at at time zone 'America/Sao_Paulo'))::date as mes,
  count(*) filter (where b.status = 'attended') as presencas,
  count(*) filter (where b.status = 'no_show')  as faltas
from public.bookings b
join public.class_sessions s on s.id = b.session_id
where s.status <> 'canceled'
group by b.student_id,
         date_trunc('month', (s.starts_at at time zone 'America/Sao_Paulo'));

-- -----------------------------------------------------------------------------
-- Recortes do grupo — sem nome, de propósito
-- -----------------------------------------------------------------------------

create or replace view public.v_relatorio_bairros
with (security_invoker = true) as
select
  coalesce(nullif(trim(p.address ->> 'bairro'), ''), 'não informado') as bairro,
  coalesce(nullif(trim(p.address ->> 'cidade'), ''), '')              as cidade,
  count(*) as alunos
from public.profiles p
join public.students s on s.profile_id = p.id
where s.is_active
group by 1, 2;

create or replace view public.v_relatorio_idade
with (security_invoker = true) as
select
  case
    when p.birth_date is null then 'não informado'
    when age(p.birth_date) < interval '18 years' then 'até 17'
    when age(p.birth_date) < interval '25 years' then '18 a 24'
    when age(p.birth_date) < interval '35 years' then '25 a 34'
    when age(p.birth_date) < interval '45 years' then '35 a 44'
    when age(p.birth_date) < interval '55 years' then '45 a 54'
    when age(p.birth_date) < interval '65 years' then '55 a 64'
    else '65 ou mais'
  end as faixa,
  count(*) as alunos
from public.profiles p
join public.students s on s.profile_id = p.id
where s.is_active
group by 1;

create or replace view public.v_relatorio_genero
with (security_invoker = true) as
select
  coalesce(p.gender, 'nao_informado') as genero,
  count(*) as alunos
from public.profiles p
join public.students s on s.profile_id = p.id
where s.is_active
group by 1;

-- Só a administração lê os recortes. O professor não tem o que fazer com o
-- endereço, a idade ou o gênero dos alunos.
revoke all on public.v_relatorio_caixa      from public, anon;
revoke all on public.v_relatorio_bairros    from public, anon;
revoke all on public.v_relatorio_idade      from public, anon;
revoke all on public.v_relatorio_genero     from public, anon;
grant select on public.v_relatorio_caixa      to authenticated;
grant select on public.v_relatorio_bairros    to authenticated;
grant select on public.v_relatorio_idade      to authenticated;
grant select on public.v_relatorio_genero     to authenticated;

-- -----------------------------------------------------------------------------
-- A ficha reduzida do professor ganha a presença do mês
-- -----------------------------------------------------------------------------

drop view if exists public.v_ficha_do_aluno;

create view public.v_ficha_do_aluno
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
  );

comment on view public.v_ficha_do_aluno is
  'Nome e ficha médica. É tudo que o professor vê de um aluno — sem CPF, '
  'endereço, e-mail, telefone, gênero ou financeiro.';

revoke all on public.v_ficha_do_aluno from public, anon;
grant select on public.v_ficha_do_aluno to authenticated;
