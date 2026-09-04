import { Cartao, brl } from "@/components/ui";

/* =============================================================================
   Gráficos dos relatórios.

   Composição (bairro, idade, gênero) é desenhada como barra horizontal de UMA
   cor, com o nome e o número escritos ao lado. Não por economia: a paleta ATMA
   tem seis tons terrosos, e o validador reprova azul contra verde em ΔE 11,3 —
   abaixo do piso até para quem enxerga cores normalmente. Nove categorias de
   gênero em seis tons dessaturados seria ilegível. Barra ordenada com rótulo
   resolve melhor e não depende de cor nenhuma.

   Onde há duas séries — recebido contra em aberto — valem verde e mel, que
   separam ΔE 14,4 em protanopia, sempre com o número escrito.
   ============================================================================= */

const RECEBIDO = "var(--color-verde)";
const EM_ABERTO = "var(--color-mel)";
const BARRA = "var(--color-verde)";
const TRILHO = "var(--color-surface-sunken)";

export type Fatia = { rotulo: string; valor: number };

/**
 * Composição do grupo. Ordenada do maior para o menor: a pergunta é sempre
 * "quem é a maioria", e a ordem responde antes da barra.
 */
export function Composicao({
  titulo,
  fatias,
  unidade = "alunos",
  vazio = "Nada informado ainda.",
}: {
  titulo: string;
  fatias: Fatia[];
  unidade?: string;
  vazio?: string;
}) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const maior = Math.max(1, ...fatias.map((f) => f.valor));
  const ordenadas = [...fatias].sort((a, b) => b.valor - a.valor);

  return (
    <Cartao className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
          {titulo}
        </h3>
        <span className="text-xs text-[var(--color-muted)]">
          <span className="tabular-nums text-[var(--color-foreground)]">
            {total}
          </span>{" "}
          {unidade}
        </span>
      </div>

      {ordenadas.length ? (
        <ol className="flex flex-col gap-2.5">
          {ordenadas.map((f) => {
            const proporcao = total ? Math.round((f.valor / total) * 100) : 0;

            return (
              <li key={f.rotulo} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm" title={f.rotulo}>
                  {f.rotulo}
                </span>

                <span
                  className="h-2.5 flex-1 overflow-hidden rounded-[4px]"
                  style={{ backgroundColor: TRILHO }}
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-[4px]"
                    style={{
                      width: `${(f.valor / maior) * 100}%`,
                      backgroundColor: BARRA,
                    }}
                  />
                </span>

                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-[var(--color-muted)]">
                  <span className="text-[var(--color-foreground)]">{f.valor}</span>
                  {" · "}
                  {proporcao}%
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="py-6 text-center text-xs text-[var(--color-muted)]">
          {vazio}
        </p>
      )}
    </Cartao>
  );
}

export type MesDeCaixa = {
  mes: string; // YYYY-MM-DD
  previsto: number;
  recebido: number;
  emAberto: number;
};

/** Fluxo de caixa mês a mês: o que entrou contra o que ficou. */
export function FluxoDeCaixa({ meses }: { meses: MesDeCaixa[] }) {
  const maximo = Math.max(1, ...meses.map((m) => m.previsto));
  const totalRecebido = meses.reduce((s, m) => s + m.recebido, 0);
  const totalAberto = meses.reduce((s, m) => s + m.emAberto, 0);

  const nomeDoMes = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
    });

  return (
    <Cartao className="p-5">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
          Fluxo de caixa
        </h3>
        <span className="text-xs text-[var(--color-muted)]">
          <span className="tabular-nums text-[var(--color-foreground)]">
            {brl(totalRecebido)}
          </span>{" "}
          recebidos
        </span>
      </div>

      {meses.length ? (
        <>
          <div className="mb-4 flex h-40 items-end gap-2">
            {meses.map((m) => {
              const altura = (m.previsto / maximo) * 100;
              const parteRecebida = m.previsto
                ? (m.recebido / m.previsto) * 100
                : 0;

              return (
                <div
                  key={m.mes}
                  className="flex h-full flex-1 flex-col items-center gap-1.5"
                >
                  {/* flex-1 dá altura ao trilho; sem isso a barra fica com
                      altura zero e o gráfico aparece vazio. */}
                  <span className="flex w-full flex-1 items-end">
                    <span
                      className="flex w-full flex-col justify-end overflow-hidden rounded-t-[4px]"
                      style={{ height: `${Math.max(4, altura)}%` }}
                      title={`${nomeDoMes(m.mes)}: ${brl(m.recebido)} recebidos de ${brl(m.previsto)}`}
                    >
                      {m.emAberto > 0 ? (
                        <span
                          className="w-full rounded-t-[4px]"
                          style={{
                            height: `${100 - parteRecebida}%`,
                            backgroundColor: EM_ABERTO,
                            marginBottom: "2px",
                          }}
                        />
                      ) : null}
                      <span
                        className="w-full"
                        style={{
                          height: `${parteRecebida}%`,
                          backgroundColor: RECEBIDO,
                        }}
                      />
                    </span>
                  </span>

                  <span className="text-xs uppercase text-[var(--color-subtle)]">
                    {nomeDoMes(m.mes)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: RECEBIDO }}
              />
              <span className="text-[var(--color-muted)]">
                recebido{" "}
                <span className="tabular-nums text-[var(--color-foreground)]">
                  {brl(totalRecebido)}
                </span>
              </span>
            </span>

            <span className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: EM_ABERTO }}
              />
              <span className="text-[var(--color-muted)]">
                em aberto{" "}
                <span className="tabular-nums text-[var(--color-foreground)]">
                  {brl(totalAberto)}
                </span>
              </span>
            </span>
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-xs text-[var(--color-muted)]">
          Nenhuma mensalidade gerada ainda.
        </p>
      )}
    </Cartao>
  );
}

export type PresencaDeAluno = {
  aluno: string;
  presencas: number;
  faltas: number;
  percentual: number | null;
};

/**
 * Presença por aluno, do menor para o maior.
 *
 * Ordenado ao contrário do resto de propósito: quem está sumindo é o que a
 * administração precisa ver, e não quem nunca falta.
 */
export function PresencaPorAluno({ alunos }: { alunos: PresencaDeAluno[] }) {
  const ordenados = [...alunos]
    .filter((a) => a.percentual !== null)
    .sort((a, b) => (a.percentual ?? 0) - (b.percentual ?? 0));

  return (
    <Cartao className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
          Presença por aluno
        </h3>
        <span className="text-xs text-[var(--color-muted)]">
          menor primeiro
        </span>
      </div>

      {ordenados.length ? (
        <ol className="flex flex-col gap-2.5">
          {ordenados.map((a) => {
            const pouco = (a.percentual ?? 100) < 70;

            return (
              <li key={a.aluno} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm" title={a.aluno}>
                  {a.aluno}
                </span>

                <span
                  className="h-2.5 flex-1 overflow-hidden rounded-[4px]"
                  style={{ backgroundColor: TRILHO }}
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-[4px]"
                    style={{
                      width: `${a.percentual ?? 0}%`,
                      backgroundColor: pouco ? EM_ABERTO : RECEBIDO,
                    }}
                  />
                </span>

                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-[var(--color-muted)]">
                  <span className="text-[var(--color-foreground)]">
                    {a.percentual}%
                  </span>
                  {" · "}
                  {a.presencas}/{a.presencas + a.faltas}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="py-6 text-center text-xs text-[var(--color-muted)]">
          Nenhuma chamada registrada ainda.
        </p>
      )}
    </Cartao>
  );
}
