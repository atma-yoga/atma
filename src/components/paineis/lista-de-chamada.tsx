import {
  FichaRapida,
  type ResumoDoAluno,
} from "@/components/paineis/ficha-rapida";
import { Cartao, Etiqueta } from "@/components/ui";
import { nomeDaCondicao } from "@/lib/ficha";

export type AlunoNaChamada = {
  id: string;
  nome: string;
  status: "booked" | "attended" | "no_show" | "waitlisted" | "canceled";
  /** Percentual de presença na turma, ou null se ainda não há histórico. */
  frequencia: number | null;
  presencas: number;
  totalRegistrado: number;
  /** Condições marcadas na ficha — o professor precisa saber antes da aula. */
  condicoes: string[];
  observacoes: string | null;
  /** Ficha reduzida, para abrir sem sair da chamada. */
  ficha: ResumoDoAluno;
  /**
   * Quando esta linha faz parte de uma reposição.
   *
   * `visita`: ele é de outra turma e veio repor aqui.
   * `reposta`: ele faltou aqui e fez a aula noutro dia.
   */
  reposicao?: {
    tipo: "visita" | "reposta";
    turma: string | null;
    quando: string;
  } | null;
};

const CORES = {
  attended: "var(--color-verde)",
  no_show: "var(--color-mel)",
  // A reposição não é presença comum nem falta: ganha cor própria, para a
  // linha se explicar antes de alguém ler o texto embaixo do nome.
  reposicao: "var(--color-azul)",
} as const;

const FUSO = "America/Sao_Paulo";

const dataCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO,
  }).format(new Date(iso));

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
  desfazerReposicao,
  demo = false,
}: {
  alunos: AlunoNaChamada[];
  turmaId: string;
  marcar?: (form: FormData) => void | Promise<void>;
  limpar?: (form: FormData) => void | Promise<void>;
  desfazerReposicao?: (form: FormData) => void | Promise<void>;
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
              a.reposicao
                ? CORES.reposicao
                : a.status === "attended"
                  ? CORES.attended
                  : a.status === "no_show"
                    ? CORES.no_show
                    : "transparent"
            }`,
          }}
        >
          <span className="min-w-36 flex-1">
            <FichaRapida aluno={a.ficha} className="block text-sm" />
            <span className="block text-xs text-[var(--color-muted)]">
              {a.frequencia !== null
                ? `${a.frequencia}% de presença · ${a.presencas} de ${a.totalRegistrado}`
                : "sem histórico ainda"}
            </span>

            {a.reposicao ? (
              <span
                className="mt-1 block text-xs"
                style={{ color: "var(--color-azul)" }}
              >
                {a.reposicao.tipo === "visita"
                  ? `reposição · é da turma ${a.reposicao.turma ?? "—"}, repondo ${dataCurta(a.reposicao.quando)}`
                  : `repôs na turma ${a.reposicao.turma ?? "—"} · ${dataCurta(a.reposicao.quando)}`}
              </span>
            ) : null}

            {a.condicoes.length || a.observacoes ? (
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {a.condicoes.map((c) => (
                  <Etiqueta
                    key={c}
                    fundo="var(--color-mel)"
                    letra="var(--color-on-mel)"
                  >
                    {nomeDaCondicao(c)}
                  </Etiqueta>
                ))}
                {a.observacoes ? (
                  <span
                    className="text-xs text-[var(--color-muted)]"
                    title={a.observacoes}
                  >
                    {a.observacoes}
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>

          {/* O visitante já entra presente — ele está na sala, é o que a
              reposição quer dizer. Não há "veio" nem "faltou" a marcar: o que
              pode acontecer é ter sido lançado por engano. */}
          {a.reposicao?.tipo === "visita" ? (
            <form action={demo ? undefined : desfazerReposicao}>
              <input type="hidden" name="visita" value={a.id} />
              <input type="hidden" name="turma" value={turmaId} />
              <button
                type="submit"
                disabled={demo}
                className="h-9 px-2 text-xs text-[var(--color-subtle)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
              >
                tirar da chamada
              </button>
            </form>
          ) : (
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
          )}
        </Cartao>
      ))}
    </div>
  );
}
