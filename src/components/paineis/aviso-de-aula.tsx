import { Cartao, Etiqueta } from "@/components/ui";
import { corDoLocal } from "@/lib/ficha";

export type ProximaAula = {
  id: string;
  inicio: string; // ISO
  turma: string;
  professor: string | null;
  sala: string | null;
  cor: string | null;
  aoArLivre: boolean;
  suspensa: boolean;
  motivo: string | null;
};

const FUSO = "America/Sao_Paulo";

const hora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  }).format(new Date(iso));

const diaPorExtenso = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: FUSO,
  }).format(new Date(iso));

/** A data de uma aula, no fuso do estúdio, como YYYY-MM-DD. */
const dataDe = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(iso));

/**
 * O aviso do topo do painel do aluno.
 *
 * Mostra a aula de hoje; se hoje não tiver, mostra a próxima e diz quando é.
 * A distinção importa: "hoje às 19h" e "quinta às 19h" pedem atitudes
 * diferentes de quem lê.
 */
export function AvisoDeAula({
  aula,
  hoje,
}: {
  aula: ProximaAula | null;
  hoje: string;
}) {
  if (!aula) {
    return (
      <Cartao className="mb-10 px-6 py-5">
        <p className="text-sm text-[var(--color-muted)]">
          Nenhuma aula marcada. Fale com a recepção se isso não parece certo.
        </p>
      </Cartao>
    );
  }

  const ehHoje = dataDe(aula.inicio) === hoje;

  return (
    <Cartao
      className="mb-10 px-6 py-5"
      style={{ borderLeft: `3px solid ${corDoLocal(aula.cor)}` }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
            {ehHoje ? "Hoje" : "Próxima aula"}
          </p>

          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-light tabular-nums">
              {hora(aula.inicio)}
            </span>
            <span className="text-sm">{aula.turma}</span>
          </p>

          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            {!ehHoje ? `${diaPorExtenso(aula.inicio)} · ` : ""}
            {aula.sala ?? "local a definir"}
            {aula.professor ? ` · com ${aula.professor}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {aula.aoArLivre ? (
            <Etiqueta fundo="var(--color-azul)" letra="var(--color-on-azul)">
              ao ar livre
            </Etiqueta>
          ) : null}

          {aula.suspensa ? (
            <Etiqueta fundo="var(--color-danger)" letra="var(--color-papel)">
              suspensa
            </Etiqueta>
          ) : null}
        </div>
      </div>

      {aula.suspensa ? (
        <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm">
          Esta aula foi suspensa
          {aula.motivo ? `: ${aula.motivo}` : "."}
        </p>
      ) : null}
    </Cartao>
  );
}
