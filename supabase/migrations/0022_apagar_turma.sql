-- =============================================================================
-- 0022 — Apagar turma
--
-- A administração precisa poder desfazer uma turma criada errada. O que ela
-- não pode é apagar história sem perceber que apagou.
--
-- Hoje as referências a `classes` se comportam assim ao excluir:
--
--   class_meetings.class_id    CASCADE    — os dias da grade, somem junto
--   class_enrollments.class_id CASCADE    — as matrículas, idem
--   class_sessions.class_id    SET NULL   — as aulas FICAM, sem turma
--   payments.class_id          SET NULL   — as cobranças FICAM, sem turma
--
-- As duas últimas são a armadilha. Um `delete` cru deixaria aulas órfãs com
-- as presenças penduradas nelas — e como as contas de frequência filtram por
-- `class_id is not null`, a presença de quem treinou sumiria dos relatórios
-- sem nenhum aviso. As mensalidades sobreviveriam sem dizer de que turma
-- eram, e o Financeiro passaria a mostrar cobrança sem origem.
--
-- Por isso a exclusão só vai até onde não reescreve o passado: turma sem
-- chamada feita e sem cobrança é apagada de verdade; turma com história é
-- recusada, e para essa existe desativar, que a tira da grade e mantém tudo
-- o que aconteceu.
-- =============================================================================

create or replace function public.excluir_turma(turma uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  nome        text;
  presencas   integer;
  cobrancas   integer;
begin
  if not public.is_admin() then
    raise exception 'só a administração apaga turma';
  end if;

  select c.name into nome from public.classes c where c.id = turma;
  if not found then
    raise exception 'turma não encontrada';
  end if;

  -- Chamada feita: presença ou falta registrada em qualquer aula da turma.
  select count(*) into presencas
  from public.bookings b
  join public.class_sessions s on s.id = b.session_id
  where s.class_id = turma
    and b.status in ('attended', 'no_show');

  select count(*) into cobrancas
  from public.payments p
  where p.class_id = turma;

  if presencas > 0 or cobrancas > 0 then
    raise exception
      'a turma % tem história: % de presença e % de cobrança. '
      'Apagar deixaria esses registros sem turma e sumiria com a '
      'frequência nos relatórios. Desative a turma: ela sai da grade e '
      'o que já aconteceu continua lá.',
      nome, presencas, cobrancas;
  end if;

  -- Sem história: as aulas que existam estão vazias ou só com a lista
  -- montada, e podem ir embora junto com a turma.
  delete from public.class_sessions where class_id = turma;

  -- Dias da grade e matrículas saem em cascata.
  delete from public.classes where id = turma;
end;
$$;

comment on function public.excluir_turma is
  'Apaga uma turma que ainda não tem chamada feita nem cobrança. Turma com '
  'história é recusada: para essa, use desativar.';
