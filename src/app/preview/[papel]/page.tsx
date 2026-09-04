import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularioPessoa } from "@/components/paineis/formulario-pessoa";
import { FormularioLocal } from "@/components/paineis/formulario-local";
import { FormularioTurma } from "@/components/paineis/formulario-turma";
import {
  CartaoDaTurma,
  DIAS_CURTOS,
  GradeSemanal,
} from "@/components/paineis/grade-semanal";
import { ListaDeCobrancas } from "@/components/paineis/cobrancas";
import { estaVencida } from "@/lib/cobranca";
import {
  Composicao,
  FluxoDeCaixa,
  PresencaPorAluno,
} from "@/components/paineis/graficos-relatorio";
import { ListaDeChamada } from "@/components/paineis/lista-de-chamada";
import { ListaDePessoas } from "@/components/paineis/lista-de-pessoas";
import { PainelAdmin } from "@/components/paineis/painel-admin";
import { PainelAluno } from "@/components/paineis/painel-aluno";
import { PainelProfessor } from "@/components/paineis/painel-professor";
import { Shell } from "@/components/shell";
import { Cartao, Etiqueta, Numero, TituloSecao, brl } from "@/components/ui";
import { corDoLocal } from "@/lib/ficha";
import type { Papel } from "@/lib/tipos";
import {
  AGENDA_DO_ESTUDIO,
  AULAS_DO_MES,
  HOJE_SP,
  MESES_DO_ANO,
  PROXIMAS_DO_ALUNO,
  MENSALIDADES_DO_ALUNO,
  PROXIMA_AULA,
  AULAS_DA_SEMANA,
  AULAS_DE_HOJE,
  CHAMADA,
  COBRANCAS,
  HOJE_ISO,
  BAIRROS,
  CAIXA,
  FAIXAS_ETARIAS,
  GENEROS_RELATORIO,
  LOCAIS,
  PRESENCA_ALUNOS,
  ENCONTROS,
  NUMEROS_DO_ADMIN,
  PESSOAS,
  PROFESSORES_OPCOES,
  SALAS,
  TURMAS,
} from "../dados";

export const dynamic = "force-dynamic";

