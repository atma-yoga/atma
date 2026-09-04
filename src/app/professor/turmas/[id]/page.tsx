import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AbrirChamada } from "@/components/paineis/abrir-chamada";
import {
  AulasDaTurma,
  type AulaMarcada,
} from "@/components/paineis/aulas-da-turma";
import { DIAS_CURTOS } from "@/components/paineis/grade-semanal";
import {
  ListaDeChamada,
  type AlunoNaChamada,
} from "@/components/paineis/lista-de-chamada";
import { Shell } from "@/components/shell";
import { Etiqueta, TituloSecao, Vazio } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  abrirChamada,
  criarAulaExtra,
  limparPresenca,
  marcarPresenca,
  reativarAula,
  suspenderAula,
} from "../actions";

export const metadata = { title: "Chamada" };

const FUSO = "America/Sao_Paulo";

/** Hoje no fuso do estúdio — o servidor roda em UTC. */
function hojeNoEstudio(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const porExtenso = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: FUSO,
  }).format(new Date(`${iso}T12:00:00`));

export default async function ChamadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  const { id } = await params;
  const { dia: diaPedido } = await searchParams;

  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("teacher") && !sessao.papeis.includes("admin")) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: turma } = await supabase
    .from("classes")
    .select("*, rooms(name, is_outdoor), class_meetings(weekday, start_time)")
    .eq("id", id)
    .maybeSingle();

  if (!turma) notFound();

  const diasDaTurma = (turma.class_meetings ?? []).map((m) => m.weekday);
  const hoje = hojeNoEstudio();

  // Últimas datas em que esta turma teve aula, para escolher qual chamar.
  const ultimasDatas: string[] = [];
  for (let i = 0; i < 21 && ultimasDatas.length < 6; i++) {
    const d = new Date(`${hoje}T12:00:00`);
    d.setDate(d.getDate() - i);
    if (diasDaTurma.includes(d.getDay())) {
      ultimasDatas.push(
        new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(d),
      );
    }
  }

  const dia = diaPedido ?? ultimasDatas[0] ?? hoje;
  const temAulaNesseDia = diasDaTurma.includes(
    new Date(`${dia}T12:00:00`).getDay(),
  );

  // A aula daquele dia, se a chamada já foi aberta alguma vez.
  const inicioDoDia = `${dia}T00:00:00-03:00`;
  const fimDoDia = `${dia}T23:59:59-03:00`;

  // Lista, não maybeSingle: um dia pode ter mais de uma aula da mesma turma
  // (uma reposição extra, por exemplo), e maybeSingle devolve erro nesse caso
  // — a chamada sumia da tela sem dizer por quê.
  const { data: aulasDoDia } = await supabase
    .from("class_sessions")
    .select("id, starts_at")
    .eq("class_id", id)
    .gte("starts_at", inicioDoDia)
    .lte("starts_at", fimDoDia)
    .order("starts_at");

  const aula = aulasDoDia?.[0] ?? null;

  const { data: presencas } = aula
    ? await supabase
        .from("bookings")
        .select("id, status, student_id")
        .eq("session_id", aula.id)
    : { data: null };

  // Aulas já abertas desta turma, de hoje em diante.
  const { data: proximas } = await supabase
    .from("class_sessions")
    .select("id, starts_at, status, cancel_reason")
    .eq("class_id", id)
    .gte("starts_at", `${hoje}T00:00:00-03:00`)
    .order("starts_at")
    .limit(10);

  const horaDaGrade = String(
    turma.class_meetings?.[0]?.start_time ?? "07:00",
  ).slice(0, 5);

  const aulasMarcadas: AulaMarcada[] = (proximas ?? []).map((s) => {
    const dow = new Date(
      new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(
        new Date(s.starts_at),
      ) + "T12:00:00",
    ).getDay();

    return {
      id: s.id,
      inicio: s.starts_at,
      suspensa: s.status === "canceled",
      motivo: s.cancel_reason,
      foraDaGrade: !diasDaTurma.includes(dow),
    };
  });

  // Nome e ficha médica vêm da view reduzida: o professor não lê CPF,
  // endereço, e-mail nem telefone de ninguém.
  const { data: fichas } = await supabase
    .from("v_ficha_do_aluno")
    .select("*");

  const fichaPorAluno = new Map(
    (fichas ?? []).map((f) => [f.student_id, f]),
  );

  const [{ data: frequencia }, { data: mensal }] = await Promise.all([
    supabase.from("v_frequencia").select("*").eq("class_id", id),
    supabase
      .from("v_presenca_mensal")
      .select("*")
      .eq("mes", `${hoje.slice(0, 7)}-01`),
  ]);

  const mesPorAluno = new Map((mensal ?? []).map((m) => [m.student_id, m]));

  const freqPorAluno = new Map(
    (frequencia ?? []).map((f) => [f.student_id, f]),
  );

  const lista: AlunoNaChamada[] = (presencas ?? [])
    .map((b) => {
      const f = freqPorAluno.get(b.student_id);
      const ficha = fichaPorAluno.get(b.student_id);
      const presencas = Number(f?.presencas ?? 0);
      const faltas = Number(f?.faltas ?? 0);

      return {
        id: b.id,
        nome: ficha?.nome ?? "sem nome",
        status: b.status,
        frequencia: f?.percentual ?? null,
        presencas,
        totalRegistrado: Number(f?.aulas_com_registro ?? 0),
        condicoes: ficha?.health_conditions ?? [],
        observacoes: ficha?.health_notes ?? null,
        // Sem contato, endereço ou financeiro: o professor não os recebe.
        ficha: {
          presencasNoMes: Number(mesPorAluno.get(b.student_id)?.presencas ?? 0),
          faltasNoMes: Number(mesPorAluno.get(b.student_id)?.faltas ?? 0),
          id: b.student_id,
          nome: ficha?.nome ?? "sem nome",
          nomeCompleto: ficha?.nome_completo ?? "",
          condicoes: ficha?.health_conditions ?? [],
          observacoes: ficha?.health_notes ?? null,
          presencas,
          faltas,
        },
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const presentes = lista.filter((a) => a.status === "attended").length;
  const faltas = lista.filter((a) => a.status === "no_show").length;
  const semMarcar = lista.filter((a) => a.status === "booked").length;

  return (
    <Shell
      papel={sessao.papeis.includes("teacher") ? "teacher" : "admin"}
      nome={sessao.perfil?.full_name ?? ""}
    >
      <Link
        href="/professor/turmas"
        className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
      >
        ← minhas turmas
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-light">{turma.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {diasDaTurma
            .slice()
            .sort()
            .map((d) => DIAS_CURTOS[d])
            .join(", ")}{" "}
          · {String(turma.class_meetings?.[0]?.start_time ?? "").slice(0, 5)} ·{" "}
          {turma.rooms?.name ?? "sem local"}
        </p>
      </div>

      {/* Escolha do dia */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ultimasDatas.map((d) => {
          const ehHoje = d === hoje;
          const atual = d === dia;
          return (
            <Link
              key={d}
              href={`/professor/turmas/${id}?dia=${d}`}
              className={`rounded-[var(--radius-md)] px-3 py-2 text-xs transition ${
                atual
                  ? "bg-[var(--color-palha)] font-medium text-[var(--color-on-palha)]"
                  : "border border-[var(--color-border-strong)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {ehHoje ? "hoje" : ""} {new Date(`${d}T12:00:00`).getDate()}/
              {new Date(`${d}T12:00:00`).getMonth() + 1}
            </Link>
          );
        })}
      </div>

      <TituloSecao
        acao={
          lista.length ? (
            <span className="flex gap-2">
              <Etiqueta
                fundo="var(--color-verde)"
                letra="var(--color-on-verde)"
              >
                {presentes} presentes
              </Etiqueta>
              {faltas ? (
                <Etiqueta fundo="var(--color-mel)" letra="var(--color-on-mel)">
                  {faltas} faltas
                </Etiqueta>
              ) : null}
              {semMarcar ? (
                <Etiqueta>{semMarcar} sem marcar</Etiqueta>
              ) : null}
            </span>
          ) : null
        }
      >
        Chamada de {porExtenso(dia)}
      </TituloSecao>

      {!temAulaNesseDia ? (
        <Vazio>Esta turma não tem aula neste dia da semana.</Vazio>
      ) : !aula || !lista.length ? (
        <AbrirChamada turmaId={id} dia={dia} acao={abrirChamada} />
      ) : (
        <ListaDeChamada
          alunos={lista}
          turmaId={id}
          marcar={marcarPresenca}
          limpar={limparPresenca}
        />
      )}

      <AulasDaTurma
        turmaId={id}
        aulas={aulasMarcadas}
        horaPadrao={horaDaGrade}
        suspender={suspenderAula}
        reativar={reativarAula}
        criarExtra={criarAulaExtra}
      />

    </Shell>
  );
}
