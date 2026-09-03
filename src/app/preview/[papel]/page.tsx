import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioPessoa } from "@/components/paineis/formulario-pessoa";
import { FormularioTurma } from "@/components/paineis/formulario-turma";
import {
  CartaoDaTurma,
  GradeSemanal,
} from "@/components/paineis/grade-semanal";
import { ListaDeCobrancas } from "@/components/paineis/cobrancas";
import { ListaDeChamada } from "@/components/paineis/lista-de-chamada";
import { ListaDePessoas } from "@/components/paineis/lista-de-pessoas";
import { PainelAdmin } from "@/components/paineis/painel-admin";
import { PainelAluno } from "@/components/paineis/painel-aluno";
import { PainelProfessor } from "@/components/paineis/painel-professor";
import { Shell } from "@/components/shell";
import { Etiqueta, Numero, TituloSecao, brl } from "@/components/ui";
import type { Papel } from "@/lib/tipos";
import {
  AGENDA_DO_ESTUDIO,
  AGENDAMENTOS_DO_ALUNO,
  AULAS_DA_SEMANA,
  AULAS_DE_HOJE,
  CHAMADA,
  COBRANCAS,
  HOJE_ISO,
  ENCONTROS,
  NUMEROS_DO_ADMIN,
  PESSOAS,
  PROFESSORES_OPCOES,
  SALAS,
  TURMAS,
  RESUMO_DO_ALUNO,
  VAGAS_ABERTAS,
} from "../dados";

export const dynamic = "force-dynamic";

const TELAS = {
  aluno: { papel: "student", rotulo: "Aluno", nome: "Helena Costa" },
  professor: { papel: "teacher", rotulo: "Professor", nome: "Marina Vieira" },
  admin: { papel: "admin", rotulo: "Administração", nome: "Ana Prado" },
  pessoas: { papel: "admin", rotulo: "Cadastro", nome: "Ana Prado" },
  grade: { papel: "admin", rotulo: "Grade semanal", nome: "Ana Prado" },
  chamada: { papel: "teacher", rotulo: "Chamada", nome: "Marina Vieira" },
  financeiro: { papel: "admin", rotulo: "Financeiro", nome: "Ana Prado" },
} as const satisfies Record<
  string,
  { papel: Papel; rotulo: string; nome: string }
>;

type Tela = keyof typeof TELAS;

export function generateStaticParams() {
  return Object.keys(TELAS).map((papel) => ({ papel }));
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ papel: string }>;
}) {
  const { papel } = await params;
  if (!(papel in TELAS)) notFound();

  const tela = papel as Tela;
  const { nome, papel: papelDoShell } = TELAS[tela];

  return (
    <>
      <FaixaDePreview atual={tela} />
      <Shell papel={papelDoShell} nome={nome}>
        {tela === "aluno" ? (
          <PainelAluno
            nome={nome}
            resumo={RESUMO_DO_ALUNO}
            proximas={AGENDAMENTOS_DO_ALUNO}
            disponiveis={VAGAS_ABERTAS}
          />
        ) : tela === "professor" ? (
          <PainelProfessor
            nome={nome}
            hoje={AULAS_DE_HOJE}
            semana={AULAS_DA_SEMANA}
          />
        ) : tela === "admin" ? (
          <PainelAdmin {...NUMEROS_DO_ADMIN} semana={ENCONTROS} />
        ) : tela === "pessoas" ? (
          <TelaDePessoas />
        ) : tela === "grade" ? (
          <TelaDaGrade />
        ) : tela === "chamada" ? (
          <TelaDaChamada />
        ) : (
          <TelaDoFinanceiro />
        )}
      </Shell>
    </>
  );
}

