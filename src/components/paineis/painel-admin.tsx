import Link from "next/link";

import { AgendaDaSemana } from "@/components/paineis/agenda-da-semana";
import {
  Alertas,
  type QuemDeve,
  type QuemFaltou,
} from "@/components/paineis/alertas";
import type { EncontroNaGrade } from "@/components/paineis/grade-semanal";
import { Vazio } from "@/components/ui";

export function PainelAdmin({
  alunosAtivos,
  faltaram,
  devendo,
  semana,
}: {
  alunosAtivos: number;
  faltaram: QuemFaltou[];
  devendo: QuemDeve[];
  semana: EncontroNaGrade[];
}) {
  return (
    <>
      <h1 className="mb-8 text-2xl font-light">Visão geral do estúdio</h1>

      <Alertas
        alunosAtivos={alunosAtivos}
        faltaram={faltaram}
        devendo={devendo}
      />

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