const TELAS = {
  aluno: { papel: "student", rotulo: "Aluno", nome: "Helena Costa" },
  professor: { papel: "teacher", rotulo: "Professor", nome: "Marina Vieira" },
  admin: { papel: "admin", rotulo: "Administração", nome: "Ana Prado" },
  pessoas: { papel: "admin", rotulo: "Cadastro", nome: "Ana Prado" },
  grade: { papel: "admin", rotulo: "Grade semanal", nome: "Ana Prado" },
  chamada: { papel: "teacher", rotulo: "Chamada", nome: "Marina Vieira" },
  "turmas-prof": { papel: "teacher", rotulo: "Turmas (prof)", nome: "Marina Vieira" },
  financeiro: { papel: "admin", rotulo: "Financeiro", nome: "Ana Prado" },
  locais: { papel: "admin", rotulo: "Locais", nome: "Ana Prado" },
  relatorios: { papel: "admin", rotulo: "Relatórios", nome: "Ana Prado" },
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
            hoje={HOJE_SP}
            proxima={PROXIMA_AULA}
            aulasDoMes={AULAS_DO_MES}
            mesesDoAno={MESES_DO_ANO}
            ano={Number(HOJE_SP.slice(0, 4))}
            presencasTotais={62}
            faltasTotais={10}
            desde="2026-01-08"
            proximasAulas={PROXIMAS_DO_ALUNO}
            turmas={["Noite 19:00"]}
            mensalidades={MENSALIDADES_DO_ALUNO}
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
        ) : tela === "financeiro" ? (
          <TelaDoFinanceiro />
        ) : tela === "locais" ? (
          <TelaDeLocais />
        ) : tela === "relatorios" ? (
          <TelaDeRelatorios />
        ) : (
          <TelaDeTurmasDoProfessor />
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
            resetar={() => {}}
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

function TelaDeRelatorios() {
  const ano = new Date().getFullYear();

  return (
    <>
      <h1 className="mb-2 text-2xl font-light">Relatórios</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Como o estúdio anda em {ano}.
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo={`Recebido em ${ano}`} valor={brl(18420)} />
        <Numero rotulo="Em aberto" valor={brl(1265)} />
        <Numero rotulo="Presença média" valor="82%" detalhe="15 alunos com chamada" />
        <Numero rotulo="Alunos ativos" valor={15} />
      </div>

      <section className="mb-12">
        <TituloSecao>Dinheiro</TituloSecao>
        <FluxoDeCaixa meses={CAIXA} />
      </section>

      <section className="mb-12">
        <TituloSecao>Presença</TituloSecao>
        <PresencaPorAluno alunos={PRESENCA_ALUNOS} />
      </section>

      <section>
        <TituloSecao>Quem frequenta o estúdio</TituloSecao>
        <div className="grid gap-4 lg:grid-cols-3">
          <Composicao titulo="Bairro" fatias={BAIRROS} />
          <Composicao titulo="Faixa etária" fatias={FAIXAS_ETARIAS} />
          <Composicao titulo="Gênero" fatias={GENEROS_RELATORIO} />
        </div>
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Estes três são contagens do grupo, sem nome de ninguém. Gênero é
          sempre opcional no cadastro.
        </p>
      </section>
    </>
  );
}

function TelaDeLocais() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-light">Locais</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Onde as aulas acontecem. A cor de cada local marca as aulas na agenda.
      </p>

      <div className="grid gap-10 xl:grid-cols-[1fr_26rem] xl:items-start">
        <section>
          <TituloSecao>Cadastrados</TituloSecao>
          <div className="flex flex-col gap-2">
            {LOCAIS.map((l) => (
              <Cartao
                key={l.nome}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
                style={{ borderLeft: `3px solid ${corDoLocal(l.cor)}` }}
              >
                <span className="min-w-40 flex-1">
                  <span className="block text-sm">{l.nome}</span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {l.endereco}
                  </span>
                </span>
                <Etiqueta
                  fundo={l.arLivre ? "var(--color-azul)" : "var(--color-palha)"}
                  letra={
                    l.arLivre ? "var(--color-on-azul)" : "var(--color-on-palha)"
                  }
                >
                  {l.arLivre ? "ar livre" : "interno"}
                </Etiqueta>
                <span className="text-xs text-[var(--color-muted)]">
                  {l.lugares} lugares
                </span>
              </Cartao>
            ))}
          </div>
        </section>

        <div className="xl:sticky xl:top-6">
          <TituloSecao>Novo local</TituloSecao>
          <FormularioLocal demo />
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
  // Calculado como na tela real, senão a maquete mente sobre o próprio número.
  const emAtraso = COBRANCAS.filter((c) => estaVencida(c, HOJE_ISO)).reduce(
    (s, c) => s + c.valor,
    0,
  );
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
        <Numero rotulo="A vencer" valor={brl(total - recebido - emAtraso)} />
        <Numero rotulo="Em atraso" valor={brl(emAtraso)} />
      </div>

      <ListaDeCobrancas cobrancas={COBRANCAS} hoje={HOJE_ISO} demo />
    </>
  );
}

function TelaDeTurmasDoProfessor() {
  const minhas = TURMAS.slice(0, 3);

  return (
    <>
      <h1 className="mb-2 text-2xl font-light">Minhas turmas</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        Abra uma turma para fazer a chamada e ver a frequência.
      </p>

      <TituloSecao>Turmas</TituloSecao>
      <div className="flex flex-col gap-2">
        {minhas.map((t) => (
          <Cartao
            key={t.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
            style={{ borderLeft: `3px solid ${corDoLocal(t.cor)}` }}
          >
            <span className="min-w-40 flex-1">
              <span className="block text-sm">{t.nome}</span>
              <span className="block text-xs text-[var(--color-muted)]">
                {t.dias.map((d) => DIAS_CURTOS[d]).join(", ")} · {t.hora} ·{" "}
                {t.sala}
              </span>
            </span>
            <Etiqueta>
              {t.matriculados}/{t.capacidade}
            </Etiqueta>
          </Cartao>
        ))}
      </div>
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
        <span className="text-xs uppercase tracking-[0.11em] opacity-75">
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
