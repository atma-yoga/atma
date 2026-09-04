import Link from "next/link";

import { Cartao, Etiqueta } from "@/components/ui";
import { corDoLocal } from "@/lib/ficha";

export const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export type EncontroNaGrade = {
  meetingId: string;
  turmaId: string;
  turma: string;
  weekday: number;
  hora: string; // HH:MM
  duracao: number;
  capacidade: number;
  matriculados: number;
  sala: string | null;
  aoArLivre: boolean;
  cor: string | null;
  professor: string | null;
  ativa: boolean;
};

/**
 * A semana em colunas. Segunda a sábado sempre aparecem, mesmo vazios: é
 * onde a administração percebe que um dia está sem aula.
 */
export function GradeSemanal({
  encontros,
  clicavel = true,
}: {
  encontros: EncontroNaGrade[];
  clicavel?: boolean;
}) {
  const dias = [1, 2, 3, 4, 5, 6, 0];
  const temFimDeSemana = encontros.some((e) => e.weekday === 0 || e.weekday === 6);
  const visiveis = temFimDeSemana ? dias : dias.slice(0, 5);

  return (
    <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
      {visiveis.map((dia) => {
        const doDia = encontros
          .filter((e) => e.weekday === dia)
          .sort((a, b) => a.hora.localeCompare(b.hora));

        return (
          <div key={dia}>
            <h3 className="mb-2 text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
              {DIAS[dia]}
            </h3>

            <div className="flex flex-col gap-2">
              {doDia.map((e) => {
                const conteudo = (
                  <Cartao
                    className={`px-3 py-2.5 transition ${
                      e.ativa ? "" : "opacity-50"
                    } ${clicavel ? "hover:shadow-[var(--shadow-raised)]" : ""}`}
                    style={{
                      borderLeft: `3px solid ${corDoLocal(e.cor)}`,
                    }}
                  >
                    <p className="text-sm tabular-nums">{e.hora}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-foreground)]">
                      {e.turma}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                      {e.professor ?? "sem professor"}
                    </p>
                    <p className="mt-1.5 text-[11px] tabular-nums text-[var(--color-muted)]">
                      {e.matriculados}/{e.capacidade} alunos
                    </p>
                  </Cartao>
                );

                return clicavel ? (
                  <Link key={e.meetingId} href={`/admin/grade/${e.turmaId}`}>
                    {conteudo}
                  </Link>
                ) : (
                  <div key={e.meetingId}>{conteudo}</div>
                );
              })}

              {!doDia.length ? (
                <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-3 py-4 text-center text-[11px] text-[var(--color-subtle)]">
                  sem aula
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Uma turma na lista, com seus dias resumidos. */
export function CartaoDaTurma({
  id,
  nome,
  dias,
  hora,
  sala,
  aoArLivre,
  cor,
  professor,
  matriculados,
  capacidade,
  ativa,
  clicavel = true,
}: {
  id: string;
  nome: string;
  dias: number[];
  hora: string;
  sala: string | null;
  aoArLivre: boolean;
  cor: string | null;
  professor: string | null;
  matriculados: number;
  capacidade: number;
  ativa: boolean;
  clicavel?: boolean;
}) {
  const lotada = matriculados >= capacidade;

  const corpo = (
    <Cartao
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${
        ativa ? "" : "opacity-55"
      }`}
      style={{ borderLeft: `3px solid ${corDoLocal(cor)}` }}
    >
      <span className="min-w-40 flex-1">
        <span className="block text-sm">{nome}</span>
        <span className="block text-xs text-[var(--color-muted)]">
          {dias
            .slice()
            .sort()
            .map((d) => DIAS_CURTOS[d])
            .join(", ")}{" "}
          · {hora} · {sala ?? "sem local"}
        </span>
      </span>

      <span className="text-xs text-[var(--color-muted)]">
        {professor ?? "sem professor"}
      </span>

      <Etiqueta
        fundo={lotada ? "var(--color-mel)" : "var(--color-palha)"}
        letra={lotada ? "var(--color-on-mel)" : "var(--color-on-palha)"}
      >
        {matriculados}/{capacidade}
      </Etiqueta>

      {!ativa ? (
        <Etiqueta
          fundo="var(--color-surface-sunken)"
          letra="var(--color-muted)"
        >
          fora da grade
        </Etiqueta>
      ) : null}
    </Cartao>
  );

  return clicavel ? (
    <Link href={`/admin/grade/${id}`} className="block">
      {corpo}
    </Link>
  ) : (
    corpo
  );
}
