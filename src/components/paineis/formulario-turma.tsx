"use client";

import { useActionState, useState } from "react";

import { DIAS } from "@/components/paineis/grade-semanal";
import { Botao, Campo, Cartao } from "@/components/ui";
import type { EstadoTurma } from "@/app/admin/grade/actions";
import type { Opcao } from "@/lib/ficha";

type Salvar = (anterior: EstadoTurma, form: FormData) => Promise<EstadoTurma>;

export type TurmaEmEdicao = {
  id: string;
  nome: string;
  professorId: string | null;
  salaId: string | null;
  capacidade: number;
  mensalidade: number;
  hora: string;
  duracao: number;
  dias: number[];
};

const VAZIA: TurmaEmEdicao = {
  id: "",
  nome: "",
  professorId: null,
  salaId: null,
  capacidade: 12,
  mensalidade: 0,
  hora: "07:00",
  duracao: 60,
  dias: [],
};

const entrada =
  "h-10 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)]";

export function FormularioTurma({
  turma = VAZIA,
  salas,
  professores,
  salvar,
  demo = false,
}: {
  turma?: TurmaEmEdicao;
  salas: Opcao[];
  professores: Opcao[];
  salvar?: Salvar;
  demo?: boolean;
}) {
  const [dias, setDias] = useState<number[]>(turma.dias);

  const [estado, enviar, pendente] = useActionState<EstadoTurma, FormData>(
    salvar ?? (async () => ({ erro: "Ação indisponível." })),
    undefined,
  );

  const alternarDia = (d: number) =>
    setDias((atual) =>
      atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d],
    );

  return (
    <Cartao className="p-6">
      <form
        action={demo ? undefined : enviar}
        onSubmit={demo ? (e) => e.preventDefault() : undefined}
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="id" value={turma.id} />
        {dias.map((d) => (
          <input key={d} type="hidden" name="dias" value={d} />
        ))}

        <Campo
          rotulo="Nome da turma"
          name="nome"
          defaultValue={turma.nome}
          required
          autoComplete="off"
          placeholder="Manhã 07:00"
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Dias da semana
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const marcado = dias.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => alternarDia(d)}
                  aria-pressed={marcado}
                  className={`h-9 rounded-[var(--radius-md)] px-3 text-xs transition ${
                    marcado
                      ? "bg-[var(--color-palha)] font-medium text-[var(--color-on-palha)]"
                      : "border border-[var(--color-border-strong)] text-[var(--color-muted)]"
                  }`}
                >
                  {DIAS[d].slice(0, 3)}
                </button>
              );
            })}
          </div>
          {!dias.length ? (
            <p className="text-xs text-[var(--color-muted)]">
              Escolha ao menos um dia.
            </p>
          ) : null}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Horário
            </span>
            <input
              name="hora"
              type="time"
              defaultValue={turma.hora}
              required
              className={`${entrada} tabular-nums`}
            />
          </label>

          <Campo
            rotulo="Duração (min)"
            name="duracao"
            type="number"
            min={15}
            max={240}
            step={5}
            defaultValue={turma.duracao}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Professor
          </span>
          <select
            name="professor"
            defaultValue={turma.professorId ?? ""}
            className={entrada}
          >
            <option value="">a definir</option>
            {professores.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Local
            </span>
            <select
              name="sala"
              defaultValue={turma.salaId ?? ""}
              className={entrada}
            >
              <option value="">a definir</option>
              {salas.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </label>

          <Campo
            rotulo="Vagas"
            name="capacidade"
            type="number"
            min={1}
            max={99}
            defaultValue={turma.capacidade}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Campo
            rotulo="Mensalidade (R$)"
            name="mensalidade"
            type="number"
            min={0}
            step="0.01"
            defaultValue={turma.mensalidade}
            placeholder="220,00"
          />
          <p className="text-xs text-[var(--color-muted)]">
            Cobrada de cada aluno, com vencimento no dia 5. Quem entra no meio
            do mês paga proporcional ao quarto em que entrou.
          </p>
        </div>

        {estado && "erro" in estado ? (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {estado.erro}
          </p>
        ) : null}

        {estado && "sucesso" in estado ? (
          <p role="status" className="text-sm text-[var(--color-success)]">
            {estado.sucesso}
          </p>
        ) : null}

        <Botao type="submit" disabled={pendente || demo || !dias.length}>
          {pendente ? "Salvando…" : turma.id ? "Salvar turma" : "Criar turma"}
        </Botao>

        {demo ? (
          <p className="text-center text-xs text-[var(--color-muted)]">
            Maquete — nada é salvo.
          </p>
        ) : null}
      </form>
    </Cartao>
  );
}
