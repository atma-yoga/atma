"use client";

import { useActionState, useState } from "react";

import { Botao, Cartao, Etiqueta } from "@/components/ui";
import type { EstadoGrade } from "@/app/admin/agenda/actions";

export const DIAS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export type HorarioDaGrade = {
  id: string;
  weekday: number;
  hora: string; // HH:MM
  duracao: number;
  capacidade: number;
  salaId: string | null;
  sala: string | null;
  aoArLivre: boolean;
  professorId: string | null;
  professor: string | null;
  titulo: string | null;
  ativo: boolean;
};

export type Opcao = { id: string; nome: string };

type Salvar = (anterior: EstadoGrade, form: FormData) => Promise<EstadoGrade>;

const entrada =
  "h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-foreground)]";

export function GradeDeHorarios({
  horarios,
  salas,
  professores,
  salvar,
  desativar,
  demo = false,
}: {
  horarios: HorarioDaGrade[];
  salas: Opcao[];
  professores: Opcao[];
  salvar?: Salvar;
  desativar?: (form: FormData) => void | Promise<void>;
  demo?: boolean;
}) {
  const [novoEm, setNovoEm] = useState<number | null>(null);

  // Dias sem aula continuam visíveis: é onde a adm clica para criar a
  // primeira. Uma grade que só mostra o que existe não deixa criar o que falta.
  const diasUteis = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="flex flex-col gap-8">
      {diasUteis.map((dia) => {
        const doDia = horarios
          .filter((h) => h.weekday === dia)
          .sort((a, b) => a.hora.localeCompare(b.hora));

        return (
          <section key={dia}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {DIAS[dia]}
              </h2>
              {!demo ? (
                <button
                  type="button"
                  onClick={() => setNovoEm(novoEm === dia ? null : dia)}
                  className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)]"
                >
                  {novoEm === dia ? "cancelar" : "+ horário"}
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              {doDia.map((h) => (
                <LinhaDeHorario
                  key={h.id}
                  horario={h}
                  salas={salas}
                  professores={professores}
                  salvar={salvar}
                  desativar={desativar}
                  demo={demo}
                />
              ))}

              {novoEm === dia ? (
                <LinhaDeHorario
                  novo
                  horario={{
                    id: "",
                    weekday: dia,
                    hora: "07:00",
                    duracao: 60,
                    capacidade: salas.length ? 15 : 1,
                    salaId: salas[0]?.id ?? null,
                    sala: null,
                    aoArLivre: false,
                    professorId: null,
                    professor: null,
                    titulo: null,
                    ativo: true,
                  }}
                  salas={salas}
                  professores={professores}
                  salvar={salvar}
                  demo={demo}
                  aoSalvar={() => setNovoEm(null)}
                />
              ) : null}

              {!doDia.length && novoEm !== dia ? (
                <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-4 py-4 text-center text-xs text-[var(--color-muted)]">
                  Sem aulas neste dia.
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LinhaDeHorario({
  horario,
  salas,
  professores,
  salvar,
  desativar,
  demo,
  novo = false,
  aoSalvar,
}: {
  horario: HorarioDaGrade;
  salas: Opcao[];
  professores: Opcao[];
  salvar?: Salvar;
  desativar?: (form: FormData) => void | Promise<void>;
  demo?: boolean;
  novo?: boolean;
  aoSalvar?: () => void;
}) {
  const [estado, enviar, pendente] = useActionState<EstadoGrade, FormData>(
    salvar ?? (async () => ({ erro: "Ação indisponível." })),
    undefined,
  );

  if (estado && "sucesso" in estado && novo) aoSalvar?.();

  return (
    <Cartao
      className={`px-4 py-3 ${horario.ativo ? "" : "opacity-55"}`}
      style={
        // Verde para sala fechada, azul para ar livre — as duas cores escuras
        // da paleta, ambas com contraste suficiente sobre papel e sobre marrom.
        {
          borderLeft: `3px solid ${
            horario.aoArLivre ? "var(--color-azul)" : "var(--color-verde)"
          }`,
        }
      }
    >
      <form
        action={demo ? undefined : enviar}
        onSubmit={demo ? (e) => e.preventDefault() : undefined}
        className="flex flex-wrap items-end gap-x-3 gap-y-2"
      >
        <input type="hidden" name="id" value={horario.id} />
        <input type="hidden" name="weekday" value={horario.weekday} />

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Hora
          </span>
          <input
            name="hora"
            type="time"
            defaultValue={horario.hora}
            required
            className={`${entrada} w-25 tabular-nums`}
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
            defaultValue={horario.duracao}
            className={`${entrada} w-16 tabular-nums`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Local
          </span>
          <select
            name="sala"
            defaultValue={horario.salaId ?? ""}
            className={`${entrada} w-32`}
          >
            <option value="">a definir</option>
            {salas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Professor
          </span>
          <select
            name="professor"
            defaultValue={horario.professorId ?? ""}
            className={`${entrada} w-36`}
          >
            <option value="">a definir</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Vagas
          </span>
          <input
            name="capacidade"
            type="number"
            min={1}
            max={99}
            defaultValue={horario.capacidade}
            className={`${entrada} w-16 tabular-nums`}
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Título (opcional)
          </span>
          <input
            name="titulo"
            defaultValue={horario.titulo ?? ""}
            placeholder="Yoga"
            className={`${entrada} w-full min-w-28`}
          />
        </label>

        <div className="flex items-center gap-3">
          <Botao
            type="submit"
            variante={novo ? "primario" : "fantasma"}
            disabled={pendente || demo}
            className="h-9"
          >
            {pendente ? "…" : novo ? "Adicionar" : "Salvar"}
          </Botao>

          {!novo && !horario.ativo ? <Etiqueta>fora da grade</Etiqueta> : null}
        </div>
      </form>

      {!novo && desativar && !demo ? (
        <form action={desativar} className="mt-2">
          <input type="hidden" name="id" value={horario.id} />
          <input type="hidden" name="ativar" value={horario.ativo ? "0" : "1"} />
          <button
            type="submit"
            className="text-xs text-[var(--color-muted)] underline underline-offset-4 transition hover:text-[var(--color-foreground)]"
          >
            {horario.ativo ? "tirar da grade" : "voltar para a grade"}
          </button>
        </form>
      ) : null}

      {estado && "erro" in estado ? (
        <p role="alert" className="mt-2 text-xs text-[var(--color-danger)]">
          {estado.erro}
        </p>
      ) : null}
    </Cartao>
  );
}
