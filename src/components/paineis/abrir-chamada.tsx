"use client";

import { useActionState } from "react";

import { Botao, Cartao } from "@/components/ui";
import type { EstadoChamada } from "@/app/professor/turmas/actions";

type Abrir = (
  anterior: EstadoChamada,
  form: FormData,
) => Promise<EstadoChamada>;

/**
 * O botão que cria a aula e a lista de presença.
 *
 * Client component só para poder mostrar o que deu errado: enquanto era um
 * form simples, um erro do banco fazia o botão não responder e o professor
 * ficava sem saber se tinha clicado.
 */
export function AbrirChamada({
  turmaId,
  dia,
  acao,
}: {
  turmaId: string;
  dia: string;
  acao: Abrir;
}) {
  const [estado, enviar, pendente] = useActionState<EstadoChamada, FormData>(
    acao,
    undefined,
  );

  return (
    <Cartao className="p-6 text-center">
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        A chamada deste dia ainda não foi aberta.
      </p>

      <form action={enviar}>
        <input type="hidden" name="turma" value={turmaId} />
        <input type="hidden" name="dia" value={dia} />
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Abrindo…" : "Abrir chamada"}
        </Botao>
      </form>

      {estado && "erro" in estado ? (
        <p role="alert" className="mt-4 text-sm text-[var(--color-danger)]">
          {estado.erro}
        </p>
      ) : null}
    </Cartao>
  );
}
