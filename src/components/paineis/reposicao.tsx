"use client";

import { useActionState, useMemo, useState, useTransition } from "react";

import { Botao, Cartao } from "@/components/ui";
import type {
  EstadoChamada,
  OpcaoDeReposicao,
} from "@/app/professor/turmas/actions";

export type CandidatoAReposicao = {
  id: string;
  nome: string;
  /** Turmas em que a pessoa está matriculada, para não confundir homônimos. */
  turmas: string;
};

const FUSO = "America/Sao_Paulo";

const dataCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO,
  }).format(new Date(iso));

/**
 * Põe na chamada um aluno de outra turma que veio repor uma aula.
 *
 * São dois passos de propósito. Primeiro quem é — a lista vem pronta do
 * servidor e filtra aqui, porque o professor digita com uma mão só, em pé. Só
 * depois qual aula ele está repondo, que é a parte que exige pensar: aquela
 * escolha é o que vai aparecer, meses depois, na chamada da turma dele.
 */
export function Reposicao({
  aulaId,
  turmaId,
  candidatos,
  buscarOpcoes,
  registrar,
}: {
  aulaId: string;
  turmaId: string;
  candidatos: CandidatoAReposicao[];
  buscarOpcoes: (aluno: string) => Promise<OpcaoDeReposicao[]>;
  registrar: (
    anterior: EstadoChamada,
    form: FormData,
  ) => Promise<EstadoChamada>;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<CandidatoAReposicao | null>(null);
  const [opcoes, setOpcoes] = useState<OpcaoDeReposicao[] | null>(null);
  const [carregando, iniciar] = useTransition();

  const [estado, enviar, enviando] = useActionState<EstadoChamada, FormData>(
    registrar,
    undefined,
  );

  const achados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = termo
      ? candidatos.filter((c) => c.nome.toLowerCase().includes(termo))
      : candidatos;
    return lista.slice(0, 6);
  }, [busca, candidatos]);

  function escolher(c: CandidatoAReposicao) {
    setEscolhido(c);
    setOpcoes(null);
    iniciar(async () => setOpcoes(await buscarOpcoes(c.id)));
  }

  function recomeçar() {
    setEscolhido(null);
    setOpcoes(null);
    setBusca("");
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)]"
      >
        + aluno de outra turma repondo aula
      </button>
    );
  }

  return (
    <Cartao
      className="mt-3 p-5"
      style={{ borderLeft: "3px solid var(--color-azul)" }}
    >
      {!escolhido ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Quem veio repor
            </span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="nome do aluno"
              autoComplete="off"
              autoFocus
              className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-subtle)]"
            />
          </label>

          <div className="mt-4 flex flex-col gap-1">
            {achados.length ? (
              achados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => escolher(c)}
                  className="flex flex-col items-start rounded-[var(--radius-md)] px-3 py-2 text-left transition hover:bg-[var(--color-palha)] hover:text-[var(--color-on-palha)]"
                >
                  <span className="text-sm">{c.nome}</span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {c.turmas}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Ninguém com esse nome fora desta turma.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAberto(false)}
            className="mt-4 text-xs text-[var(--color-muted)] underline underline-offset-4"
          >
            fechar
          </button>
        </>
      ) : (
        <form action={enviar}>
          <input type="hidden" name="aula" value={aulaId} />
          <input type="hidden" name="turma" value={turmaId} />
          <input type="hidden" name="aluno" value={escolhido.id} />

          <p className="text-sm">
            <strong className="font-medium">{escolhido.nome}</strong> está
            repondo qual aula?
          </p>

          {carregando ? (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              Procurando as aulas dele…
            </p>
          ) : !opcoes?.length ? (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              Nenhuma falta nos últimos 30 dias e nenhuma aula marcada à frente.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-1">
              {opcoes.map((o) => {
                const valor =
                  o.origem !== null
                    ? `origem:${o.origem}`
                    : `futura:${o.turma}:${o.dia}`;

                return (
                  <label
                    key={valor}
                    className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 transition hover:bg-[var(--color-palha)] hover:text-[var(--color-on-palha)]"
                  >
                    <input
                      type="radio"
                      name="escolha"
                      value={valor}
                      required
                      className="accent-[var(--color-azul)]"
                    />
                    <span className="text-sm">
                      {o.tipo === "falta" ? "faltou" : "vai faltar"} em{" "}
                      {o.turmaNome}
                      <span className="text-[var(--color-muted)]">
                        {" · "}
                        {dataCurta(o.quando)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {estado && "erro" in estado ? (
            <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">
              {estado.erro}
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <Botao type="submit" disabled={enviando || !opcoes?.length}>
              {enviando ? "Registrando…" : "Registrar reposição"}
            </Botao>
            <button
              type="button"
              onClick={recomeçar}
              className="text-xs text-[var(--color-muted)] underline underline-offset-4"
            >
              outro aluno
            </button>
          </div>
        </form>
      )}
    </Cartao>
  );
}
