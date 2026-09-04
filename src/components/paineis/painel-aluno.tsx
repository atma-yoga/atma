import { AvisoDeAula, type ProximaAula } from "@/components/paineis/aviso-de-aula";
import {
  GraficoDoAno,
  GraficoDoMes,
  GraficoGeral,
  type AulaDoMes,
  type MesDoAno,
} from "@/components/paineis/graficos-frequencia";
import { Cartao, Etiqueta, TituloSecao, Vazio, brl, dataHora } from "@/components/ui";
import { primeiroNome } from "@/lib/auth";
import { corDoLocal } from "@/lib/ficha";

export type MinhaMensalidade = {
  id: string;
  turma: string | null;
  mes: string; // YYYY-MM-DD
  valor: number;
  vencimento: string;
  paga: boolean;
  vencida: boolean;
};

export type AulaListada = {
  id: string;
  inicio: string;
  turma: string;
  professor: string | null;
  sala: string | null;
  cor: string | null;
  suspensa: boolean;
};

export function PainelAluno({
  nome,
  hoje,
  proxima,
  aulasDoMes,
  mesesDoAno,
  ano,
  presencasTotais,
  faltasTotais,
  desde,
  proximasAulas,
  turmas,
  mensalidades,
}: {
  nome: string;
  hoje: string;
  proxima: ProximaAula | null;
  aulasDoMes: AulaDoMes[];
  mesesDoAno: MesDoAno[];
  ano: number;
  presencasTotais: number;
  faltasTotais: number;
  desde: string | null;
  proximasAulas: AulaListada[];
  turmas: string[];
  mensalidades: MinhaMensalidade[];
}) {
  return (
    <>
      <h1 className="mb-2 text-2xl font-light">
        Olá, {primeiroNome(nome) || "seja bem-vindo"}.
      </h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        {turmas.length
          ? `Você está em ${turmas.join(", ")}.`
          : "Você ainda não está em nenhuma turma."}
      </p>

      <AvisoDeAula aula={proxima} hoje={hoje} />

      <section className="mb-12">
        <TituloSecao>Sua frequência</TituloSecao>
        <div className="grid gap-4 lg:grid-cols-3">
          <GraficoDoMes aulas={aulasDoMes} />
          <GraficoDoAno meses={mesesDoAno} ano={ano} />
          <GraficoGeral
            presencas={presencasTotais}
            faltas={faltasTotais}
            desde={desde}
          />
        </div>
      </section>

      <MinhasMensalidades mensalidades={mensalidades} />

      <section>
        <TituloSecao>Próximas aulas</TituloSecao>
        {proximasAulas.length ? (
          <div className="flex flex-col gap-2">
            {proximasAulas.map((a) => (
              <Cartao
                key={a.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${
                  a.suspensa ? "opacity-55" : ""
                }`}
                style={{ borderLeft: `3px solid ${corDoLocal(a.cor)}` }}
              >
                <span className="min-w-40 flex-1">
                  <span className="block text-sm">
                    {a.turma}
                    {a.suspensa ? " · suspensa" : ""}
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {dataHora(a.inicio)}
                    {a.sala ? ` · ${a.sala}` : ""}
                    {a.professor ? ` · ${a.professor}` : ""}
                  </span>
                </span>
              </Cartao>
            ))}
          </div>
        ) : (
          <Vazio>
            Nenhuma aula à vista. A administração ainda não abriu as próximas
            aulas da sua turma.
          </Vazio>
        )}
      </section>
    </>
  );
}

/**
 * O que o aluno deve.
 *
 * Aparece para ele porque é dinheiro dele: saber que a mensalidade venceu
 * sem precisar perguntar evita metade das conversas de cobrança. O que ele
 * não vê é o financeiro de mais ninguém.
 */
function MinhasMensalidades({
  mensalidades,
}: {
  mensalidades: MinhaMensalidade[];
}) {
  const abertas = mensalidades.filter((m) => !m.paga);
  const total = abertas.reduce((s, m) => s + m.valor, 0);

  if (!mensalidades.length) return null;

  const mesDe = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

  const dia = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

  return (
    <section className="mb-12">
      <TituloSecao
        acao={
          abertas.length ? (
            <span className="text-xs text-[var(--color-muted)]">
              <span className="tabular-nums text-[var(--color-foreground)]">
                {brl(total)}
              </span>{" "}
              em aberto
            </span>
          ) : (
            <span className="text-xs text-[var(--color-muted)]">tudo em dia</span>
          )
        }
      >
        Mensalidades
      </TituloSecao>

      <div className="flex flex-col gap-2">
        {mensalidades.slice(0, 6).map((m) => (
          <Cartao
            key={m.id}
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${
              m.paga ? "opacity-70" : ""
            }`}
            style={
              m.vencida
                ? { borderLeft: "3px solid var(--color-danger)" }
                : undefined
            }
          >
            <span className="min-w-36 flex-1">
              <span className="block text-sm">{mesDe(m.mes)}</span>
              <span className="block text-xs text-[var(--color-muted)]">
                {m.turma ?? "avulso"} · vence {dia(m.vencimento)}
              </span>
            </span>

            <span className="text-sm tabular-nums">{brl(m.valor)}</span>

            {m.paga ? (
              <Etiqueta fundo="var(--color-verde)" letra="var(--color-on-verde)">
                pago
              </Etiqueta>
            ) : m.vencida ? (
              <Etiqueta fundo="var(--color-danger)" letra="var(--color-papel)">
                vencida
              </Etiqueta>
            ) : (
              <Etiqueta>a vencer</Etiqueta>
            )}
          </Cartao>
        ))}
      </div>

      {abertas.length ? (
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Para pagar ou tirar dúvida, fale com a recepção do estúdio.
        </p>
      ) : null}
    </section>
  );
}
