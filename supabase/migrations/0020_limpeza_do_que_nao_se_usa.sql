-- Tira do banco o que a versão 0001 previu e o estúdio nunca usou.
--
-- O primeiro esboço imaginava planos com créditos: o aluno comprava um pacote
-- de aulas e cada agendamento descontava um crédito. O estúdio trabalha de
-- outro jeito — mensalidade por turma, cobrada no dia 5 (ver 0010) — então
-- essas tabelas nunca receberam uma linha sequer, fora as 5 de exemplo em
-- `plans`. O mesmo vale para o repasse ao professor e o mural de avisos:
-- nasceram no esboço e nenhuma tela chegou a lê-los.
--
-- Some junto o gatilho que descontava crédito a cada chamada. Ele já não
-- fazia nada (saía no primeiro `if` porque `subscription_id` é sempre nulo),
-- mas rodava em toda presença marcada.

-- 1. O gatilho e a função de crédito, antes das tabelas que eles leem.
drop trigger if exists bookings_credits on public.bookings;
drop function if exists public.sync_booking_credits();

-- 2. A rotina diária que vencia matrículas. Nunca foi agendada, e o atraso da
--    mensalidade hoje se lê da data de vencimento (0010), não de um status.
drop function if exists public.expire_subscriptions();

-- 3. O painel do aluno da primeira versão, substituído por v_ficha_completa.
drop view if exists public.v_student_overview;

-- 4. As pontas soltas que apontavam para as matrículas.
alter table public.bookings drop column if exists subscription_id;
alter table public.payments drop column if exists subscription_id;

-- 5. As tabelas, da folha para a raiz.
drop table if exists public.credit_ledger;
drop table if exists public.subscriptions;
drop table if exists public.plans;
drop table if exists public.teacher_payouts;
drop table if exists public.announcements;
