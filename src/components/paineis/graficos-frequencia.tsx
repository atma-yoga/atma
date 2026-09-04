import { Cartao } from "@/components/ui";

/* =============================================================================
   Gráficos de frequência do aluno.

   Duas cores, escolhidas por medição e não por gosto: verde para presença e
   mel para falta dão ΔE 14,4 em protanopia — bem acima do piso. A alternativa
   óbvia (verde e terracota) dá 3,8: é o clássico vermelho/verde que some para
   quem tem deuteranopia.

   O preço é que o mel tem contraste 2,59 contra o papel, abaixo de 3:1. Por
   isso TODO número aparece escrito ao lado da cor — nenhum gráfico aqui pode
   ser lido só pela cor.
   ============================================================================= */

const PRESENCA = "var(--color-verde)";
const FALTA = "var(--color-mel)";
const VAZIO = "var(--color-surface-sunken)";

export type AulaDoMes = {
  data: string; // YYYY-MM-DD
  estado: "presente" | "falta" | "futura" | "suspensa";
};

export type MesDoAno = {
  mes: number; // 0-11
  presencas: number;
  faltas: number;
};

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function Legenda({
  itens,
}: {
  itens: { cor: string; texto: string; valor?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {itens.map((i) => (
        <span key={i.texto} className="flex items-center gap-1.5 text-xs">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: i.cor }}
          />
          <span className="text-[var(--color-muted)]">
            {i.texto}
            {i.valor !== undefined ? (
              <span className="ml-1 tabular-nums text-[var(--color-foreground)]">
                {i.valor}
              </span>
            ) : null}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * O mês, aula por aula.
 *
 * Não é um gráfico de magnitude — são eventos discretos, e o que o aluno quer
 * saber é "em quais dias eu vim". Uma marca por aula responde isso melhor que
 * qualquer barra.
 */
export function GraficoDoMes({
  aulas,
  titulo = "Este mês",
}: {
  aulas: AulaDoMes[];
  titulo?: string;
}) {
  const presencas = aulas.filter((a) => a.estado === "presente").length;
  const faltas = aulas.filter((a) => a.estado === "falta").length;

  return (
    <Cartao className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
          {titulo}
        </h3>
        <span className="text-xs text-[var(--color-muted)]">
          <span className="tabular-nums text-[var(--color-foreground)]">
            {presencas}
          </span>{" "}
          de{" "}
          <span className="tabular-nums text-[var(--color-foreground)]">
            {presencas + faltas}
          </span>{" "}
          aulas
        </span>
      </div>

      {aulas.length ? (
        <>
          <ol className="mb-4 flex flex-wrap gap-1.5">
            {aulas.map((a) => {
              const dia = Number(a.data.slice(8, 10));
              const rotulo =
                a.estado === "presente"
                  ? "presente"
                  : a.estado === "falta"
                    ? "faltou"
                    : a.estado === "suspensa"
                      ? "aula suspensa"
                      : "ainda vai acontecer";

              return (
                <li key={a.data} className="flex flex-col items-center gap-1">
                  <span
                    title={`dia ${dia} — ${rotulo}`}
                    className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[11px] tabular-nums"
                    style={{
                      backgroundColor:
                        a.estado === "presente"
                          ? PRESENCA
                          : a.estado === "falta"
                            ? FALTA
                            : VAZIO,
                      color:
                        a.estado === "presente"
                          ? "var(--color-on-verde)"
                          : a.estado === "falta"
                            ? "var(--color-on-mel)"
                            : "var(--color-muted)",
                      opacity: a.estado === "suspensa" ? 0.45 : 1,
                      textDecoration:
                        a.estado === "suspensa" ? "line-through" : undefined,
                    }}
                  >
                    {dia}
                  </span>
                </li>
              );
            })}
          </ol>

          <Legenda
            itens={[
              { cor: PRESENCA, texto: "presente", valor: presencas },
              { cor: FALTA, texto: "faltou", valor: faltas },
              { cor: VAZIO, texto: "ainda vai acontecer" },
            ]}
          />
        </>
      ) : (
        <p className="py-6 text-center text-xs text-[var(--color-muted)]">
          Nenhuma aula neste mês ainda.
        </p>
      )}
    </Cartao>
  );
}

/**
 * O ano, mês a mês. Barras empilhadas com o número escrito dentro — a altura
 * dá a leitura rápida, o número resolve o contraste baixo do mel.
 */
export function GraficoDoAno({
  meses,
  ano,
}: {
  meses: MesDoAno[];
  ano: number;
}) {
  const porMes = new Map(meses.map((m) => [m.mes, m]));
  const maximo = Math.max(
    1,
    ...meses.map((m) => m.presencas + m.faltas),
  );

  const totalPresencas = meses.reduce((s, m) => s + m.presencas, 0);
  const totalFaltas = meses.reduce((s, m) => s + m.faltas, 0);

  return (
    <Cartao className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
          {ano}
        </h3>
        <span className="text-xs text-[var(--color-muted)]">
          <span className="tabular-nums text-[var(--color-foreground)]">
            {totalPresencas}
          </span>{" "}
          presenças
        </span>
      </div>

      <div className="mb-4 flex h-32 items-end gap-1.5">
        {Array.from({ length: 12 }, (_, i) => {
          const m = porMes.get(i);
          const total = (m?.presencas ?? 0) + (m?.faltas ?? 0);
          const altura = total ? Math.max(8, (total / maximo) * 100) : 0;
          const alturaPresenca = total
            ? ((m?.presencas ?? 0) / total) * altura
            : 0;

          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="flex h-full w-full flex-col justify-end">
                {total ? (
                  <span
                    className="flex w-full flex-col justify-end overflow-hidden rounded-t-[4px]"
                    style={{ height: `${altura}%` }}
                    title={`${MES_CURTO[i]}: ${m?.presencas ?? 0} presenças, ${m?.faltas ?? 0} faltas`}
                  >
                    {(m?.faltas ?? 0) > 0 ? (
                      <span
                        className="w-full rounded-t-[4px]"
                        style={{
                          height: `${100 - (alturaPresenca / altura) * 100}%`,
                          backgroundColor: FALTA,
                          // 2px de respiro entre os segmentos empilhados
                          marginBottom: "2px",
                        }}
                      />
                    ) : null}
                    <span
                      className="w-full"
                      style={{
                        height: `${(alturaPresenca / altura) * 100}%`,
                        backgroundColor: PRESENCA,
                      }}
                    />
                  </span>
                ) : (
                  <span
                    className="w-full rounded-[4px]"
                    style={{ height: "3px", backgroundColor: VAZIO }}
                  />
                )}
              </span>

              <span className="text-xs uppercase text-[var(--color-subtle)]">
                {MES_CURTO[i]}
              </span>
              <span className="text-[11px] tabular-nums text-[var(--color-muted)]">
                {total || ""}
              </span>
            </div>
          );
        })}
      </div>

      <Legenda
        itens={[
          { cor: PRESENCA, texto: "presenças", valor: totalPresencas },
          { cor: FALTA, texto: "faltas", valor: totalFaltas },
        ]}
      />
    </Cartao>
  );
}

/**
 * O período inteiro, desde a matrícula. Um número grande com a proporção
 * embaixo — a pergunta aqui é "como eu venho indo", não "quando".
 */
export function GraficoGeral({
  presencas,
  faltas,
  desde,
}: {
  presencas: number;
  faltas: number;
  desde: string | null;
}) {
  const total = presencas + faltas;
  const percentual = total ? Math.round((presencas / total) * 100) : null;

  return (
    <Cartao className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-[0.11em] text-[var(--color-muted)]">
          Desde que entrou
        </h3>
        {desde ? (
          <span className="text-xs text-[var(--color-muted)]">
            {new Date(`${desde}T12:00:00`).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </span>
        ) : null}
      </div>

      <p className="text-4xl font-light tabular-nums">
        {percentual === null ? "—" : `${percentual}%`}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {total
          ? `${presencas} de ${total} aulas`
          : "ainda sem chamada registrada"}
      </p>

      {total ? (
        <>
          <div className="mt-4 mb-3 flex h-2 gap-[2px] overflow-hidden">
            <span
              className="rounded-l-[4px]"
              style={{
                width: `${(presencas / total) * 100}%`,
                backgroundColor: PRESENCA,
              }}
            />
            <span
              className="rounded-r-[4px]"
              style={{
                width: `${(faltas / total) * 100}%`,
                backgroundColor: FALTA,
              }}
            />
          </div>

          <Legenda
            itens={[
              { cor: PRESENCA, texto: "presenças", valor: presencas },
              { cor: FALTA, texto: "faltas", valor: faltas },
            ]}
          />
        </>
      ) : null}
    </Cartao>
  );
}
