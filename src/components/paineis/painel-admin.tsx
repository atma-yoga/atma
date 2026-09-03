import { Cartao, Numero, TituloSecao, Vazio, brl, dataHora } from "@/components/ui";
import type { AulaNaAgenda } from "./tipos";

export function PainelAdmin({
  alunosAtivos,
  matriculasAtivas,
  recebidoNoMes,
  totalEmAtraso,
  cobrancasEmAtraso,
  proximas,
}: {
  alunosAtivos: number;
  matriculasAtivas: number;
  recebidoNoMes: number;
  totalEmAtraso: number;
  cobrancasEmAtraso: number;
  proximas: AulaNaAgenda[];
}) {
  const mes = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <h1 className="mb-8 text-2xl font-light">Visão geral do estúdio</h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Alunos ativos" valor={alunosAtivos} />
        <Numero rotulo="Matrículas ativas" valor={matriculasAtivas} />
        <Numero
          rotulo="Recebido no mês"
          valor={brl(recebidoNoMes)}
          detalhe={mes}
        />
        <Numero
          rotulo="Em atraso"
          valor={brl(totalEmAtraso)}
          detalhe={`${cobrancasEmAtraso} cobrança${
            cobrancasEmAtraso === 1 ? "" : "s"
          }`}
        />
      </div>

      <section>
        <TituloSecao>Agenda dos próximos sete dias</TituloSecao>
        {proximas.length ? (
          <div className="flex flex-col gap-2">
            {proximas.map((a) => {
              const lotacao = a.capacidade > 0 ? a.ocupadas / a.capacidade : 0;
              return (
                <Cartao key={a.id} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: a.cor ?? "var(--color-mel)" }}
                  />
                  <span className="flex-1">
                    <span className="block text-sm">
                      {a.modalidade}
                      {a.professor ? ` · ${a.professor}` : ""}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {dataHora(a.inicio)} · {a.sala ?? "Sem sala"}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm tabular-nums">
                      {a.ocupadas}/{a.capacidade}
                    </span>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--color-subtle)]">
                      {Math.round(lotacao * 100)}%
                    </span>
                  </span>
                </Cartao>
              );
            })}
          </div>
        ) : (
          <Vazio>
            Nenhuma sessão gerada. Rode{" "}
            <code className="font-mono text-xs">
              select generate_sessions(current_date, current_date + 30);
            </code>{" "}
            no SQL Editor para materializar a grade.
          </Vazio>
        )}
      </section>
    </>
  );
}
