-- =============================================================================
-- 0016 — Registro de quem já foi avisado
--
-- O aviso de mensalidade sai pelo WhatsApp, um a um, por um link que abre a
-- conversa com o texto pronto. Não existe disparo em massa sem a API oficial
-- do WhatsApp, e automatizar o WhatsApp Web por fora derruba o número.
--
-- O que o sistema pode fazer é tornar o um-a-um rápido e não deixar a
-- administração se perder: esta coluna guarda quando cada cobrança foi
-- avisada, para a lista mostrar quem falta.
-- =============================================================================

alter table public.payments
  add column if not exists reminded_at timestamptz;

comment on column public.payments.reminded_at is
  'Quando a administração avisou o aluno sobre esta cobrança.';

-- A view do financeiro passa a devolver o telefone e o aviso, para a tela
-- montar o link do WhatsApp sem uma segunda consulta por linha.
-- Recriada do zero: `create or replace` não aceita inserir coluna no meio da
-- lista, e telefone e nome completo entram antes de cpf.
drop view if exists public.v_mensalidades;

create view public.v_mensalidades
with (security_invoker = true) as
select
  p.id,
  p.student_id,
  coalesce(pr.social_name, pr.full_name) as aluno,
  pr.full_name,
  pr.phone,
  pr.document_id as cpf,
  p.class_id,
  c.name         as turma,
  p.reference_month,
  p.proportion,
  p.amount,
  p.status,
  p.due_date,
  p.paid_at,
  p.reminded_at,
  p.method,
  p.notes
from public.payments p
join public.profiles pr on pr.id = p.student_id
left join public.classes c on c.id = p.class_id;
