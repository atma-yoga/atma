import { redirect } from "next/navigation";

import type { QuemDeve, QuemFaltou } from "@/components/paineis/alertas";
import { PainelAdmin } from "@/components/paineis/painel-admin";
import type { EncontroNaGrade } from "@/components/paineis/grade-semanal";
import { Shell } from "@/components/shell";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Visão geral" };

const FUSO = "America/Sao_Paulo";

/** Hoje no fuso do estúdio — o servidor roda em UTC. */
const hojeNoEstudio = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());

export default async function AdminPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");
  if (!sessao.papeis.includes("admin")) redirect("/");

  const supabase = await createClient();
  const hoje = hojeNoEstudio();

  // Sete dias para trás, não "a semana corrente": na segunda de manhã a
  // semana corrente está vazia, e quem faltou na sexta sumiria da lista bem
  // no dia em que a adm teria tempo de ligar.
  const seteDiasAtras = new Date(Date.now() - 7 * 864e5).toISOString();

  const [{ count: alunosAtivos }, { data: faltas }, { data: cobrancas }, { data: grade }] =
    await Promise.all([
      supabase
        .from("students")
        .select("profile_id", { count: "exact", head: true })
        .eq("is_active", true),

      // `situacao` já exclui a falta reposta: quem repôs fez a aula, e não
      // deve aparecer numa lista de "preciso falar com essa pessoa".
      supabase
        .from("v_aulas_do_aluno")
        .select("student_id, turma, starts_at, situacao")
        .eq("situacao", "falta")
        .gte("starts_at", seteDiasAtras)
        .order("starts_at", { ascending: false }),

      // Vencida é quem não pagou e passou do dia — calculado aqui, como no
      // Financeiro. O status gravado nunca vira "overdue": isso dependia de
      // uma rotina diária que o estúdio não roda, e por isso este quadro
      // mostrava R$ 0,00 mesmo com gente devendo.
      supabase
        .from("v_mensalidades")
        .select("student_id, aluno, phone, turma, amount, due_date, reference_month, status")
        .neq("status", "paid")
        .lt("due_date", hoje)
        .order("due_date"),

      // A semana vem da grade de turmas, não das aulas geradas: assim a tela
      // mostra algo útil desde o primeiro dia, sem depender de materialização.
      supabase
        .from("v_grade_semanal")
        .select("*")
        .eq("is_active", true)
        .order("start_time"),
    ]);

  // Os nomes e telefones de quem faltou. A view de aulas não os traz, e sem
  // nome a lista não serve para nada.
  const idsQueFaltaram = [
    ...new Set((faltas ?? []).map((f) => f.student_id).filter(Boolean)),
  ] as string[];

  const { data: pessoas } = idsQueFaltaram.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, social_name, phone")
        .in("id", idsQueFaltaram)
    : { data: null };

  const pessoaPorId = new Map((pessoas ?? []).map((p) => [p.id, p]));

  const faltaram: QuemFaltou[] = (faltas ?? [])
    .filter((f) => f.student_id && f.starts_at)
    .map((f) => {
      const p = pessoaPorId.get(f.student_id as string);
      return {
        alunoId: f.student_id as string,
        nome: p?.social_name ?? p?.full_name ?? "sem nome",
        telefone: p?.phone ?? null,
        turma: f.turma,
        quando: f.starts_at as string,
      };
    });

  const devendo: QuemDeve[] = (cobrancas ?? [])
    .filter((c) => c.student_id && c.due_date)
    .map((c) => ({
      alunoId: c.student_id as string,
      nome: c.aluno ?? "sem nome",
      telefone: c.phone,
      turma: c.turma,
      valor: Number(c.amount ?? 0),
      vencimento: c.due_date as string,
      mesReferencia: c.reference_month ?? (c.due_date as string),
    }));

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
        faltaram={faltaram}
        devendo={devendo}
        semana={semana}
      />
    </Shell>
  );
}
