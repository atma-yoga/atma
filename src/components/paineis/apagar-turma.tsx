"use client";

import { useActionState, useState } from "react";

import type { EstadoDaTurma } from "@/app/admin/grade/actions";

/**
 * Apaga a turma de vez.
 *
 * Pede confirmação porque não há desfazer, e diz no texto o que vai junto —
 * os dias da grade e as matrículas. O que não vai, porque o banco recusa, é
 * turma que já tem chamada feita ou cobrança emitida: apagar essa deixaria
 * aulas e mensalidades sem turma e sumiria com a frequência nos relatórios.
 * Nesse caso a mensagem do banco aparece aqui inteira, explicando o porquê e
 * apontando o caminho: desativar.
 */
export function ApagarTurma({
  turmaId,
  nome,
  acao,
}: {
  turmaId: string;
  nome: string;
  acao: (anterior: EstadoDaTurma, form: FormData) => Promise<EstadoDaTurma>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, enviar, enviando] = useActionState<EstadoDaTurma, FormData>(
    acao,
    undefined,
  );

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-danger)]"
      >
        apagar turma
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[var(--color-muted)]">
        Apagar <strong className="font-medium">{nome}</strong>, com os dias e
        as matrículas?
      </span>

      <form action={enviar}>
        <input type="hidden" name="turma" value={turmaId} />
        <button
          type="submit"
          disabled={enviando}
          className="h-8 rounded-[var(--radius-md)] bg-[var(--color-danger)] px-3 text-xs font-medium text-[var(--color-papel)] disabled:opacity-60"
        >
          {enviando ? "Apagando…" : "Apagar"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="text-xs text-[var(--color-muted)] underline underline-offset-4"
      >
        cancelar
      </button>

      {estado?.erro ? (
        <span
          role="alert"
          className="w-full text-xs text-[var(--color-danger)]"
        >
          {estado.erro}
        </span>
      ) : null}
    </span>
  );
}
