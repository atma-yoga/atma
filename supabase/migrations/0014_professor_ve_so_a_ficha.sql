-- =============================================================================
-- 0014 — O professor vê só o que precisa
--
-- Até aqui o professor lia o perfil inteiro dos alunos das turmas dele: CPF,
-- endereço, e-mail, telefone. Isso era mais do que ele precisa e mais do que
-- o aluno esperaria — quem entrega CPF e endereço na recepção não imagina que
-- o professor de terça consegue ler.
--
-- A partir de agora:
--
--   professor → nome, nome social e ficha médica dos alunos das turmas dele
--   administração → tudo
--   aluno → o próprio perfil
--
-- A ficha médica continua visível para o professor de propósito: é o que ele
-- precisa saber antes de propor uma postura, e foi por isso que subiu para
-- `profiles` na migration 0005.
-- =============================================================================

-- Some o acesso amplo. O professor deixa de ler `profiles` de outra pessoa.
drop policy if exists profiles_select_teacher on public.profiles;

/**
 * A ficha que o professor enxerga.
 *
 * SECURITY DEFINER de propósito: ela precisa ler `profiles` por cima do RLS
 * para poder devolver a versão reduzida. O controle de quem vê o quê está no
 * WHERE abaixo, e não em quem chama.
 */
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
  -- a própria pessoa
  p.id = auth.uid()
  -- a administração
  or public.is_admin()
  -- o professor, só de quem está nas turmas dele
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
  'endereço, e-mail ou telefone.';

-- Sem isto, a view definer ficaria aberta a qualquer visitante anônimo.
revoke all on public.v_ficha_do_aluno from public, anon;
grant select on public.v_ficha_do_aluno to authenticated;

-- `teaches_student` continua existindo para outras políticas, mas nenhuma
-- delas volta a expor o perfil inteiro.
