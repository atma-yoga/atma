import { redirect } from "next/navigation";

import { PainelAdmin } from "@/components/paineis/painel-admin";
import type { EncontroNaGrade } from "@/components/paineis/grade-semanal";
import { Shell } from "@/components/shell";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Visão geral" };

export default async function AdminPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();
  const inicioDoMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );

  const [
    { count: alunosAtivos },
    { data: emTurma },
    { data: vencidos },
    { data: recebido },
    { data: grade },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("profile_id", { count: "exact", head: true })
      .eq("is_active", true),

    // Alunos distintos com matrícula ativa em alguma turma. A diferença para
    // "alunos ativos" mostra quem está cadastrado e fora de turma.
    supabase
      .from("class_enrollments")
      .select("student_id")
      .eq("is_active", true),

    supabase.from("payments").select("amount").eq("status", "overdue"),

    supabase
      .from("payments")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", inicioDoMes.toISOString()),

    // A semana vem da grade de turmas, não das aulas geradas: assim a tela
    // mostra algo útil desde o primeiro dia, sem depender de materialização.
    supabase
      .from("v_grade_semanal")
      .select("*")
      .eq("is_active", true)
      .order("start_time"),
  ]);

  const soma = (linhas: { amount: number }[] | null) =>
    (linhas ?? []).reduce((t, l) => t + Number(l.amount), 0);

  const semana: EncontroNaGrade[] = (grade ?? []).map((g) => ({
    meetingId: g.meeting_id ?? "",
    turmaId: g.class_id ?? "",
    turma: g.turma ?? "sem nome",
    weekday: g.weekday ?? 0,
    hora: String(g.start_time ?? "").slice(0, 5),
    duracao: g.duration_min ?? 60,
    capacidade: g.capacity ?? 0,
    matriculados: Number(g.matriculados ?? 0),
    sala: g.sala,
    aoArLivre: g.is_outdoor ?? false,
    cor: g.cor,
    professor: g.professor_chamado,
    ativa: g.is_active ?? true,
  }));

  return (
    <Shell papel="admin" nome={sessao.perfil?.full_name ?? ""}>
      <PainelAdmin
        alunosAtivos={alunosAtivos ?? 0}
        emTurma={new Set((emTurma ?? []).map((e) => e.student_id)).size}
        recebidoNoMes={soma(recebido)}
        totalEmAtraso={soma(vencidos)}
        cobrancasEmAtraso={vencidos?.length ?? 0}
        semana={semana}
      />
    </Shell>
  );
}
