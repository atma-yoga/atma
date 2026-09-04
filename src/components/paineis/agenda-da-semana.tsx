import { Cartao } from "@/components/ui";
import type { EncontroNaGrade } from "@/components/paineis/grade-semanal";
import { corDoLocal } from "@/lib/ficha";

const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const FUSO = "America/Sao_Paulo";

/**
 * Data de hoje no fuso do estúdio.
 *
 * Em produção o servidor roda em UTC: depois das 21h de Brasília ele já
 * virou o dia, e "hoje" apareceria destacado na coluna errada.
 */
function hojeEmSaoPaulo(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${iso}T12:00:00`);
}

/** Os sete dias da semana corrente, de segunda a domingo. */
function semanaDe(referencia: Date): Date[] {
  const segunda = new Date(referencia);
  const dow = segunda.getDay();
  segunda.setDate(segunda.getDate() - (dow === 0 ? 6 : dow - 1));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    return d;
  });
}

/**
 * A semana do estúdio, desenhada a partir das turmas.
 *
 * Não depende de aulas terem sido geradas: a grade é o que se repete, e é o
 * que a administração precisa ver ao abrir o sistema.
 */
export function AgendaDaSemana({
  encontros,
  titulo = "Esta semana",
}: {
  encontros: EncontroNaGrade[];
  titulo?: string;
}) {
  const hoje = hojeEmSaoPaulo();
  const semana = semanaDe(hoje);

  const temFimDeSemana = encontros.some(
    (e) => e.weekday === 0 || e.weekday === 6,
  );
  const dias = temFimDeSemana ? semana : semana.slice(0, 5);

  const primeiro = dias[0];
  const ultimo = dias[dias.length - 1];
  const intervalo =
    primeiro.getMonth() === ultimo.getMonth()
      ? `${primeiro.getDate()} a ${ultimo.getDate()} de ${MESES[ultimo.getMonth()]}`
      : `${primeiro.getDate()} de ${MESES[primeiro.getMonth()]} a ${ultimo.getDate()} de ${MESES[ultimo.getMonth()]}`;

  const totalAulas = dias.reduce(
    (n, d) => n + encontros.filter((e) => e.weekday === d.getDay()).length,
    0,
  );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {titulo}
        </h2>
        <span className="text-xs text-[var(--color-muted)]">
          {intervalo} · {totalAulas} {totalAulas === 1 ? "aula" : "aulas"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {dias.map((data) => {
          const ehHoje = data.toDateString() === hoje.toDateString();
          const doDia = encontros
            .filter((e) => e.weekday === data.getDay())
            .sort((a, b) => a.hora.localeCompare(b.hora));

          return (
            <div key={data.toISOString()}>
              <div
                className={`mb-2 flex items-baseline justify-between gap-2 border-b pb-1.5 ${
                  ehHoje
                    ? "border-[var(--color-mel)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                <span
                  className={`text-xs uppercase tracking-[0.1em] ${
                    ehHoje
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  {NOMES[data.getDay()]}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    ehHoje
                      ? "font-medium text-[var(--color-foreground)]"
                      : "text-[var(--color-subtle)]"
                  }`}
                >
                  {ehHoje ? "hoje · " : ""}
                  {data.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {doDia.map((e) => {
                  const lotada = e.matriculados >= e.capacidade;

                  return (
                    <Cartao
                      key={e.meetingId}
                      className={`px-3 py-2.5 ${e.ativa ? "" : "opacity-50"}`}
                      style={{
                        borderLeft: `3px solid ${corDoLocal(e.cor)}`,
                      }}
                    >
                      <p className="text-base font-light tabular-nums">
                        {e.hora}
                      </p>
                      <p className="mt-0.5 text-xs">{e.turma}</p>

                      <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                        {e.professor ?? "sem professor"}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="h-1 flex-1 overflow-hidden rounded-full"
                          style={{ backgroundColor: "var(--color-surface-sunken)" }}
                          aria-hidden
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                e.capacidade
                                  ? (e.matriculados / e.capacidade) * 100
                                  : 0,
                              )}%`,
                              backgroundColor: lotada
                                ? "var(--color-mel)"
                                : "var(--color-palha)",
                            }}
                          />
                        </span>
                        <span className="text-[11px] tabular-nums text-[var(--color-muted)]">
                          {e.matriculados}/{e.capacidade}
                        </span>
                      </div>

                      {e.aoArLivre ? (
                        <p className="mt-1.5 text-xs uppercase tracking-[0.1em] text-[var(--color-subtle)]">
                          ar livre
                        </p>
                      ) : null}
                    </Cartao>
                  );
                })}

                {!doDia.length ? (
                  <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-3 py-5 text-center text-[11px] text-[var(--color-subtle)]">
                    sem aula
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
