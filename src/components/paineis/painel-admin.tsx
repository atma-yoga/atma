import Link from "next/link";

import { AgendaDaSemana } from "@/components/paineis/agenda-da-semana";
import type { EncontroNaGrade } from "@/components/paineis/grade-semanal";
import { Numero, Vazio, brl } from "@/components/ui";

export function PainelAdmin({
  alunosAtivos,
  emTurma,
  recebidoNoMes,
  totalEmAtraso,
  cobrancasEmAtraso,
  semana,
}: {
  alunosAtivos: number;
  emTurma: number;
  recebidoNoMes: number;
  totalEmAtraso: number;
  cobrancasEmAtraso: number;
  semana: EncontroNaGrade[];
}) {
  const mes = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <h1 className="mb-8 text-2xl font-light">Visão geral do estúdio</h1>

      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Alunos ativos" valor={alunosAtivos} />
        <Numero
          rotulo="Em turma"
          valor={emTurma}
          detalhe={
            alunosAtivos - emTurma > 0
              ? `${alunosAtivos - emTurma} sem turma`
              : undefined
          }
        />
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

      {semana.length ? (
        <AgendaDaSemana encontros={semana} />
      ) : (
        <Vazio>
          Nenhuma turma na grade ainda.{" "}
          <Link
            href="/admin/grade"
            className="underline underline-offset-4 hover:text-[var(--color-foreground)]"
          >
            Crie a primeira
          </Link>
          .
        </Vazio>
      )}
    </>
  );
}
