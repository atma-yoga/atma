"use client";

import { useState } from "react";

import { Botao, Cartao, Etiqueta, TituloSecao } from "@/components/ui";

export type AulaMarcada = {
  id: string;
  inicio: string; // ISO
  suspensa: boolean;
  motivo: string | null;
  foraDaGrade: boolean;
};

const FUSO = "America/Sao_Paulo";

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  }).format(new Date(iso));

/**
 * As próximas aulas de uma turma, com suspensão e criação de extra.
 *
 * A grade cobre o que se repete; isto cobre a exceção — feriado, reposição,
 * workshop. Suspender não apaga: a aula continua na lista, riscada, porque o
 * aluno precisa ver que ela não vai acontecer.
 */
export function AulasDaTurma({
  turmaId,
  aulas,
  horaPadrao,
  suspender,
  reativar,
  criarExtra,
  demo = false,
}: {
  turmaId: string;
  aulas: AulaMarcada[];
  horaPadrao: string;
  suspender?: (form: FormData) => void | Promise<void>;
  reativar?: (form: FormData) => void | Promise<void>;
  criarExtra?: (form: FormData) => void | Promise<void>;
  demo?: boolean;
}) {
  const [criando, setCriando] = useState(false);
  const [suspendendo, setSuspendendo] = useState<string | null>(null);

  return (
    <section className="mb-10">
      <TituloSecao
        acao={
          <button
            type="button"
            onClick={() => setCriando((v) => !v)}
            disabled={demo}
            className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)] disabled:opacity-50"
          >
            {criando ? "cancelar" : "+ aula extra"}
          </button>
        }
      >
        Próximas aulas
      </TituloSecao>

      {criando ? (
        <Cartao className="mb-3 p-5">
          <form
            action={demo ? undefined : criarExtra}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="turma" value={turmaId} />

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                Dia
              </span>
              <input
                name="dia"
                type="date"
                required
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                Hora
              </span>
              <input
                name="hora"
                type="time"
                defaultValue={horaPadrao}
                required
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm tabular-nums"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                Min
              </span>
              <input
                name="duracao"
                type="number"
                min={15}
                max={240}
                step={5}
                defaultValue={60}
                className="h-9 w-16 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm tabular-nums"
              />
            </label>

            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                Motivo (opcional)
              </span>
              <input
                name="observacao"
                placeholder="reposição do feriado"
                className="h-9 w-full min-w-40 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm"
              />
            </label>

            <Botao type="submit" disabled={demo} className="h-9">
              Criar aula
            </Botao>
          </form>

          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Todos os alunos da turma já entram na lista de presença.
          </p>
        </Cartao>
      ) : null}

      {aulas.length ? (
        <div className="flex flex-col gap-2">
          {aulas.map((a) => (
            <Cartao
              key={a.id}
              className={`px-5 py-3 ${a.suspensa ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  className={`min-w-36 flex-1 text-sm ${
                    a.suspensa ? "line-through" : ""
                  }`}
                >
                  {quando(a.inicio)}
                </span>

                {a.foraDaGrade ? <Etiqueta>extra</Etiqueta> : null}

                {a.suspensa ? (
                  <>
                    <Etiqueta
                      fundo="var(--color-danger)"
                      letra="var(--color-papel)"
                    >
                      suspensa
                    </Etiqueta>
                    <form action={demo ? undefined : reativar}>
                      <input type="hidden" name="aula" value={a.id} />
                      <input type="hidden" name="turma" value={turmaId} />
                      <button
                        type="submit"
                        disabled={demo}
                        className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
                      >
                        reativar
                      </button>
                    </form>
                  </>
                ) : suspendendo === a.id ? (
                  <form
                    action={demo ? undefined : suspender}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="aula" value={a.id} />
                    <input type="hidden" name="turma" value={turmaId} />
                    <input
                      name="motivo"
                      placeholder="motivo (opcional)"
                      className="h-8 min-w-40 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={demo}
                      className="h-8 rounded-[var(--radius-md)] bg-[var(--color-danger)] px-3 text-xs text-[var(--color-papel)]"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuspendendo(null)}
                      className="text-xs text-[var(--color-muted)] underline underline-offset-4"
                    >
                      cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSuspendendo(a.id)}
                    disabled={demo}
                    className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-danger)] disabled:opacity-50"
                  >
                    suspender
                  </button>
                )}
              </div>

              {a.suspensa && a.motivo ? (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  {a.motivo}
                </p>
              ) : null}
            </Cartao>
          ))}
        </div>
      ) : (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-4 py-5 text-center text-xs text-[var(--color-muted)]">
          Nenhuma aula aberta ainda. Abra uma chamada ou crie uma aula extra.
        </p>
      )}
    </section>
  );
}
