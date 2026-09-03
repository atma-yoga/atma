import Link from "next/link";
import { notFound } from "next/navigation";

import { PainelAdmin } from "@/components/paineis/painel-admin";
import { PainelAluno } from "@/components/paineis/painel-aluno";
import { PainelProfessor } from "@/components/paineis/painel-professor";
import { Shell } from "@/components/shell";
import { PAPEL, type Papel } from "@/lib/tipos";
import {
  AGENDA_DO_ESTUDIO,
  AGENDAMENTOS_DO_ALUNO,
  AULAS_DA_SEMANA,
  AULAS_DE_HOJE,
  NUMEROS_DO_ADMIN,
  RESUMO_DO_ALUNO,
  VAGAS_ABERTAS,
} from "../dados";

export const dynamic = "force-dynamic";

const SEGMENTOS = {
  aluno: "student",
  professor: "teacher",
  admin: "admin",
} as const satisfies Record<string, Papel>;

type Segmento = keyof typeof SEGMENTOS;

const NOMES: Record<Segmento, string> = {
  aluno: "Helena Costa",
  professor: "Marina Vieira",
  admin: "Ana Prado",
};

export function generateStaticParams() {
  return Object.keys(SEGMENTOS).map((papel) => ({ papel }));
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ papel: string }>;
}) {
  const { papel } = await params;
  if (!(papel in SEGMENTOS)) notFound();

  const segmento = papel as Segmento;
  const nome = NOMES[segmento];

  return (
    <>
      <FaixaDePreview atual={segmento} />
      <Shell papel={SEGMENTOS[segmento]} nome={nome}>
        {segmento === "aluno" ? (
          <PainelAluno
            nome={nome}
            resumo={RESUMO_DO_ALUNO}
            proximas={AGENDAMENTOS_DO_ALUNO}
            disponiveis={VAGAS_ABERTAS}
          />
        ) : segmento === "professor" ? (
          <PainelProfessor
            nome={nome}
            hoje={AULAS_DE_HOJE}
            semana={AULAS_DA_SEMANA}
          />
        ) : (
          <PainelAdmin {...NUMEROS_DO_ADMIN} proximas={AGENDA_DO_ESTUDIO} />
        )}
      </Shell>
    </>
  );
}

/** Deixa explícito que a tela é maquete, e permite pular entre os papéis. */
function FaixaDePreview({ atual }: { atual: Segmento }) {
  return (
    <div className="bg-[var(--color-marrom)] px-6 py-2.5 text-[var(--color-on-marrom)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.16em] opacity-75">
          Maquete · dados fictícios
        </span>
        <nav className="flex gap-2">
          {(Object.keys(SEGMENTOS) as Segmento[]).map((s) => (
            <Link
              key={s}
              href={`/preview/${s}`}
              aria-current={s === atual ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs transition ${
                s === atual
                  ? "bg-[var(--color-palha)] text-[var(--color-on-palha)]"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {PAPEL[SEGMENTOS[s]]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
