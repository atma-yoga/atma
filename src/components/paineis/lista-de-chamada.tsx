import { Cartao } from "@/components/ui";

export type AlunoNaChamada = {
  id: string;
  nome: string;
  status: "booked" | "attended" | "no_show" | "waitlisted" | "canceled";
  /** Percentual de presença na turma, ou null se ainda não há histórico. */
  frequencia: number | null;
  presencas: number;
  totalRegistrado: number;
};

const CORES = {
  attended: "var(--color-verde)",
  no_show: "var(--color-mel)",
} as const;

/**
 * A lista de chamada. Cada aluno tem dois botões e um desfazer — nada de
 * menu suspenso: o professor marca em pé, no meio da sala, com o celular
 * numa mão.
 */
export function ListaDeChamada({
  alunos,
  turmaId,
  marcar,
  limpar,
  demo = false,
}: {
  alunos: AlunoNaChamada[];
  turmaId: string;
  marcar?: (form: FormData) => void | Promise<void>;
  limpar?: (form: FormData) => void | Promise<void>;
  demo?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {alunos.map((a) => (
        <Cartao
          key={a.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3"
          style={{
            borderLeft: `3px solid ${
              a.status === "attended"
                ? CORES.attended
                : a.status === "no_show"
                  ? CORES.no_show
                  : "transparent"
            }`,
          }}
        >
          <span className="min-w-36 flex-1">
            <span className="block text-sm">{a.nome}</span>
            <span className="block text-xs text-[var(--color-muted)]">
              {a.frequencia !== null
                ? `${a.frequencia}% de presença · ${a.presencas} de ${a.totalRegistrado}`
                : "sem histórico ainda"}
            </span>
          </span>

          <span className="flex gap-2">
            <form action={demo ? undefined : marcar}>
              <input type="hidden" name="booking" value={a.id} />
              <input type="hidden" name="turma" value={turmaId} />
              <input type="hidden" name="presente" value="1" />
              <button
                type="submit"
                disabled={demo}
                aria-pressed={a.status === "attended"}
                className={`h-9 rounded-[var(--radius-md)] px-4 text-xs transition ${
                  a.status === "attended"
                    ? "bg-[var(--color-verde)] font-medium text-[var(--color-on-verde)]"
                    : "border border-[var(--color-border-strong)] text-[var(--color-muted)]"
                }`}
              >
                Veio
              </button>
            </form>

            <form action={demo ? undefined : marcar}>
              <input type="hidden" name="booking" value={a.id} />
              <input type="hidden" name="turma" value={turmaId} />
              <input type="hidden" name="presente" value="0" />
              <button
                type="submit"
                disabled={demo}
                aria-pressed={a.status === "no_show"}
                className={`h-9 rounded-[var(--radius-md)] px-4 text-xs transition ${
                  a.status === "no_show"
                    ? "bg-[var(--color-mel)] font-medium text-[var(--color-on-mel)]"
                    : "border border-[var(--color-border-strong)] text-[var(--color-muted)]"
                }`}
              >
                Faltou
              </button>
            </form>

            {a.status !== "booked" ? (
              <form action={demo ? undefined : limpar}>
                <input type="hidden" name="booking" value={a.id} />
                <input type="hidden" name="turma" value={turmaId} />
                <button
                  type="submit"
                  disabled={demo}
                  className="h-9 px-2 text-xs text-[var(--color-subtle)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
                >
                  desfazer
                </button>
              </form>
            ) : null}
          </span>
        </Cartao>
      ))}
    </div>
  );
}