function TelaDePessoas() {
  return (
    <>
      <h1 className="mb-8 text-2xl font-light">Pessoas</h1>
      <div className="grid gap-10 xl:grid-cols-[1fr_30rem] xl:items-start">
        <div>
          <ListaDePessoas
            titulo="Professores"
            pessoas={PESSOAS.professores}
            vazio="Nenhum professor cadastrado ainda."
          />
          <ListaDePessoas
            titulo="Alunos"
            pessoas={PESSOAS.alunos.map((a) => ({ ...a, detalhe: a.plano }))}
            vazio="Nenhum aluno cadastrado ainda."
          />
        </div>
        <div className="xl:sticky xl:top-6">
          <TituloSecao>Cadastrar</TituloSecao>
          <FormularioPessoa demo />
        </div>
      </div>
    </>
  );
}

function TelaDaGrade() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-light">Grade de aula semanal</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Cada turma tem professor, dias fixos e alunos matriculados.
        </p>
      </div>

      <section className="mb-12">
        <TituloSecao>A semana</TituloSecao>
        <GradeSemanal encontros={ENCONTROS} clicavel={false} />
      </section>

      <div className="grid gap-10 xl:grid-cols-[1fr_24rem] xl:items-start">
        <section>
          <TituloSecao>Turmas</TituloSecao>
          <div className="flex flex-col gap-2">
            {TURMAS.map((t) => (
              <CartaoDaTurma key={t.id} {...t} clicavel={false} />
            ))}
          </div>
        </section>

        <div className="xl:sticky xl:top-6">
          <TituloSecao>Nova turma</TituloSecao>
          <FormularioTurma
            salas={SALAS}
            professores={PROFESSORES_OPCOES}
            demo
          />
        </div>
      </div>
    </>
  );
}

function TelaDoFinanceiro() {
  const total = COBRANCAS.reduce((s, c) => s + c.valor, 0);
  const recebido = COBRANCAS.filter((c) => c.status === "paid").reduce(
    (s, c) => s + c.valor,
    0,
  );
  const mes = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-light">Financeiro</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Mensalidades das turmas, com vencimento no dia 5.
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Previsto" valor={brl(total)} detalhe={`${COBRANCAS.length} cobranças`} />
        <Numero rotulo="Recebido" valor={brl(recebido)} />
        <Numero rotulo="A vencer" valor={brl(total - recebido)} />
        <Numero rotulo="Em atraso" valor={brl(0)} />
      </div>

      <TituloSecao>Cobranças de {mes}</TituloSecao>
      <ListaDeCobrancas cobrancas={COBRANCAS} hoje={HOJE_ISO} demo />
    </>
  );
}

function TelaDaChamada() {
  const presentes = CHAMADA.filter((a) => a.status === "attended").length;
  const faltas = CHAMADA.filter((a) => a.status === "no_show").length;
  const semMarcar = CHAMADA.filter((a) => a.status === "booked").length;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-light">Manhã 07:00</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          seg, qua, sex · 07:00 · Estúdio
        </p>
      </div>

      <TituloSecao
        acao={
          <span className="flex gap-2">
            <Etiqueta fundo="var(--color-verde)" letra="var(--color-on-verde)">
              {presentes} presentes
            </Etiqueta>
            <Etiqueta fundo="var(--color-mel)" letra="var(--color-on-mel)">
              {faltas} faltas
            </Etiqueta>
            <Etiqueta>{semMarcar} sem marcar</Etiqueta>
          </span>
        }
      >
        Chamada de hoje
      </TituloSecao>

      <ListaDeChamada alunos={CHAMADA} turmaId="c1" demo />
    </>
  );
}

/** Deixa explícito que a tela é maquete, e permite pular entre as visões. */
function FaixaDePreview({ atual }: { atual: Tela }) {
  return (
    <div className="bg-[var(--color-marrom)] px-6 py-2.5 text-[var(--color-on-marrom)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.16em] opacity-75">
          Maquete · dados fictícios
        </span>
        <nav className="flex gap-2">
          {(Object.keys(TELAS) as Tela[]).map((t) => (
            <Link
              key={t}
              href={`/preview/${t}`}
              aria-current={t === atual ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs transition ${
                t === atual
                  ? "bg-[var(--color-palha)] text-[var(--color-on-palha)]"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {TELAS[t].rotulo}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
