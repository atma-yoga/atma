import { redirect } from "next/navigation";

import type { ProximaAula } from "@/components/paineis/aviso-de-aula";
import type {
  AulaDoMes,
  MesDoAno,
} from "@/components/paineis/graficos-frequencia";
import {
  PainelAluno,
  type AulaListada,
} from "@/components/paineis/painel-aluno";
import { Shell } from "@/components/shell";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Início" };

const FUSO = "America/Sao_Paulo";

/** Data no fuso do estúdio, como YYYY-MM-DD. */
const emSaoPaulo = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(d);

export default async function AlunoPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  const supabase = await createClient();

  const agora = new Date();
  const hoje = emSaoPaulo(agora);
  const ano = Number(hoje.slice(0, 4));
  const mesAtual = hoje.slice(0, 7);
  const inicioDoDia = `${hoje}T00:00:00-03:00`;

  const [{ data: aulas }, { data: mensal }, { data: matriculas }] =
    await Promise.all([
      supabase
        .from("v_aulas_do_aluno")
        .select("*")
        .eq("student_id", sessao.userId)
        .order("starts_at"),

      supabase
        .from("v_frequencia_mensal")
        .select("*")
        .eq("student_id", sessao.userId),

      supabase
        .from("class_enrollments")
        .select("enrolled_at, classes(name)")
        .eq("student_id", sessao.userId)
        .eq("is_active", true)
        .order("enrolled_at"),
    ]);

  const todas = aulas ?? [];

  // A próxima aula é a primeira que ainda não começou. Uma aula suspensa
  // continua aparecendo: o aluno precisa saber justamente que não vai ter.
  const proximaLinha = todas.find(
    (a) => (a.starts_at ?? "") >= inicioDoDia,
  );

  const proxima: ProximaAula | null = proximaLinha
    ? {
        id: proximaLinha.session_id ?? "",
        inicio: proximaLinha.starts_at ?? agora.toISOString(),
        turma: proximaLinha.turma ?? "Yoga",
        professor: proximaLinha.professor,
        sala: proximaLinha.sala,
        cor: proximaLinha.cor,
        aoArLivre: proximaLinha.is_outdoor ?? false,
        suspensa: proximaLinha.status_aula === "canceled",
        motivo: proximaLinha.cancel_reason,
      }
    : null;

  const aulasDoMes: AulaDoMes[] = todas
    .filter((a) => emSaoPaulo(new Date(a.starts_at ?? "")).startsWith(mesAtual))
    .map((a) => {
      const data = emSaoPaulo(new Date(a.starts_at ?? ""));
      const estado: AulaDoMes["estado"] =
        a.status_aula === "canceled"
          ? "suspensa"
          : a.presenca === "attended"
            ? "presente"
            : a.presenca === "no_show"
              ? "falta"
              : "futura";
      return { data, estado };
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  const mesesDoAno: MesDoAno[] = (mensal ?? [])
    .filter((m) => (m.mes ?? "").startsWith(String(ano)))
    .map((m) => ({
      mes: Number((m.mes ?? "").slice(5, 7)) - 1,
      presencas: Number(m.presencas ?? 0),
      faltas: Number(m.faltas ?? 0),
    }));

  const presencasTotais = (mensal ?? []).reduce(
    (s, m) => s + Number(m.presencas ?? 0),
    0,
  );
  const faltasTotais = (mensal ?? []).reduce(
    (s, m) => s + Number(m.faltas ?? 0),
    0,
  );

  const proximasAulas: AulaListada[] = todas
    .filter((a) => (a.starts_at ?? "") >= inicioDoDia)
    .slice(0, 5)
    .map((a) => ({
      id: a.booking_id ?? a.session_id ?? "",
      inicio: a.starts_at ?? agora.toISOString(),
      turma: a.turma ?? "Yoga",
      professor: a.professor,
      sala: a.sala,
      cor: a.cor,
      suspensa: a.status_aula === "canceled",
    }));

  const desde = matriculas?.[0]?.enrolled_at
    ? emSaoPaulo(new Date(matriculas[0].enrolled_at))
    : null;

  return (
    <Shell papel="student" nome={sessao.perfil?.full_name ?? ""}>
      <PainelAluno
        nome={sessao.perfil?.social_name || sessao.perfil?.full_name || ""}
        hoje={hoje}
        proxima={proxima}
        aulasDoMes={aulasDoMes}
        mesesDoAno={mesesDoAno}
        ano={ano}
        presencasTotais={presencasTotais}
        faltasTotais={faltasTotais}
        desde={desde}
        proximasAulas={proximasAulas}
        turmas={(matriculas ?? [])
          .map((m) => m.classes?.name)
          .filter((n): n is string => Boolean(n))}
      />
    </Shell>
  );
}
