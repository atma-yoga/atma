-- =============================================================================
-- 0005 — Endereço e observações de saúde no cadastro
--
-- Saúde deixa de ser exclusiva do aluno: o professor também declara lesões e
-- restrições, então a coluna sobe de `students` para `profiles`, onde serve
-- aos dois. O endereço já morava em `profiles.address`; aqui ele ganha
-- formato documentado.
--
-- Consequência de acesso, deliberada: a política `profiles_select_teacher`
-- deixa o professor ler o perfil dos alunos que agendaram com ele. Com saúde
-- em `profiles`, ele passa a enxergar as restrições do aluno — que é o que
-- precisa saber antes de propor uma postura. Aluno nenhum lê o de outro.
-- =============================================================================

alter table public.profiles
  add column if not exists health_notes text;

comment on column public.profiles.health_notes is
  'Lesões, restrições e condições relevantes para a prática. Dado sensível (LGPD): '
  'visível para a pessoa, para a administração e para o professor que dá aula a ela.';

comment on column public.profiles.address is
  'Endereço: { cep, logradouro, numero, complemento, bairro, cidade, uf }.';

-- Traz o que houver em students.health_notes antes de remover a coluna.
update public.profiles p
set health_notes = s.health_notes
from public.students s
where s.profile_id = p.id
  and s.health_notes is not null
  and p.health_notes is null;

alter table public.students drop column if exists health_notes;
